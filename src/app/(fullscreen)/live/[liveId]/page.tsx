'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { useUser, useFirestore } from "@/firebase";
import { Heart, Send, Gift, X } from "lucide-react";
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import type { LiveStream, LiveStreamComment, User } from '@/lib/types';
import { addLiveComment, endLiveStream } from '@/firebase/firestore/live';
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function LivePage({ params }: { params: { liveId: string } }) {
    const { liveId } = params;
    const { appUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
    const [comments, setComments] = useState<LiveStreamComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [isEnding, setIsEnding] = useState(false);

    const isHost = useMemo(() => liveStream?.hostId === appUser?.uid, [liveStream, appUser]);

    // Fetch Live Stream document
    useEffect(() => {
        if (!firestore || !liveId) return;
        const streamRef = doc(firestore, 'liveStreams', liveId);
        const unsubscribe = onSnapshot(streamRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as LiveStream;
                setLiveStream({ ...data, id: docSnap.id });
                if (data.status === 'ended') {
                    // Redirect or show an "ended" message if the stream is over
                    router.push('/explore');
                }
            } else {
                // Handle stream not found
                router.push('/explore');
            }
        });
        return () => unsubscribe();
    }, [firestore, liveId, router]);

    // Fetch Live Stream comments
    useEffect(() => {
        if (!firestore || !liveId) return;
        const q = query(
            collection(firestore, 'liveStreams', liveId, 'comments'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveStreamComment));
            setComments(newComments.reverse());
        });
        return () => unsubscribe();
    }, [firestore, liveId]);
    
    const handleSendComment = async () => {
        if (!appUser || !commentText.trim() || !liveStream) return;
        await addLiveComment(liveStream.id, {
            authorId: appUser.uid,
            authorUsername: appUser.username,
            authorAvatarUrl: appUser.avatarUrl,
            text: commentText,
        });
        setCommentText('');
    };

    const handleEndStream = async () => {
        if (!isHost || !liveStream) return;
        setIsEnding(true);
        await endLiveStream(liveStream.id);
        // router will redirect based on the status change from the snapshot listener
    };

    return (
        <div className="flex h-screen bg-black text-white md:flex-row flex-col-reverse">
            {/* Chat & Interaction Sidebar */}
            <div className="w-full md:w-80 bg-background border-t md:border-t-0 md:border-l border-border flex flex-col">
                <div className="p-4 border-b border-border">
                    <h2 className="font-bold text-center">Live Chat</h2>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-2 text-sm">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button>
                                        <UserAvatar user={{id: comment.authorId, uid: comment.authorId, username: comment.authorUsername, avatarUrl: comment.authorAvatarUrl, bio: '', followersCount: 0, followingCount: 0 }} className="w-6 h-6"/>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                   {isHost && appUser?.uid !== comment.authorId && (
                                        <Button size="sm" variant="outline">Invite to Live</Button>
                                   )}
                                   {!isHost && (
                                       <Button asChild size="sm" variant="outline"><Link href={`/profile/${comment.authorUsername}`}>View Profile</Link></Button>
                                   )}
                                </PopoverContent>
                            </Popover>
                            <div>
                                <span className="font-semibold text-muted-foreground mr-2">{comment.authorUsername}</span>
                                <span>{comment.text}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-border space-y-2">
                    {isHost ? (
                        <Button className="w-full" variant="destructive" onClick={handleEndStream} loading={isEnding}>End Stream</Button>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="Send a message..." 
                                    className="flex-1 bg-muted border-none"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                                />
                                <Button size="icon" variant="ghost" onClick={handleSendComment} disabled={!commentText.trim()}><Send className="w-5 h-5"/></Button>
                            </div>
                             <div className="flex items-center justify-end gap-2">
                                <Button size="icon" variant="ghost"><Gift className="w-6 h-6 text-pink-500"/></Button>
                                <Button size="icon" variant="ghost"><Heart className="w-6 h-6 text-red-500"/></Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Live Stream Video */}
            <div className="flex-1 flex items-center justify-center bg-gray-900 relative">
                 <Link href="/explore" className="absolute top-4 left-4 z-10 bg-black/50 rounded-full">
                    <Button variant="ghost" size="icon"><X/></Button>
                 </Link>
                <video
                    src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                />
                 <div className="absolute top-4 right-4 bg-red-600 px-3 py-1 rounded-md text-sm font-bold flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    LIVE
                </div>
                 <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    {liveStream?.host && <UserAvatar user={liveStream.host} className="w-10 h-10 border-2 border-white"/>}
                    <div>
                        <p className="font-bold">{liveStream?.title}</p>
                        <p className="text-xs">{liveStream?.viewerCount || 1} viewers</p>
                    </div>
                 </div>
            </div>
        </div>
    );
}
