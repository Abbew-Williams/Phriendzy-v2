'use client';

import Image from "next/image";
import { useUser, useFirestore } from "@/firebase";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Settings, Plus, UserCheck, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { User as AppUser, Post } from "@/lib/types";
import { toggleFollow } from "@/firebase/firestore/interactions";
import { useToast } from "@/hooks/use-toast";
import { FollowSheet } from "@/components/follow-sheet";


export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: authUser, appUser: currentUser, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const [sheetState, setSheetState] = useState<{ open: boolean, type: 'followers' | 'following' }>({ open: false, type: 'followers' });

  useEffect(() => {
    if (authLoading || !firestore) return;

    if (currentUser && currentUser.username === username) {
      router.replace('/profile');
      return;
    }

    setLoading(true);
    let unsubscribePosts = () => {};

    const fetchUserProfileAndPosts = async () => {
      try {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("username", "==", username), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = { ...userDoc.data(), id: userDoc.id } as AppUser;
          setProfileUser(userData);

          const postsQuery = query(collection(firestore, 'posts'), where('authorId', '==', userData.uid));
          unsubscribePosts = onSnapshot(postsQuery, (postsSnapshot) => {
            const allPosts = postsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Post));
            
            // Sort posts by creation date, newest first
            allPosts.sort((a, b) => {
                const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            const publicPosts = allPosts.filter(p => p.privacy === 'public');
            setUserPosts(publicPosts);
            setPostsLoading(false);
          });

        } else {
          console.log("User not found");
          setProfileUser(null);
          setPostsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error loading profile",
          description: "Could not fetch user data. Please try again.",
          variant: "destructive",
        });
        setPostsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileAndPosts();
    
    return () => unsubscribePosts();
  }, [username, firestore, authLoading, currentUser, router, toast]);

  // Real-time follow status listener
  useEffect(() => {
    if (!currentUser || !profileUser?.uid || !firestore) {
      return;
    }
    const followRef = doc(firestore, 'users', currentUser.uid, 'following', profileUser.uid);
    const unsubscribe = onSnapshot(followRef, (doc) => {
      setIsFollowing(doc.exists());
    });
    return () => unsubscribe();
  }, [currentUser, profileUser, firestore]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser) {
        toast({ title: "Please log in to follow users.", variant: "destructive" });
        return;
    }
    setIsFollowLoading(true);
    const wasFollowing = isFollowing;
    // Optimistic update for the follower count on the profile user
    setProfileUser(p => {
        if (!p) return null;
        const currentFollowers = p.followersCount || 0;
        return { ...p, followersCount: currentFollowers + (wasFollowing ? -1 : 1) };
    });


    try {
        await toggleFollow(currentUser.uid, profileUser.uid);
        // No need to setIsFollowing here, the snapshot listener will handle it.
    } catch(e) {
        console.error(e);
        // Revert on error
         setProfileUser(p => {
            if (!p) return null;
            const currentFollowers = p.followersCount || 0;
            // This reverts the optimistic update
            return { ...p, followersCount: currentFollowers + (wasFollowing ? 1 : -1) };
        });
        toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
        setIsFollowLoading(false);
    }
  }

  const openFollowSheet = (type: 'followers' | 'following') => {
    setSheetState({ open: true, type });
  };

  if (loading || authLoading) {
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

  if (!profileUser) {
    return (
        <div className="w-full p-4 sm:p-6 lg:p-8 flex items-center justify-center h-96">
            <div className="text-center">
                <h2 className="text-2xl font-bold">User not found</h2>
                <p className="text-muted-foreground mt-2">The user @{username} does not exist.</p>
                <Button asChild className="mt-4"><Link href="/home">Go Home</Link></Button>
            </div>
        </div>
    )
  }

  const userName = `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim();

  return (
    <>
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row gap-8 items-center sm:items-start mb-10">
          <UserAvatar user={profileUser} className="w-24 h-24 sm:w-36 sm:h-36 object-cover" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-4 mb-4">
              <h1 className="font-headline text-2xl font-medium">{profileUser.username}</h1>
              <Button onClick={handleFollowToggle} loading={isFollowLoading} variant={isFollowing ? 'secondary' : 'default'}>
                {isFollowing ? <UserCheck className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4" />}
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button variant="secondary">Message</Button>
            </div>
            <div className="flex justify-center sm:justify-start gap-6 mb-4">
              <button className="focus:outline-none"><span className="font-bold">{userPosts.length}</span> posts</button>
              <button onClick={() => openFollowSheet('followers')} className="focus:outline-none hover:underline"><span className="font-bold">{profileUser.followersCount || 0}</span> followers</button>
              <button onClick={() => openFollowSheet('following')} className="focus:outline-none hover:underline"><span className="font-bold">{profileUser.followingCount || 0}</span> following</button>
            </div>
            <div>
              <h2 className="font-bold">{userName}</h2>
              <p className="text-muted-foreground">{profileUser.bio}</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="liked">Liked</TabsTrigger>
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
                    <h3 className="text-xl font-semibold">No public posts</h3>
                    <p className="text-muted-foreground mt-2">This user hasn't shared any public posts.</p>
                </div>
              )}
          </TabsContent>
          <TabsContent value="liked">
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg mt-6">
                <h3 className="text-xl font-semibold">No liked posts</h3>
                <p className="text-muted-foreground mt-2">This user's liked posts are private.</p>
              </div>
          </TabsContent>
        </Tabs>
      </div>
      {profileUser && (
          <FollowSheet 
              open={sheetState.open}
              onOpenChange={(open) => setSheetState(s => ({ ...s, open }))}
              userId={profileUser.uid}
              type={sheetState.type}
          />
      )}
    </>
  );
}
