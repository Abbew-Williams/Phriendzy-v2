'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, increment, writeBatch, onSnapshot } from 'firebase/firestore';
import type { Status, User, StatusComment } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { X, Heart, MessageCircle, Send, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toggleStatusLike } from '@/firebase/firestore/interactions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FollowSheet } from '@/components/follow-sheet';

// Helper function to mark a status as viewed
const addStatusView = async (firestore: any, authorId: string, statusId: string, viewerId: string) => {
    if (authorId === viewerId) return; // Don't record self-views

    const viewRef = doc(firestore, 'users', authorId, 'statuses', statusId, 'views', viewerId);
    const viewSnap = await getDoc(viewRef);

    if (!viewSnap.exists()) {
        const statusRef = doc(firestore, 'users', authorId, 'statuses', statusId);
        const batch = writeBatch(firestore);
        batch.set(viewRef, { viewedAt: new Date() });
        batch.update(statusRef, { viewsCount: increment(1) });
        await batch.commit();
    }
};

const StatusViewersSheet = ({ open, onOpenChange, authorId, statusId }: { open: boolean; onOpenChange: (open: boolean) => void; authorId: string, statusId: string }) => {
    const firestore = useFirestore();
    const [viewers, setViewers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !open) return;
        setLoading(true);
        const viewersColRef = collection(firestore, 'users', authorId, 'statuses', statusId, 'views');
        const unsubscribe = onSnapshot(viewersColRef, async (snapshot) => {
            const viewersData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const userRef = doc(firestore, 'users', docSnap.id);
                const userSnap = await getDoc(userRef);
                return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } as User : null;
            }));
            setViewers(viewersData.filter(Boolean) as User[]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, authorId, statusId, open]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-2/3 flex flex-col">
                <SheetHeader className="text-center">
                    <SheetTitle>Viewed By</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    {loading && <div className="p-4 space-y-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><Skeleton className="h-5 w-32" /></div>)}
                    </div>}
                    {!loading && viewers.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No views yet.</p></div>}
                    <div className="p-4 space-y-4">
                        {viewers.map(viewer => (
                            <div key={viewer.id} className="flex items-center gap-3">
                                <UserAvatar user={viewer} />
                                <div>
                                    <p className="font-semibold">{viewer.username}</p>
                                    <p className="text-sm text-muted-foreground">{viewer.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

const CommentItem = ({ comment, onReply, level = 0 }: { comment: StatusComment; onReply: (comment: StatusComment) => void; level?: number }) => {
    const [showReplies, setShowReplies] = useState(false);
    
    return (
        <div className={cn("py-2", level > 0 && "ml-6")}>
            <div className="flex items-start gap-3">
                <UserAvatar user={comment.author} className="w-8 h-8"/>
                <div className="flex-1">
                    <p>
                        <span className="font-bold text-sm mr-2">{comment.author?.username}</span>
                        <span className="text-sm">{comment.text}</span>
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                        <span>{comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}</span>
                        <button onClick={() => onReply(comment)} className="font-semibold hover:underline">Reply</button>
                    </div>
                </div>
            </div>
             {(comment.repliesCount || 0) > 0 && (
                 <div className="ml-11 mt-2">
                    <button onClick={() => setShowReplies(!showReplies)} className="text-xs text-muted-foreground font-semibold flex items-center gap-2 hover:text-foreground">
                        <Separator className="w-6"/>
                        {showReplies ? 'Hide replies' : `View ${comment.repliesCount} ${comment.repliesCount === 1 ? 'reply' : 'replies'}`}
                    </button>
                 </div>
            )}
            {showReplies && comment.replies && comment.replies.length > 0 && (
                 <div className="mt-2">
                    {comment.replies.map(reply => (
                        <CommentItem key={reply.id} comment={reply} onReply={onReply} level={level + 1} />
                    ))}
                 </div>
            )}
        </div>
    );
};

const StatusCommentsSheet = ({ open, onOpenChange, authorId, statusId, onCommentAdded }: { open: boolean; onOpenChange: (open: boolean) => void; authorId: string, statusId: string, onCommentAdded: () => void }) => {
    const { appUser } = useUser();
    const firestore = useFirestore();
    const [comments, setComments] = useState<StatusComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<StatusComment | null>(null);

    useEffect(() => {
        if (!firestore || !open) return;
        setLoading(true);
        const commentsColRef = collection(firestore, 'users', authorId, 'statuses', statusId, 'comments');
        const q = query(commentsColRef, orderBy('createdAt', 'asc')); // Fetch oldest first to build tree
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const fetchedComments = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const userRef = doc(firestore, 'users', data.authorId);
                const userSnap = await getDoc(userRef);
                return userSnap.exists() ? { id: docSnap.id, author: { id: userSnap.id, ...userSnap.data() }, ...data } as StatusComment : null;
            }));

            const allComments = fetchedComments.filter(Boolean) as StatusComment[];
            
            // Nest replies
            const commentMap = new Map(allComments.map(c => [c.id, { ...c, replies: [] as StatusComment[] }]));
            const rootComments: StatusComment[] = [];

            for (const comment of commentMap.values()) {
                if (comment.parentId && commentMap.has(comment.parentId)) {
                    commentMap.get(comment.parentId)?.replies.push(comment);
                } else {
                    rootComments.push(comment);
                }
            }
            
            // Sort root comments by newest first for display
            setComments(rootComments.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, authorId, statusId, open]);

    const handlePostComment = async () => {
        if (!appUser || !newComment.trim()) return;
        const tempComment = newComment;
        setNewComment('');

        const commentPayload: {
            authorId: string;
            text: string;
            createdAt: Date;
            parentId?: string;
        } = {
            authorId: appUser.uid,
            text: tempComment,
            createdAt: new Date(),
        };

        if (replyingTo) {
            commentPayload.parentId = replyingTo.id;
        }

        const commentsColRef = collection(firestore, 'users', authorId, 'statuses', statusId, 'comments');
        const statusRef = doc(firestore, 'users', authorId, 'statuses', statusId);
        
        const batch = writeBatch(firestore);
        
        // Add new comment
        const newCommentRef = doc(commentsColRef);
        batch.set(newCommentRef, commentPayload);
        
        // Increment total comments on status
        batch.update(statusRef, { commentsCount: increment(1) });
        
        // If it's a reply, increment repliesCount on parent
        if (replyingTo) {
            const parentCommentRef = doc(firestore, 'users', authorId, 'statuses', statusId, 'comments', replyingTo.id);
            batch.update(parentCommentRef, { repliesCount: increment(1) });
        }
        
        await batch.commit();
        onCommentAdded();
        setReplyingTo(null);
    }
    
    const handleCancelReply = () => {
        setReplyingTo(null);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-lg">
                <SheetHeader className="text-center relative">
                    <SheetTitle>Comments</SheetTitle>
                </SheetHeader>
                <Separator />
                <ScrollArea className="flex-1 -mx-6 px-6">
                    {loading && <div className="p-4 space-y-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="flex items-start gap-3"><Skeleton className="w-8 h-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-48" /></div></div>)}
                    </div>}
                    {!loading && comments.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No comments yet.</p></div>}
                    {comments.map(comment => (
                         <CommentItem key={comment.id} comment={comment} onReply={setReplyingTo}/>
                    ))}
                </ScrollArea>
                 <SheetFooter className="p-4 border-t mt-auto bg-background sm:justify-center flex-col">
                    {replyingTo && (
                        <div className="bg-muted text-muted-foreground px-3 py-2 rounded-md text-sm flex justify-between items-center">
                            <span>Replying to @{replyingTo.author?.username}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelReply}><X className="w-4 h-4" /></Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 w-full">
                        <UserAvatar user={appUser} className="w-8 h-8" />
                        <Input 
                            placeholder={replyingTo ? `Add a reply...` : "Add a comment..."}
                            className="flex-1"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                        />
                        <Button onClick={handlePostComment} disabled={!newComment.trim()} size="icon">
                            <Send />
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default function StatusPage() {
    const { userId } = useParams() as { userId: string };
    const { appUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [statuses, setStatuses] = useState<Status[]>([]);
    const [author, setAuthor] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const [showComments, setShowComments] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    
    const [isLiked, setIsLiked] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressTimerRef = useRef<NodeJS.Timeout>();
    const elapsedTimeRef = useRef(0);
    const timerStartTimeRef = useRef(0);
    
    const currentStatus = statuses[currentIndex];
    const isOwner = appUser?.uid === currentStatus?.authorId;

    const pauseHandlers = {
        onMouseDown: () => setIsPaused(true),
        onMouseUp: () => setIsPaused(false),
        onMouseLeave: () => setIsPaused(false),
        onTouchStart: () => setIsPaused(true),
        onTouchEnd: () => setIsPaused(false),
    };

    const nextStatus = useCallback(() => {
        setCurrentIndex(i => {
            if (i < statuses.length - 1) return i + 1;
            router.back();
            return i;
        });
    }, [statuses.length, router]);
    
    const prevStatus = useCallback(() => {
        setCurrentIndex(i => Math.max(0, i - 1));
    }, []);

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!firestore) return;
            setLoading(true);

            try {
                const authorRef = doc(firestore, 'users', userId);
                const authorSnap = await getDoc(authorRef);
                if (authorSnap.exists()) {
                    setAuthor({ id: authorSnap.id, ...authorSnap.data() } as User);
                }

                const q = query(
                    collection(firestore, 'users', userId, 'statuses'),
                    where('expiresAt', '>', new Date()),
                    orderBy('expiresAt', 'asc')
                );
                const querySnapshot = await getDocs(q);
                const statusesData = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id, author: authorSnap.exists() ? ({ id: authorSnap.id, ...authorSnap.data() } as User) : null } as Status));
                setStatuses(statusesData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStatuses();
    }, [firestore, userId]);
    
    // Check like status when status changes
    useEffect(() => {
        if (!currentStatus || !appUser || !firestore) return;
        const checkLikeStatus = async () => {
            const likeRef = doc(firestore, 'users', currentStatus.authorId, 'statuses', currentStatus.id, 'likes', appUser.uid);
            const likeSnap = await getDoc(likeRef);
            setIsLiked(likeSnap.exists());
        }
        checkLikeStatus();
    }, [currentStatus, appUser, firestore]);
    
    // Effect to reset progress when the status item changes
    useEffect(() => {
        setProgress(0);
        elapsedTimeRef.current = 0;
        timerStartTimeRef.current = 0;
    }, [currentIndex]);


    // Effect for progress bar and auto-advance
    useEffect(() => {
        clearInterval(progressTimerRef.current);
        if (!currentStatus) return;

        const isPausedByUser = isPaused || showComments || showViewers;
        const videoElement = videoRef.current;

        if (isPausedByUser) {
            videoElement?.pause();
            if (timerStartTimeRef.current > 0) {
                const timePassedInInterval = Date.now() - timerStartTimeRef.current;
                elapsedTimeRef.current += timePassedInInterval;
                timerStartTimeRef.current = 0;
            }
            return;
        }

        // --- If playing/resuming ---
        if (appUser && firestore) {
            addStatusView(firestore, currentStatus.authorId, currentStatus.id, appUser.uid);
        }
        
        videoElement?.play().catch(() => {});

        const startTimer = (durationMs: number) => {
            if (durationMs <= 0 || durationMs === Infinity) {
                if (currentStatus.mediaType === 'image') nextStatus();
                return;
            }
            timerStartTimeRef.current = Date.now();
            progressTimerRef.current = setInterval(() => {
                const timePassedInInterval = Date.now() - timerStartTimeRef.current;
                const totalElapsedTime = elapsedTimeRef.current + timePassedInInterval;
                const newProgress = Math.min(100, (totalElapsedTime / durationMs) * 100);
                setProgress(newProgress);
                if (newProgress >= 100) {
                    nextStatus();
                }
            }, 100);
        };

        const initializePlayback = () => {
            const videoDurationMs = (videoElement?.duration || 0) * 1000;
            const durationMs = currentStatus.mediaType === 'image' ? 5000 : videoDurationMs;
            startTimer(durationMs);
        };

        if (currentStatus.mediaType === 'image') {
            initializePlayback();
        } else if (videoElement) {
            if (videoElement.readyState >= videoElement.HAVE_METADATA) {
                initializePlayback();
            } else {
                videoElement.onloadedmetadata = initializePlayback;
            }
        }

        return () => {
            clearInterval(progressTimerRef.current);
        };
    }, [isPaused, showComments, showViewers, currentStatus, nextStatus, appUser, firestore]);
    
    
    const handleLike = async () => {
        if (!appUser || !currentStatus || isLiking) return;
        
        setIsLiking(true);
        const wasLiked = isLiked;
        
        // Optimistic update
        setIsLiked(!wasLiked);
        setStatuses(statuses.map(s => {
            if (s.id === currentStatus.id) {
                return { ...s, likesCount: (s.likesCount || 0) + (wasLiked ? -1 : 1) };
            }
            return s;
        }));
        
        try {
            await toggleStatusLike(currentStatus.authorId, currentStatus.id, appUser.uid);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Could not like status.', variant: 'destructive'});
            // Revert optimistic update
            setIsLiked(wasLiked);
             setStatuses(statuses);
        } finally {
            setIsLiking(false);
        }
    }
    
    const onCommentAdded = () => {
        setStatuses(statuses.map(s => {
            if (s.id === currentStatus.id) {
                return { ...s, commentsCount: (s.commentsCount || 0) + 1 };
            }
            return s;
        }));
    };

    if (loading) {
        return <div className="h-screen w-screen bg-black flex items-center justify-center"><Skeleton className="w-full h-full" /></div>
    }
    
    if (!loading && statuses.length === 0) {
        // This can flash for a moment, so let's redirect gracefully
        useEffect(() => {
          router.back();
        }, [router]);
        return <div className="h-screen w-screen bg-black" />;
    }

    if (!currentStatus) return <div className="h-screen w-screen bg-black" />;

    return (
        <>
            <StatusCommentsSheet open={showComments} onOpenChange={setShowComments} authorId={currentStatus.authorId} statusId={currentStatus.id} onCommentAdded={onCommentAdded} />
            {isOwner && <StatusViewersSheet open={showViewers} onOpenChange={setShowViewers} authorId={currentStatus.authorId} statusId={currentStatus.id} />}
            <div className="h-screen w-screen bg-black flex items-center justify-center" {...pauseHandlers}>
                 {/* Click handlers for next/prev */}
                <div className="absolute inset-0 z-10 flex">
                    <div className="flex-1" onClick={prevStatus} />
                    <div className="flex-1" />
                    <div className="flex-1" onClick={nextStatus} />
                </div>
                
                <div className="absolute top-0 left-0 right-0 p-2 z-20">
                    <div className="flex items-center gap-1">
                        {statuses.map((s, i) => (
                            <Progress key={s.id} value={i < currentIndex ? 100 : (i === currentIndex ? progress : 0)} className="h-1 flex-1 bg-white/30" />
                        ))}
                    </div>
                     <div className="flex items-center justify-between mt-2 text-white">
                        <div className="flex items-center gap-2">
                            <UserAvatar user={author} className="w-8 h-8" />
                            <span className="font-bold text-sm">{author?.username}</span>
                            <span className="text-xs text-neutral-300">{currentStatus && currentStatus.createdAt && formatDistanceToNow(currentStatus.createdAt.toDate(), { addSuffix: true })}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white z-20" onClick={() => router.back()}><X /></Button>
                    </div>
                </div>

                <div className="relative w-full h-full flex items-center justify-center">
                    {currentStatus?.mediaType === 'video' ? (
                        <video ref={videoRef} key={currentStatus.id} src={currentStatus.mediaUrl} autoPlay playsInline className="max-h-full max-w-full object-contain" onEnded={nextStatus} />
                    ) : (
                        <Image src={currentStatus.mediaUrl} alt="Status" fill objectFit="contain" key={currentStatus.id} />
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    {isOwner ? (
                         <div className="flex items-center gap-4">
                            <Button variant="ghost" className="text-white flex items-center gap-2" onClick={() => setShowViewers(true)}>
                                <Eye className="w-5 h-5"/>
                                <span>{currentStatus.viewsCount || 0}</span>
                            </Button>
                             <Button variant="ghost" className="text-white flex items-center gap-2" onClick={() => setShowComments(true)}>
                                <MessageCircle className="w-5 h-5"/>
                                <span>{currentStatus.commentsCount || 0}</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" className="text-white/80 bg-black/50 rounded-full w-full justify-start px-4" onClick={() => setShowComments(true)}>
                                Add a comment...
                            </Button>
                            <Button variant="ghost" size="icon" className="text-white" onClick={handleLike} disabled={isLiking}>
                                <Heart className={cn("w-7 h-7", isLiked && "fill-red-500 text-red-500")} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
