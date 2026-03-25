'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FullScreenPost } from '@/components/full-screen-post';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, limit, orderBy, query, doc, getDoc, onSnapshot, where } from 'firebase/firestore';
import type { Post, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      // Firebase not ready
      setLoading(false);
      return;
    };
    setLoading(true);

    // Fetch the 50 most recent posts. We will sort and filter on the client to avoid
    // complex index requirements that can fail if the index is not yet deployed.
    const postsQuery = query(
      collection(firestore, 'posts'), 
      limit(50)
    );

    const unsubscribe = onSnapshot(postsQuery, async (querySnapshot) => {
      
      const postsData = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
        const postData = postDoc.data();
        if (!postData.authorId) return null;

        const authorRef = doc(firestore, 'users', postData.authorId);
        const authorSnap = await getDoc(authorRef);
        
        let author: User;
        if (authorSnap.exists()) {
          author = { id: authorSnap.id, uid: authorSnap.id, ...authorSnap.data() } as User;
        } else {
          // If author data is missing, create a fallback user to prevent the post from disappearing.
          author = {
            id: postData.authorId,
            uid: postData.authorId,
            username: 'unknown_user',
            avatarUrl: `https://picsum.photos/seed/${postData.authorId}/100/100`,
            bio: '',
            followersCount: 0,
            followingCount: 0,
          };
        }

        return { ...postData, id: postDoc.id, author } as Post;
      }));
      
      let allRecentPosts = postsData.filter(Boolean) as Post[];

      // Manually sort by date as it's no longer in the query
      allRecentPosts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA; // Newest first
      });
      
      // Filter for public posts on the client and take the first 20.
      const publicPosts = allRecentPosts.filter(p => p.privacy === 'public').slice(0, 20);

      setPosts(publicPosts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts: ", error);
      toast({ title: 'Error', description: 'Could not fetch posts from the database.', variant: 'destructive' });
      setPosts([]);
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
            <p className="text-muted-foreground mt-2">No public posts were found. Create one to get started!</p>
          </div>
        </div>
      )}
    </div>
  );
}
