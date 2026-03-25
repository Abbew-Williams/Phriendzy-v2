'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FullScreenPost } from '@/components/full-screen-post';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, limit, orderBy, query, doc, getDoc, onSnapshot, where } from 'firebase/firestore';
import type { Post, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { posts as mockPosts } from '@/lib/data';

export default function HomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      // Firebase not ready, show mock posts for now
      setPosts(mockPosts);
      setLoading(false);
      return;
    };
    setLoading(true);

    const postsQuery = query(collection(firestore, 'posts'), where('privacy', '==', 'public'), orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(postsQuery, async (querySnapshot) => {
      
      const postsData = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
        const postData = postDoc.data();
        if (!postData.authorId) return null;

        const authorRef = doc(firestore, 'users', postData.authorId);
        const authorSnap = await getDoc(authorRef);
        const author = authorSnap.exists() ? { id: authorSnap.id, ...authorSnap.data() } as User : null;

        if (!author) return null;

        return { ...postData, id: postDoc.id, author } as Post;
      }));
      
      const finalPosts = postsData.filter(p => p) as Post[];

      if (finalPosts.length > 0) {
        setPosts(finalPosts);
      } else {
        // If there are no real posts, fall back to mock data
        setPosts(mockPosts);
      }

      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts: ", error);
      toast({ title: 'Error', description: 'Could not fetch live posts. Showing sample content.', variant: 'destructive' });
      setPosts(mockPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);

  const handleInteraction = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Login or create an account to interact with posts.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || posts.length === 0) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoElement = (entry.target as HTMLElement).querySelector('video');
          if (entry.isIntersecting) {
            videoElement?.play().catch(() => {});
          } else {
            videoElement?.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    const postElements = document.querySelectorAll('[data-post-id]');
    const currentObserver = observer.current;
    postElements.forEach((el) => currentObserver.observe(el));

    return () => {
      postElements.forEach((el) => {
        if (currentObserver) {
          currentObserver.unobserve(el);
        }
      });
    };
  }, [posts]);

  if (loading) {
    return (
       <div className="w-full h-screen snap-y snap-mandatory overflow-y-auto overflow-x-hidden md:h-full md:mx-auto md:max-w-md md:border-x no-scrollbar">
        {[...Array(3)].map((_, i) => (
           <div key={i} className="h-full w-full snap-start flex items-center justify-center relative bg-black">
              <Skeleton className="w-full h-full" />
           </div>
        ))}
       </div>
    )
  }

  return (
    <div className="w-full h-screen snap-y snap-mandatory overflow-y-auto overflow-x-hidden md:h-full md:mx-auto md:max-w-md md:border-x no-scrollbar">
      {posts.map((post) => (
        <div
          key={post.id}
          data-post-id={post.id}
          className="h-full w-full snap-start flex items-center justify-center relative bg-black"
        >
          <FullScreenPost post={post} onInteraction={handleInteraction} />
        </div>
      ))}
       {posts.length === 0 && !loading && (
        <div className="h-full w-full snap-start flex items-center justify-center relative text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome to Phriendzy!</h2>
            <p className="text-muted-foreground mt-2">Engaging posts from the community will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
