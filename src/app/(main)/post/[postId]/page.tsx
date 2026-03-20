'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Post, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/post-card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PostPage({ params }: { params: { postId: string } }) {
  const firestore = useFirestore();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!firestore || !params.postId) return;
      setLoading(true);
      try {
        const postRef = doc(firestore, 'posts', params.postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = postSnap.data();
          const authorRef = doc(firestore, 'users', postData.authorId);
          const authorSnap = await getDoc(authorRef);
          const author = authorSnap.exists() ? { uid: authorSnap.id, id: authorSnap.id, ...authorSnap.data() } as User : null;

          if (author) {
            setPost({
              ...postData,
              id: postSnap.id,
              author,
            } as Post);
          }
        }
      } catch (error) {
        console.error("Error fetching post: ", error);
      }
      setLoading(false);
    };

    fetchPost();
  }, [firestore, params.postId]);

  if (loading) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-24 mb-4" />
        <Skeleton className="w-full h-[600px]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8 text-center">
         <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
        <h2 className="text-2xl font-bold">Post not found</h2>
        <p className="text-muted-foreground">This post may have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-6 lg:p-8">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
       </Button>
      <PostCard post={post} />
    </div>
  );
}
