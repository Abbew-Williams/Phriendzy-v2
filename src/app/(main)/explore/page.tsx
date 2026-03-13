import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Video, Image as ImageIcon } from 'lucide-react';

import { aiPoweredDiscoveryFeed } from '@/ai/flows/ai-powered-discovery-feed';
import { currentUser, posts as allPosts } from '@/lib/data';

export default async function ExplorePage() {
  const recommendations = await aiPoweredDiscoveryFeed({
    userId: currentUser.id,
    userLikedPosts: ['post-3', 'post-5'],
    userCommentedPosts: ['post-1'],
    userWatchedVideos: [],
    userFollowedAccounts: ['user-2', 'user-3'],
    currentTimestamp: new Date().toISOString(),
    limit: 18,
  });
  
  // Create a map for quick post lookup
  const postMap = new Map(allPosts.map(p => [p.id, p]));

  // Get recommended posts, preserving order from the AI
  let recommendedPosts = (recommendations?.recommendedPostIds || [])
    .map(id => postMap.get(id))
    .filter(Boolean);

  // If AI returns fewer than requested, fill with other posts, avoiding duplicates
  if (recommendedPosts.length < 18) {
      const existingIds = new Set(recommendedPosts.map(p => p!.id));
      const fillerPosts = allPosts
        .filter(p => !existingIds.has(p.id))
        .slice(0, 18 - recommendedPosts.length);
      recommendedPosts.push(...fillerPosts);
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Explore</h1>
      <div className="grid grid-cols-3 gap-1">
        {recommendedPosts.map((post) => (
          post && (
          <Link href="#" key={post.id} className="group relative block aspect-square w-full overflow-hidden rounded-md bg-muted">
             {post.mediaType === 'video' ? (
                <>
                  <video
                    src={post.mediaUrl}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <Video className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-sm" />
                </>
              ) : (
                <>
                  <Image
                    src={post.mediaUrl}
                    alt={post.caption}
                    fill
                    sizes="(max-width: 768px) 33vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                   <ImageIcon className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-sm" />
                </>
              )}
            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
              <div className="flex items-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="h-5 w-5" />
                  <span className="text-sm font-semibold">{post.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">{post.comments.length}</span>
                </div>
              </div>
            </div>
          </Link>
        )))}
      </div>
    </div>
  );
}
