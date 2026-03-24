'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FullScreenPost } from '@/components/full-screen-post';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, limit, orderBy, query, doc, getDoc, where } from 'firebase/firestore';
import type { Post, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { aiPoweredDiscoveryFeed } from '@/ai/flows/ai-powered-discovery-feed';

export default function HomePage() {
  const { user, appUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!firestore) return;
      setLoading(true);

      try {
        let finalPosts: Post[] = [];

        if (appUser) {
          // --- AI-Powered Feed for Logged-In Users ---
          const [likesSnap, followsSnap] = await Promise.all([
            getDocs(query(collection(firestore, 'users', appUser.uid, 'likes'), limit(50))),
            getDocs(query(collection(firestore, 'users', appUser.uid, 'following'), limit(100)))
          ]);
          
          const likedPostIds = likesSnap.docs.map(doc => doc.id);
          const followedUserIds = followsSnap.docs.map(doc => doc.id);

          const recommendations = await aiPoweredDiscoveryFeed({
            userId: appUser.uid,
            userLikedPosts: likedPostIds,
            userCommentedPosts: [], // Not tracking for this MVP
            userWatchedVideos: [], // Not tracking for this MVP
            userFollowedAccounts: followedUserIds,
            currentTimestamp: new Date().toISOString(),
            limit: 20
          });

          const recommendedIds = recommendations.recommendedPostIds;

          if (recommendedIds && recommendedIds.length > 0) {
            // Firestore 'in' queries are limited to 30 items. We will use 10 per chunk.
            const postPromises = [];
            for (let i = 0; i < recommendedIds.length; i += 10) {
                 const chunk = recommendedIds.slice(i, i + 10);
                 if (chunk.length > 0) {
                    const q = query(collection(firestore, 'posts'), where('__name__', 'in', chunk));
                    postPromises.push(getDocs(q));
                 }
            }
            const postSnapshots = await Promise.all(postPromises);
            const recommendedPostsData = postSnapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post)));
            
             const postsWithAuthors = await Promise.all(recommendedPostsData.map(async (post) => {
                if (!post.authorId) return null;
                const authorRef = doc(firestore, 'users', post.authorId);
                const authorSnap = await getDoc(authorRef);
                const author = authorSnap.exists() ? { id: authorSnap.id, ...authorSnap.data() } as User : null;
                return { ...post, author };
            }));

            finalPosts = postsWithAuthors.filter(p => p && p.author) as Post[];
          }
        } 
        
        if (finalPosts.length === 0) {
          // --- Fallback/Unauthenticated User Feed: Most popular ---
          const postsQuery = query(collection(firestore, 'posts'), orderBy('likesCount', 'desc'), orderBy('createdAt', 'desc'), limit(20));
          const querySnapshot = await getDocs(postsQuery);
          
          const postsData = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
            const postData = postDoc.data();
            const authorRef = doc(firestore, 'users', postData.authorId);
            const authorSnap = await getDoc(authorRef);
            const author = authorSnap.exists() ? { id: authorSnap.id, ...authorSnap.data() } as User : null;

            return { ...postData, id: postDoc.id, author } as Post;
          }));

          finalPosts = postsData.filter(p => p.author) as Post[];
        }

        setPosts(finalPosts);

      } catch (error) {
        console.error("Error fetching posts: ", error);
        toast({ title: 'Error', description: 'Could not fetch posts. This might be due to a missing database index.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [firestore, appUser, toast]);

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
