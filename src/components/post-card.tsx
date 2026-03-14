'use client';

import Image from 'next/image';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import type { Post } from '@/lib/types';
import Link from 'next/link';

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="w-full max-w-lg mx-auto rounded-xl overflow-hidden border-0 shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Link href={`/profile/${post.author.username}`}>
          <UserAvatar user={post.author} />
        </Link>
        <div className="flex-1">
          <Link
            href={`/profile/${post.author.username}`}
            className="font-bold hover:underline"
          >
            {post.author.username}
          </Link>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 relative aspect-square">
        <Image
          src={post.mediaUrl}
          alt={`Post by ${post.author.username}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4">
        <div className="flex w-full items-center">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon">
              <Heart className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="icon">
              <Bookmark className="h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="w-full text-sm font-bold mt-2">{post.likesCount} likes</div>
        <div className="w-full text-sm mt-1">
          <span className="font-bold mr-2">{post.author.username}</span>
          <span>{post.caption}</span>
        </div>
        {post.commentsCount > 0 && (
          <div className="w-full text-sm text-muted-foreground mt-2 cursor-pointer hover:underline">
            View all {post.commentsCount} comments
          </div>
        )}
        <div className="w-full text-xs text-muted-foreground mt-2">
          {post.createdAt.toUpperCase()}
        </div>
      </CardFooter>
    </Card>
  );
}
