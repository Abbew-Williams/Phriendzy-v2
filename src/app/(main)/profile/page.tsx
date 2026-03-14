'use client';

import Image from "next/image";
import { useUser } from "@/firebase";
import { posts } from "@/lib/data";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Settings, PlusSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function ProfilePage() {
  const { appUser, loading, user: authUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authUser) {
      router.push('/login');
    }
  }, [loading, authUser, router]);

  if (loading || !appUser) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
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

  // TODO: Fetch user's posts from firestore
  const userPosts = posts.filter(p => p.author.id === appUser.id);
  const userName = `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim();

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row gap-8 items-center sm:items-start mb-10">
        <UserAvatar user={appUser} className="w-24 h-24 sm:w-36 sm:h-36" />
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
            <div><span className="font-bold">{userPosts.length}</span> posts</div>
            <div><span className="font-bold">{appUser.followersCount}</span> followers</div>
            <div><span className="font-bold">{appUser.followingCount}</span> following</div>
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
          <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-6">
            {userPosts.map(post => (
              <div key={post.id} className="relative aspect-square">
                <Image
                  src={post.mediaUrl}
                  alt={post.caption}
                  fill
                  className="object-cover rounded-md"
                  sizes="(max-width: 768px) 33vw, 33vw"
                />
              </div>
            ))}
          </div>
           {userPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg mt-6">
              <h3 className="text-xl font-semibold">No posts yet</h3>
              <p className="text-muted-foreground mt-2">Share your first photo or video.</p>
            </div>
           )}
        </TabsContent>
        <TabsContent value="saved">
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg mt-6">
              <h3 className="text-xl font-semibold">No saved posts</h3>
              <p className="text-muted-foreground mt-2">Save posts you want to see again.</p>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
