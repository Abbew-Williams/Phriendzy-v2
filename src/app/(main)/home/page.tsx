'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FullScreenPost } from '@/components/full-screen-post';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, limit, orderBy, query, doc, getDoc } from 'firebase/firestore';
import type { Post, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!firestore) return;
      setLoading(true);
      try {
        const postsQuery = query(collection(firestore, 'posts'), orderBy('likesCount', 'desc'), orderBy('createdAt', 'desc'), limit(20));
        const querySnapshot = await getDocs(postsQuery);
        
        const postsData = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
          const postData = postDoc.data();
          const authorRef = doc(firestore, 'users', postData.authorId);
          const authorSnap = await getDoc(authorRef);
          const author = authorSnap.exists() ? { id: authorSnap.id, ...authorSnap.data() } as User : null;

          return {
            ...postData,
            id: postDoc.id,
            author,
          } as Post;
        }));

        setPosts(postsData.filter(p => p.author)); // Filter out posts where author couldn't be fetched
      } catch (error) {
        console.error("Error fetching posts: ", error);
        toast({ title: 'Error', description: 'Could not fetch posts. This might be due to a missing database index.', variant: 'destructive' });
      }
      setLoading(false);
    };

    fetchPosts();
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
