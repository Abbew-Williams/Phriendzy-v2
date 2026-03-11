import Image from "next/image";
import { currentUser, posts } from "@/lib/data";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Settings, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const userPosts = posts.filter(p => p.author.id === currentUser.id);

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row gap-8 items-center sm:items-start mb-10">
        <UserAvatar user={currentUser} className="w-24 h-24 sm:w-36 sm:h-36" />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-4 mb-4">
            <h1 className="font-headline text-2xl font-medium">{currentUser.username}</h1>
            <Button variant="secondary">Edit Profile</Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex justify-center sm:justify-start gap-6 mb-4">
            <div><span className="font-bold">{userPosts.length}</span> posts</div>
            <div><span className="font-bold">{currentUser.followers}</span> followers</div>
            <div><span className="font-bold">{currentUser.following}</span> following</div>
          </div>
          <div>
            <h2 className="font-bold">{currentUser.name}</h2>
            <p className="text-muted-foreground">{currentUser.bio}</p>
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
