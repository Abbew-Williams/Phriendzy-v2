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
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import type { User as AppUser, Post } from "@/lib/types";
import { toggleFollow } from "@/firebase/firestore/interactions";
import { useToast } from "@/hooks/use-toast";


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
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!firestore) return;
      setLoading(true);

      // Redirect to own profile if username matches current user
      if (currentUser && currentUser.username === username) {
        router.replace('/profile');
        return;
      }
      
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("username", "==", username), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = { ...userDoc.data(), id: userDoc.id } as AppUser;
        setProfileUser(userData);

        // Fetch user posts
        const postsQuery = query(collection(firestore, 'posts'), where('authorId', '==', userData.uid), orderBy('createdAt', 'desc'));
        const postsSnapshot = await getDocs(postsQuery);
        setUserPosts(postsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Post)));
        
        // Check follow status
        if (currentUser) {
            const followRef = doc(firestore, 'users', currentUser.uid, 'following', userData.uid);
            const followSnap = await getDoc(followRef);
            setIsFollowing(followSnap.exists());
        }

      } else {
        // Handle user not found
        console.log("User not found");
      }
      setLoading(false);
    };

    if (!authLoading) {
        fetchUserProfile();
    }
  }, [username, firestore, authLoading, currentUser, router]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser) {
        toast({ title: "Please log in to follow users.", variant: "destructive" });
        return;
    }
    setIsFollowLoading(true);
    const wasFollowing = isFollowing;
    // Optimistic update
    setIsFollowing(!wasFollowing);
    setProfileUser(p => p ? { ...p, followersCount: p.followersCount + (!wasFollowing ? 1 : -1) } : null);

    try {
        await toggleFollow(currentUser.uid, profileUser.uid);
    } catch(e) {
        console.error(e);
        // Revert on error
        setIsFollowing(wasFollowing);
        setProfileUser(p => p ? { ...p, followersCount: p.followersCount + (wasFollowing ? 1 : -1) } : null);
        toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
        setIsFollowLoading(false);
    }
  }

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
            <div><span className="font-bold">{userPosts.length}</span> posts</div>
            <div><span className="font-bold">{profileUser.followersCount}</span> followers</div>
            <div><span className="font-bold">{profileUser.followingCount}</span> following</div>
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
           {userPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg mt-6">
              <h3 className="text-xl font-semibold">No posts yet</h3>
              <p className="text-muted-foreground mt-2">This user hasn't shared any posts.</p>
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
  );
}
