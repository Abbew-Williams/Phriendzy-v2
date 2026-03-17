'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { useUser, useFirestore } from "@/firebase";
import { Heart, Send, Gift, X } from "lucide-react";
import Link from 'next/link';
import { users } from '@/lib/data';
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';


// In a real app this would come from a real-time source like a 'live-chats' collection
const mockComments = [
    { id: '1', authorId: 'user-2', text: 'This is awesome! 🚀'},
    { id: '2', authorId: 'user-3', text: 'Great stream!'},
    { id: '3', authorId: 'user-4', text: 'Turn it up! 🔥'},
    { id: '4', authorId: 'user-5', text: 'Hello from the other side!'},
];

const userMap = new Map(users.map(u => [u.id, u]));

export default function LivePage({ params }: { params: { liveId: string } }) {
    const { liveId } = params;
    const { appUser } = useUser();
    const firestore = useFirestore();
    const [comments, setComments] = useState<any[]>([]);

    // This is a placeholder for fetching real-time comments
    useEffect(() => {
        const mappedComments = mockComments.map(c => ({...c, author: userMap.get(c.authorId)}));
        setComments(mappedComments);
        
        // Example of what real-time comments might look like
        /*
        if (!firestore) return;
        const q = query(
            collection(firestore, 'liveStreams', liveId, 'comments'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // logic to fetch user data for authors and set comments
        });
        return () => unsubscribe();
        */
    }, [firestore, liveId]);

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
                            <UserAvatar user={comment.author} className="w-6 h-6"/>
                            <div>
                                <span className="font-semibold text-muted-foreground mr-2">{comment.author.username}</span>
                                <span>{comment.text}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                        <Input placeholder="Send a message..." className="flex-1 bg-muted border-none"/>
                        <Button size="icon" variant="ghost"><Send className="w-5 h-5"/></Button>
                    </div>
                     <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost"><Gift className="w-6 h-6 text-pink-500"/></Button>
                        <Button size="icon" variant="ghost"><Heart className="w-6 h-6 text-red-500"/></Button>
                    </div>
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
                    <UserAvatar user={users[1]} className="w-10 h-10 border-2 border-white"/>
                    <div>
                        <p className="font-bold">{users[1].username}</p>
                        <p className="text-xs">1.2K viewers</p>
                    </div>
                 </div>
            </div>

        </div>
    );
}
