'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Send, Bookmark, Music, Volume2, VolumeX, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import type { Post } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { toggleLike, toggleSave, toggleFollow } from '@/firebase/firestore/interactions';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CommentSheet } from './comment-sheet';

type FullScreenPostProps = {
  post: Post;
  onInteraction: () => boolean; // returns true if allowed, false if not
};

export function FullScreenPost({ post: initialPost, onInteraction }: FullScreenPostProps) {
  const { user, appUser } = useUser();
  const firestore = useFirestore();
  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch initial like, save, and follow status
  useEffect(() => {
    if (!user || !post) return;
    const checkStatus = async () => {
      // Like status
      const likeRef = doc(firestore, 'users', user.uid, 'likes', post.id);
      const likeSnap = await getDoc(likeRef);
      setIsLiked(likeSnap.exists());

      // Save status
      const saveRef = doc(firestore, 'users', user.uid, 'saved', post.id);
      const saveSnap = await getDoc(saveRef);
      setIsSaved(saveSnap.exists());
      
      // Follow status
      if (appUser && post.authorId && appUser.uid !== post.authorId) {
        const followRef = doc(firestore, 'users', appUser.uid, 'following', post.authorId);
        const followSnap = await getDoc(followRef);
        setIsFollowingAuthor(followSnap.exists());
      }
    };
    checkStatus();
  }, [user, appUser, post, firestore]);

  const handleLike = async () => {
    if (!onInteraction() || !user) return;
    
    const wasLiked = isLiked;
    // Optimistic update
    setIsLiked(!wasLiked);
    setPost(p => ({ ...p, likesCount: p.likesCount + (!wasLiked ? 1 : -1) }));
    if (!wasLiked) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    
    try {
      await toggleLike(post.id, user.uid);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setPost(p => ({ ...p, likesCount: p.likesCount + (wasLiked ? 1 : -1) }));
      console.error("Failed to toggle like", error);
    }
  };
  
  let lastTap = 0;
  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    const now = new Date().getTime();
    const timeSinceLastTap = now - lastTap;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      handleLike();
    }
    lastTap = now;
  };

  const handleComment = () => {
    if (!onInteraction()) return;
    setShowComments(true);
  };
  
  const handleSave = async () => {
    if (!onInteraction() || !user) return;
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      await toggleSave(post.id, user.uid);
    } catch (error) {
      setIsSaved(wasSaved);
      console.error("Failed to toggle save", error);
    }
  };

  const toggleMute = (e: React.MouseEvent<HTMLVideoElement | HTMLButtonElement>) => {
    e.stopPropagation();
    if(videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  }

  const handleFollowAuthor = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onInteraction() || !appUser || !post.authorId) return;

    setFollowLoading(true);

    try {
        const newState = await toggleFollow(appUser.uid, post.authorId);
        setIsFollowingAuthor(newState);
    } catch(err) {
        console.error("Failed to follow user", err);
    } finally {
        setFollowLoading(false);
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

      <div className="absolute bottom-16 md:bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
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
             <div className="relative">
                <Link href={`/profile/${post.author.username}`}>
                    <UserAvatar user={post.author} className="w-12 h-12 border-2 border-white"/>
                </Link>
                {appUser && appUser.uid !== post.author.uid && !isFollowingAuthor && (
                    <Button 
                        size="icon" 
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-background"
                        onClick={handleFollowAuthor}
                        loading={followLoading}
                    >
                        {!followLoading && <Plus className="w-4 h-4 text-primary-foreground" />}
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={handleLike}>
                <Heart className={cn("w-8 h-8 transition-colors", isLiked && 'fill-red-500 text-red-500')} />
              </Button>
              <span className="text-xs font-bold">{post.likesCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={handleComment}>
                <MessageCircle className="w-8 h-8" />
              </Button>
              <span className="text-xs font-bold">{post.commentsCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-transparent" onClick={handleSave}>
                <Bookmark className={cn("w-8 h-8 transition-colors", isSaved && 'fill-primary text-primary')} />
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
      <CommentSheet post={post} open={showComments} onOpenChange={setShowComments} />
    </div>
  );
}
