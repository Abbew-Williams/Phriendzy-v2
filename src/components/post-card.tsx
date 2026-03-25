'use client';

import Image from 'next/image';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { doc, getDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

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
import { useUser, useFirestore } from '@/firebase';
import { toggleLike, toggleSave, toggleFollow } from '@/firebase/firestore/interactions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommentSheet } from './comment-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation';


type PostCardProps = {
  post: Post;
};

export function PostCard({ post: initialPost }: PostCardProps) {
  const { user, appUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [post, setPost] = useState(initialPost);
  const [timeAgo, setTimeAgo] = useState('');

  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const isOwner = appUser?.uid === post.authorId;
  
  // This effect ensures the post state updates if the parent's real-time listener provides a new post object.
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  // Set time ago
  useEffect(() => {
    if (post.createdAt) {
      const date = typeof post.createdAt.toDate === 'function' ? post.createdAt.toDate() : new Date(post.createdAt);
      setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
    }
  }, [post.createdAt]);

  // Fetch initial like, save and follow status
  useEffect(() => {
    if (!user || !post || !firestore) return;
    
    let unsubFollow: (() => void) | undefined = undefined;

    const checkStatus = async () => {
      const likeRef = doc(firestore, 'users', user.uid, 'likes', post.id);
      const likeSnap = await getDoc(likeRef);
      setIsLiked(likeSnap.exists());

      const saveRef = doc(firestore, 'users', user.uid, 'saved', post.id);
      const saveSnap = await getDoc(saveRef);
      setIsSaved(saveSnap.exists());

      if (appUser && post.authorId && appUser.uid !== post.authorId) {
        const followRef = doc(firestore, 'users', appUser.uid, 'following', post.authorId);
        unsubFollow = onSnapshot(followRef, (snap) => {
            setIsFollowingAuthor(snap.exists());
        });
      }
    };
    checkStatus();
    
    return () => {
        if(unsubFollow) unsubFollow();
    }
  }, [user, appUser, post, firestore]);

  const handleInteraction = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Login or create an account to interact with posts.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleLike = async () => {
    if (!handleInteraction() || !user || isLiking) return;

    setIsLiking(true);
    // Optimistic update for UI responsiveness
    setIsLiked(current => !current);
    setPost(p => ({ ...p, likesCount: p.likesCount + (isLiked ? -1 : 1) }));
    
    try {
      await toggleLike(post.id, user.uid);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(current => !current);
      setPost(p => ({ ...p, likesCount: p.likesCount + (isLiked ? 1 : -1) }));
      toast({ title: "Error", description: "Could not like post.", variant: "destructive" });
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!handleInteraction() || !user || isSaving) return;
    setIsSaving(true);
    setIsSaved(current => !current);
    try {
      await toggleSave(post.id, user.uid);
    } catch (error) {
      setIsSaved(current => !current);
      toast({ title: "Error", description: "Could not save post.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleShare = () => {
      if (!handleInteraction()) return;
      toast({
        title: 'Coming Soon!',
        description: 'Share functionality is not yet implemented.',
      });
  };

  const handleDelete = async () => {
    if (!isOwner || !firestore) return;

    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'posts', post.id));
        toast({
            title: 'Post Deleted',
            description: 'Your post has been successfully deleted.',
        });
        router.push('/profile');
    } catch (error) {
        console.error('Error deleting post:', error);
        toast({
            title: 'Error',
            description: 'Could not delete post. Please try again.',
            variant: 'destructive',
        });
        setIsDeleting(false);
    }
  };
  
  const handlePrivacyChange = async (privacy: 'public' | 'friends' | 'private') => {
    if (!isOwner || !firestore || post.privacy === privacy) return;
    
    const oldPrivacy = post.privacy;
    setPost(p => ({ ...p, privacy }));
    
    try {
      const postRef = doc(firestore, 'posts', post.id);
      await updateDoc(postRef, { privacy });
      toast({
        title: 'Privacy Updated',
        description: `Your post is now visible to ${privacy}.`,
      });
    } catch (error) {
      console.error('Error updating privacy:', error);
      toast({
        title: 'Error',
        description: 'Could not update post privacy.',
        variant: 'destructive',
      });
      setPost(p => ({ ...p, privacy: oldPrivacy }));
    }
  };
  
  const handleFollowToggle = async () => {
      if (!handleInteraction() || !appUser || !post.authorId || isFollowLoading) return;
      setIsFollowLoading(true);
      try {
          await toggleFollow(appUser.uid, post.authorId);
      } catch(err) {
          console.error("Failed to follow/unfollow user", err);
          toast({ title: "Error", description: "Could not perform action.", variant: "destructive" });
      } finally {
          setIsFollowLoading(false);
      }
  }


  return (
    <>
      <Card className="w-full max-w-lg mx-auto rounded-xl overflow-hidden border shadow-none">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {isOwner ? (
                    <>
                        <DropdownMenuItem onClick={() => handlePrivacyChange('public')} disabled={post.privacy === 'public'}>Set to Public</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrivacyChange('friends')} disabled={post.privacy === 'friends'}>Set to Friends</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrivacyChange('private')} disabled={post.privacy === 'private'}>Set to Private</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            Delete Post
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={() => toast({ title: 'Coming soon!', description: 'Report functionality not yet implemented.' })}>Report</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleFollowToggle} disabled={isFollowLoading}>
                            {isFollowingAuthor ? 'Unfollow' : 'Follow'}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
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
              <Button variant="ghost" size="icon" onClick={handleLike} disabled={isLiking}>
                <Heart className={cn("h-6 w-6", isLiked && "fill-red-500 text-red-500")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleInteraction() && setShowComments(true)}>
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Send className="h-6 w-6" />
              </Button>
            </div>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" onClick={handleSave} disabled={isSaving}>
                <Bookmark className={cn("h-6 w-6", isSaved && "fill-primary text-primary")} />
              </Button>
            </div>
          </div>
          <p className="w-full text-sm font-bold mt-2">{post.likesCount.toLocaleString()} likes</p>
          <p className="w-full text-sm mt-1">
            <Link href={`/profile/${post.author.username}`} className="font-bold mr-2 hover:underline">{post.author.username}</Link>
            <span>{post.caption}</span>
          </p>
          {post.commentsCount > 0 && (
            <button onClick={() => handleInteraction() && setShowComments(true)} className="w-full text-left text-sm text-muted-foreground mt-2 cursor-pointer hover:underline">
              View all {post.commentsCount.toLocaleString()} comments
            </button>
          )}
          <p className="w-full text-xs text-muted-foreground mt-2 uppercase tracking-wider">
            {timeAgo}
          </p>
        </CardFooter>
      </Card>
      <CommentSheet post={post} open={showComments} onOpenChange={setShowComments} />
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your post from our servers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} loading={isDeleting} variant="destructive">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
