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

const StatusViewersSheet = ({ authorId, statusId }: { authorId: string, statusId: string }) => {
    const firestore = useFirestore();
    const [viewers, setViewers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
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
    }, [firestore, authorId, statusId]);

    return (
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
    )
}

const StatusCommentsSheet = ({ authorId, statusId, onCommentAdded }: { authorId: string, statusId: string, onCommentAdded: () => void }) => {
    const { appUser } = useUser();
    const firestore = useFirestore();
    const [comments, setComments] = useState<StatusComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (!firestore) return;
        const commentsColRef = collection(firestore, 'users', authorId, 'statuses', statusId, 'comments');
        const q = query(commentsColRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const commentsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const userRef = doc(firestore, 'users', data.authorId);
                const userSnap = await getDoc(userRef);
                return userSnap.exists() ? { id: docSnap.id, author: userSnap.data(), ...data } as StatusComment : null;
            }));
            setComments(commentsData.filter(Boolean) as StatusComment[]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, authorId, statusId]);

    const handlePostComment = async () => {
        if (!appUser || !newComment.trim()) return;
        const tempComment = newComment;
        setNewComment('');

        const commentsColRef = collection(firestore, 'users', authorId, 'statuses', statusId, 'comments');
        const statusRef = doc(firestore, 'users', authorId, 'statuses', statusId);
        
        const batch = writeBatch(firestore);
        batch.set(doc(commentsColRef), {
            authorId: appUser.uid,
            text: tempComment,
            createdAt: new Date(),
        });
        batch.update(statusRef, { commentsCount: increment(1) });
        await batch.commit();
        onCommentAdded();
    }

    return (
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
                     <div key={comment.id} className="flex items-start gap-3 my-4">
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
                ))}
            </ScrollArea>
             <SheetFooter className="p-4 border-t mt-auto bg-background sm:justify-center">
                <div className="flex items-center gap-2 w-full">
                    <UserAvatar user={appUser} className="w-8 h-8" />
                    <Input 
                        placeholder="Add a comment..." 
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
    );
}

export default function StatusPage() {
    const { userId } = useParams() as { userId: string };
    const { appUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [statuses, setStatuses] = useState<Status[]>([]);
    const [author, setAuthor] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const [showComments, setShowComments] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressTimerRef = useRef<NodeJS.Timeout>();

    const nextStatus = useCallback(() => {
        setCurrentIndex(i => {
            if (i < statuses.length - 1) return i + 1;
            router.back();
            return i;
        });
    }, [statuses.length, router]);

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!firestore) return;
            setLoading(true);

            const authorRef = doc(firestore, 'users', userId);
            const authorSnap = await getDoc(authorRef);
            if (authorSnap.exists()) {
                setAuthor(authorSnap.data() as User);
            }

            const q = query(
                collection(firestore, 'users', userId, 'statuses'),
                where('expiresAt', '>', new Date()),
                orderBy('expiresAt', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const statusesData = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id, author: authorSnap.data() } as Status));
            setStatuses(statusesData);
            setLoading(false);
        };
        fetchStatuses();
    }, [firestore, userId]);
    
    const currentStatus = statuses[currentIndex];

    // Effect for progress bar and auto-advance
    useEffect(() => {
        if (!currentStatus) return;

        // Mark as viewed
        if (appUser) addStatusView(firestore, currentStatus.authorId, currentStatus.id, appUser.uid);
        
        setProgress(0);
        clearInterval(progressTimerRef.current);
        const duration = currentStatus.mediaType === 'image' ? 5000 : (videoRef.current?.duration || 0) * 1000;
        
        if (duration > 0) {
            const startTime = Date.now();
            progressTimerRef.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const newProgress = Math.min(100, (elapsed / duration) * 100);
                setProgress(newProgress);
                if (newProgress >= 100) {
                    nextStatus();
                }
            }, 100);
        } else if (currentStatus.mediaType === 'video' && videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
                const videoDuration = (videoRef.current?.duration || 0) * 1000;
                if (videoDuration > 0) {
                    const startTime = Date.now();
                    progressTimerRef.current = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        const newProgress = Math.min(100, (elapsed / videoDuration) * 100);
                        setProgress(newProgress);
                        if (newProgress >= 100) {
                            nextStatus();
                        }
                    }, 100);
                }
            };
        }


        return () => clearInterval(progressTimerRef.current);
    }, [currentIndex, currentStatus, appUser, firestore, nextStatus]);

    if (loading) {
        return <div className="h-screen w-screen bg-black flex items-center justify-center"><Skeleton className="w-full h-full" /></div>
    }
    
    if (!loading && statuses.length === 0) {
        router.back();
        return null;
    }

    const isOwner = appUser?.uid === currentStatus?.authorId;

    return (
        <Sheet open={true} onOpenChange={(open) => !open && router.back()}>
            {currentStatus && <StatusCommentsSheet authorId={currentStatus.authorId} statusId={currentStatus.id} onCommentAdded={() => {}} />}
            {isOwner && currentStatus && <StatusViewersSheet authorId={currentStatus.authorId} statusId={currentStatus.id} />}
            <div className="h-screen w-screen bg-black flex items-center justify-center" onClick={(e) => {
                const { clientX, target } = e;
                const { offsetWidth } = target as HTMLElement;
                if (clientX < offsetWidth / 3) { // Previous
                    setCurrentIndex(i => Math.max(0, i - 1));
                } else { // Next
                    nextStatus();
                }
            }}>
                <div className="absolute top-0 left-0 right-0 p-2 z-10">
                    <div className="flex items-center gap-1">
                        {statuses.map((s, i) => (
                            <Progress key={s.id} value={i < currentIndex ? 100 : (i === currentIndex ? progress : 0)} className="h-1 flex-1" />
                        ))}
                    </div>
                     <div className="flex items-center justify-between mt-2 text-white">
                        <div className="flex items-center gap-2">
                            <UserAvatar user={author} className="w-8 h-8" />
                            <span className="font-bold text-sm">{author?.username}</span>
                            <span className="text-xs text-neutral-300">{currentStatus && formatDistanceToNow(currentStatus.createdAt.toDate(), { addSuffix: true })}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => router.back()}><X /></Button>
                    </div>
                </div>

                {currentStatus?.mediaType === 'video' ? (
                    <video ref={videoRef} src={currentStatus.mediaUrl} autoPlay playsInline className="max-h-screen max-w-screen object-contain" onEnded={nextStatus} />
                ) : (
                    <Image src={currentStatus.mediaUrl} alt="Status" fill objectFit="contain" />
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    {isOwner ? (
                         <Button variant="ghost" className="text-white flex items-center gap-2" onClick={() => setShowViewers(true)}>
                            <Eye className="w-5 h-5"/>
                            <span>{currentStatus.viewsCount}</span>
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Input placeholder="Reply..." className="bg-black/50 text-white border-white/50" />
                            <Button variant="ghost" size="icon" className="text-white"><Heart className="w-7 h-7" /></Button>
                            <Button variant="ghost" size="icon" className="text-white"><Send className="w-7 h-7" /></Button>
                        </div>
                    )}
                </div>
            </div>
        </Sheet>
    );
}