'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Send, Bookmark, Music, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import type { Post } from '@/lib/types';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FullScreenPostProps = {
  post: Post;
  onInteraction: () => boolean; // returns true if allowed, false if not
};

export function FullScreenPost({ post, onInteraction }: FullScreenPostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const handleLike = () => {
    if (!onInteraction()) return;
    
    if (!isLiked) {
      setIsLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    } else {
      setIsLiked(false);
    }
  };
  
  let lastTap = 0;
  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Make sure the double tap is not on an interactive element like a button
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
      
    const now = new Date().getTime();
    const timeSinceLastTap = now - lastTap;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      handleLike();
    }
    lastTap = now;
  };

  const handleComment = () => {
    if (!onInteraction()) return;
    // Open comment modal logic here
    alert("Comments coming soon!");
  };

  const toggleMute = (e: React.MouseEvent<HTMLVideoElement | HTMLButtonElement>) => {
    e.stopPropagation(); // prevent double tap like
    if(videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  }

  useEffect(() => {
    if (videoRef.current) {
        setIsMuted(videoRef.current.muted);
    }
  }, []);

  return (
    <div className="relative w-full h-full" onClick={handleDoubleTap}>
      {post.mediaType === 'video' ? (
        <>
          <video
            ref={videoRef}
            src={post.mediaUrl}
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <Button variant="ghost" size="icon" onClick={toggleMute} className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50">
            {isMuted ? <VolumeX /> : <Volume2 />}
          </Button>
        </>
      ) : (
        <Image
          src={post.mediaUrl}
          alt={post.caption}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}
      
      {showHeart && (
         <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-white fill-white animate-in fade-in zoom-in" />
      )}

      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
        <div className="flex items-end">
          <div className="flex-1 min-w-0 pr-4">
            <Link href={`/profile/${post.author.username}`} className="font-bold hover:underline block truncate">
              @{post.author.username}
            </Link>
            <p className="text-sm mt-1 text-white/90">{post.caption}</p>
            <div className="flex items-center gap-2 mt-2 text-sm">
                <Music className="w-4 h-4" />
                <span className="truncate">Original Audio - {post.author.username}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
             <Link href={`/profile/${post.author.username}`}>
                <UserAvatar user={post.author} className="w-12 h-12 border-2 border-white"/>
             </Link>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={handleLike}>
                <Heart className={cn("w-8 h-8 transition-colors", isLiked && 'fill-red-500 text-red-500')} />
              </Button>
              <span className="text-xs font-bold">{post.likes + (isLiked ? 1 : 0)}</span>
            </div>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={handleComment}>
                <MessageCircle className="w-8 h-8" />
              </Button>
              <span className="text-xs font-bold">{post.comments.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={onInteraction}>
                <Bookmark className="w-8 h-8" />
              </Button>
               <span className="text-xs font-bold">Save</span>
            </div>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={onInteraction}>
                <Send className="w-8 h-8" />
              </Button>
              <span className="text-xs font-bold">Share</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
