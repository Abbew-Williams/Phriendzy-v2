'use client';

import Image from "next/image";
import { useUser, useFirestore } from "@/firebase";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Settings, PlusSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import type { User as AppUser, Post } from "@/lib/types";
import { FollowSheet } from "@/components/follow-sheet";


export default function ProfilePage() {
  const { appUser, loading, user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(true);

  const [sheetState, setSheetState] = useState<{ open: boolean, type: 'followers' | 'following' }>({ open: false, type: 'followers' });

  useEffect(() => {
    if (!loading && !authUser) {
      router.push('/login');
    }
  }, [loading, authUser, router]);
  
  useEffect(() => {
    if (!appUser || !firestore) return;

    setPostsLoading(true);
    const postsQuery = query(
      collection(firestore, 'posts'),
      where('authorId', '==', appUser.uid)
    );
    
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
        const postsData = querySnapshot.docs.map(doc => {
            return {
                id: doc.id,
                ...doc.data(),
                author: appUser,
            } as Post;
        });

        // Sort posts by creation date, newest first
        postsData.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return timeB - timeA;
        });

        setUserPosts(postsData);
        setPostsLoading(false);
    }, (error) => {
        console.error("Error fetching user posts:", error);
        setPostsLoading(false);
    });

    return () => unsubscribe();
  }, [appUser, firestore]);

  // Fetch Saved Posts
  useEffect(() => {
    if (!appUser || !firestore) return;

    setSavedPostsLoading(true);
    const savedPostsQuery = query(collection(firestore, 'users', appUser.uid, 'saved'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(savedPostsQuery, async (snapshot) => {
        const postPromises = snapshot.docs.map(async (savedDoc) => {
            const postId = savedDoc.id;
            const postRef = doc(firestore, 'posts', postId);
            const postSnap = await getDoc(postRef);

            if (!postSnap.exists()) return null;

            const postData = postSnap.data();
            if (!postData.authorId) return null;

            const authorRef = doc(firestore, 'users', postData.authorId);
            const authorSnap = await getDoc(authorRef);
            const author = authorSnap.exists() ? { id: authorSnap.id, uid: authorSnap.id, ...authorSnap.data() } as AppUser : null;

            if (!author) return null;

            return { ...postData, id: postSnap.id, author } as Post;
        });

        const resolvedPosts = (await Promise.all(postPromises)).filter(p => p) as Post[];
        setSavedPosts(resolvedPosts);
        setSavedPostsLoading(false);
    }, (error) => {
        console.error("Error fetching saved posts:", error);
        setSavedPostsLoading(false);
    });

    return () => unsubscribe();
  }, [appUser, firestore]);
  
  const openFollowSheet = (type: 'followers' | 'following') => {
    setSheetState({ open: true, type });
  };

  if (loading || !appUser) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row gap-8 items-center sm:items-start mb-10">
          <Skeleton className="w-24 h-24 sm:w-36 sm:h-36 rounded-full" />
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="flex justify-center sm:justify-start gap-6">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
          </div>
        </header>
      </div>
    );
  }

  const userName = `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim();

  return (
    <>
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row gap-8 items-center sm:items-start mb-10">
          <UserAvatar user={appUser} className="w-24 h-24 sm:w-36 sm:h-36 object-cover" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-4 mb-4">
              <h1 className="font-headline text-2xl font-medium">{appUser.username}</h1>
              <Button asChild variant="secondary">
                <Link href="/profile/edit">Edit Profile</Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="/settings">
                  <Settings className="w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="/create">
                  <PlusSquare className="w-5 h-5" />
                </Link>
              </Button>
            </div>
            <div className="flex justify-center sm:justify-start gap-6 mb-4">
              <button className="focus:outline-none"><span className="font-bold">{userPosts.length}</span> posts</button>
              <button onClick={() => openFollowSheet('followers')} className="focus:outline-none hover:underline"><span className="font-bold">{appUser.followersCount}</span> followers</button>
              <button onClick={() => openFollowSheet('following')} className="focus:outline-none hover:underline"><span className="font-bold">{appUser.followingCount}</span> following</button>
            </div>
            <div>
              <h2 className="font-bold">{userName}</h2>
              <p className="text-muted-foreground">{appUser.bio}</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
              {postsLoading ? (
                  <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-6">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}
                  </div>
              ) : userPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-6">
                      {userPosts.map(post => (
                      <Link href={`/post/${post.id}`} key={post.id} className="relative aspect-square">
                          <Image
                          src={post.mediaUrl}
                          alt={post.caption || 'User post'}
                          fill
                          className="object-cover rounded-md"
                          sizes="(max-width: 768px) 33vw, 33vw"
                          />
                      </Link>
                      ))}
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg mt-6">
                      <h3 className="text-xl font-semibold">No posts yet</h3>
                      <p className="text-muted-foreground mt-2">Share your first photo or video.</p>
                  </div>
              )}
          </TabsContent>
          <TabsContent value="saved">
              {savedPostsLoading ? (
                  <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-6">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}
                  </div>
              ) : savedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-6">
                      {savedPosts.map(post => (
                      <Link href={`/post/${post.id}`} key={post.id} className="relative aspect-square">
                          <Image
                          src={post.mediaUrl}
                          alt={post.caption || 'Saved post'}
                          fill
                          className="object-cover rounded-md"
                          sizes="(max-width: 768px) 33vw, 33vw"
                          />
                      </Link>
                      ))}
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg mt-6">
                    <h3 className="text-xl font-semibold">No saved posts</h3>
                    <p className="text-muted-foreground mt-2">Save posts you want to see again.</p>
                  </div>
              )}
          </TabsContent>
        </Tabs>
      </div>
      <FollowSheet 
        open={sheetState.open}
        onOpenChange={(open) => setSheetState(s => ({ ...s, open }))}
        userId={appUser.uid}
        type={sheetState.type}
      />
    </>
  );
}
