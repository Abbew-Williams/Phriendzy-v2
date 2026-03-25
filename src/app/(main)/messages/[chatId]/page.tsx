'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import type { Chat, Message, User } from '@/lib/types';
import Link from 'next/link';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function ChatMessage({ message, author, isSender }: { message: Message, author: User, isSender: boolean }) {
    return (
        <div className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
            {!isSender && <UserAvatar user={author} className="w-6 h-6 self-start"/>}
            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p>{message.text}</p>
                {message.createdAt?.toDate && (
                    <p className={`text-xs mt-1 ${isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(message.createdAt.toDate(), 'p')}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function ChatPage() {
  const { chatId } = useParams() as { chatId: string };
  const { appUser, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = chat?.participants.find(p => p.uid !== appUser?.uid);

  // Effect to fetch chat and message data
  useEffect(() => {
    if (!firestore || !chatId || !appUser) return;

    setLoading(true);
    const chatRef = doc(firestore, 'chats', chatId);

    const unsubscribeChat = onSnapshot(chatRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure current user is part of the chat
        if (!data.participants.includes(appUser.uid)) {
            router.push('/messages');
            return;
        }

        const participantsData = await Promise.all(
          data.participants.map(async (userId: string) => {
            if (userId === appUser.uid) return appUser;
            const userRef = doc(firestore, 'users', userId);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User : null;
          })
        );
        setChat({
          id: docSnap.id,
          participants: participantsData.filter(p => p) as User[],
          ...data,
        } as Chat);
      } else {
        router.push('/messages');
      }
      setLoading(false);
    });

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [firestore, chatId, appUser, router]);
  
  // Effect to mark chat as read
  useEffect(() => {
    if (firestore && chatId && appUser && chat) {
      // If the last message is from the other user and we haven't read it yet
      if (chat.lastMessageAuthorId && chat.lastMessageAuthorId !== appUser.uid && !chat.readBy?.includes(appUser.uid)) {
        const chatRef = doc(firestore, 'chats', chatId);
        updateDoc(chatRef, {
          readBy: arrayUnion(appUser.uid)
        }).catch(err => {
          // Log error but don't bother the user.
          console.error("Failed to mark chat as read:", err);
        });
      }
    }
  }, [chat, firestore, chatId, appUser]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView();
  }, [messages]);


  const handleSendMessage = async () => {
    if (!firestore || !chatId || !appUser || !newMessage.trim()) return;

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const chatRef = doc(firestore, 'chats', chatId);

    try {
        const text = newMessage;
        setNewMessage('');
        
        await addDoc(messagesRef, {
            authorId: appUser.uid,
            text: text,
            createdAt: serverTimestamp(),
        });

        await updateDoc(chatRef, {
            lastMessage: text,
            updatedAt: serverTimestamp(),
            lastMessageAuthorId: appUser.uid,
            readBy: [appUser.uid],
        });
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  if (loading || userLoading) {
    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center gap-4 p-4 border-b">
                <Skeleton className="h-10 w-10" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-6 w-24" />
                </div>
            </header>
            <main className="flex-1 p-4 space-y-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-16 w-64 ml-auto" />
                <Skeleton className="h-12 w-40" />
            </main>
             <footer className="p-4 border-t">
                <Skeleton className="h-10 w-full" />
            </footer>
        </div>
    )
  }

  return (
    <div className="h-[calc(100vh-5rem)] md:h-full flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push('/messages')}>
          <ArrowLeft />
        </Button>
        {otherUser && (
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-2">
            <UserAvatar user={otherUser} />
            <h2 className="font-bold">{otherUser.username}</h2>
          </Link>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isSender = msg.authorId === appUser?.uid;
          const author = isSender ? appUser : otherUser;
          if (!author) return null;
          return <ChatMessage key={msg.id} message={msg} author={author} isSender={isSender} />
        })}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t mt-auto">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
          />
          <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim() || userLoading}>
            <Send />
          </Button>
        </div>
      </footer>
    </div>
  );
}
