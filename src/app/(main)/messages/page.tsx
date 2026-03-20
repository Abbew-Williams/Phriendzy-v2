'use client';

import { UserAvatar } from '@/components/user-avatar';
import { SearchBar } from '@/components/search-bar';
import type { Status, Chat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

function StatusItem({ status }: { status: Status }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
      <div className="relative cursor-pointer">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
           <div className="bg-background rounded-full p-0.5">
             <UserAvatar user={status.author} className="w-full h-full" />
           </div>
        </div>
      </div>
      <p className="text-xs truncate w-full text-center">{status.author.username}</p>
    </div>
  )
}

function MyStatus() {
  const { appUser } = useUser();
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
      <Link href="/create-status">
        <div className="relative cursor-pointer">
          <UserAvatar user={appUser} className="w-16 h-16" />
          <Button size="icon" className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full border-2 border-background">
            <Plus className="w-4 h-4"/>
          </Button>
        </div>
      </Link>
      <p className="text-xs truncate w-full text-center font-semibold">Your Story</p>
    </div>
  );
}

function ChatItem({ chat }: { chat: Chat }) {
  const { appUser } = useUser();
  const otherUser = chat.participants.find(p => p.id !== appUser?.uid);

  if (!otherUser) return null;
  
  const timeAgo = chat.lastMessageTimestamp ? formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true }) : '';

  return (
    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted cursor-pointer">
      <UserAvatar user={otherUser} className="w-12 h-12" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <p className="font-bold truncate">{otherUser.username}</p>
          <p className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</p>
        </div>
        <div className="flex justify-between items-center">
            <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{chat.lastMessage}</p>
            {chat.unreadCount > 0 && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-2"></div>}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
    const { appUser } = useUser();
    const firestore = useFirestore();
    const [chats, setChats] = useState<Chat[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user's own active statuses
    useEffect(() => {
        if (!firestore || !appUser) return;

        const q = query(
            collection(firestore, 'users', appUser.uid, 'statuses'),
            where('expiresAt', '>', new Date()),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userStatuses = snapshot.docs.map(doc => ({
                id: doc.id,
                author: appUser,
                ...doc.data()
            } as Status));
            // In a real app, you'd fetch statuses from followed users too.
            setStatuses(userStatuses); 
        });

        return () => unsubscribe();

    }, [firestore, appUser])

    // Fetch user's chats
    useEffect(() => {
        if (!firestore || !appUser) return;
        setLoading(true);
        const q = query(collection(firestore, 'chats'), where('participants', 'array-contains', appUser.uid));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatsData = await Promise.all(snapshot.docs.map(async chatDoc => {
                const data = chatDoc.data();
                
                const participantsData = await Promise.all(
                    data.participants.map(async (userId: string) => {
                        if (userId === appUser.uid) return appUser;
                        const userRef = doc(firestore, 'users', userId);
                        const userSnap = await getDoc(userRef);
                        return userSnap.data();
                    })
                );

                return {
                    id: chatDoc.id,
                    participants: participantsData,
                    lastMessage: data.lastMessage || 'No messages yet.',
                    lastMessageTimestamp: data.updatedAt,
                    unreadCount: 0, // Placeholder
                } as Chat;
            }));
            setChats(chatsData);
            setLoading(false);
        }));

        return () => unsubscribe();
    }, [firestore, appUser]);


  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Messages</h1>
      
      <div className="mb-8">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            <MyStatus />
            {statuses.map(status => <StatusItem key={status.id} status={status} />)}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      <div className="mb-6">
        <SearchBar placeholder="Search messages" />
      </div>

      <div className="space-y-1">
        {chats.map(chat => <ChatItem key={chat.id} chat={chat} />)}
      </div>
       {chats.length === 0 && !loading && (
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Your conversations will appear here.</p>
        </div>
       )}
    </div>
  );
}
