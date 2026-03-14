'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Send, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore } from '@/firebase';
import { addComment } from '@/firebase/firestore/interactions';
import type { Post, User, Comment as CommentType } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

type CommentSheetProps = {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CommentItem({ comment }: { comment: CommentType }) {
    return (
        <div className="flex items-start gap-3 my-4">
            <UserAvatar user={comment.author} className="w-8 h-8"/>
            <div className="flex-1">
                <p>
                    <span className="font-bold text-sm mr-2">{comment.author.username}</span>
                    <span className="text-sm">{comment.text}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                </p>
            </div>
        </div>
    )
}

export function CommentSheet({ post, open, onOpenChange }: CommentSheetProps) {
    const { appUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<CommentType[]>([]);
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        if (!firestore || !post.id) return;
        const q = query(collection(firestore, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const commentsData = await Promise.all(
                querySnapshot.docs.map(async (commentDoc) => {
                    const commentData = commentDoc.data();
                    const authorRef = doc(firestore, 'users', commentData.authorId);
                    const authorSnap = await getDoc(authorRef);
                    const author = authorSnap.exists() ? authorSnap.data() as User : null;
                    return { ...commentData, id: commentDoc.id, author } as CommentType;
                })
            );
            setComments(commentsData.filter(c => c.author));
        });

        return () => unsubscribe();

    }, [firestore, post.id]);

    const handlePostComment = async () => {
        if (!appUser || !commentText.trim()) return;
        setIsPosting(true);
        try {
            await addComment(post.id, appUser.uid, commentText);
            setCommentText('');
        } catch (error) {
            toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsPosting(false);
        }
    };
    
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-lg">
        <SheetHeader className="text-center relative">
          <SheetTitle>Comments</SheetTitle>
          <Button variant="ghost" size="icon" className="absolute -top-2 right-0" onClick={() => onOpenChange(false)}>
              <X />
          </Button>
        </SheetHeader>
        <Separator />
        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6">
                {comments.length === 0 ? (
                    <div className="flex items-center justify-center h-full py-24">
                        <p className="text-muted-foreground">Be the first to comment!</p>
                    </div>
                ) : (
                    comments.map(comment => <CommentItem key={comment.id} comment={comment} />)
                )}
            </div>
        </ScrollArea>
        <Separator />
        <SheetFooter className="p-4 bg-background sm:justify-center">
            <div className="flex items-center gap-2 w-full">
                <UserAvatar user={appUser} className="w-8 h-8" />
                <Input 
                    placeholder="Add a comment..." 
                    className="flex-1"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <Button onClick={handlePostComment} disabled={isPosting || !commentText.trim()} loading={isPosting} size="icon">
                    <Send />
                </Button>
            </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
