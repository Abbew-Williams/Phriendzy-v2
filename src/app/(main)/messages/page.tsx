'use client';

import { UserAvatar } from '@/components/user-avatar';
import { SearchBar } from '@/components/search-bar';
import { mockStatuses, mockChats } from '@/lib/data';
import type { Status, Chat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/firebase';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
      <div className="relative cursor-pointer">
        <UserAvatar user={appUser} className="w-16 h-16" />
        <Button size="icon" className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full border-2 border-background">
          <Plus className="w-4 h-4"/>
        </Button>
      </div>
      <p className="text-xs truncate w-full text-center font-semibold">Your Story</p>
    </div>
  );
}

function ChatItem({ chat }: { chat: Chat }) {
  const { appUser } = useUser();
  const otherUser = chat.participants.find(p => p.id !== appUser?.uid);

  if (!otherUser) return null;
  
  const timeAgo = formatDistanceToNow(chat.lastMessageTimestamp, { addSuffix: true });

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
  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Messages</h1>
      
      <div className="mb-8">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            <MyStatus />
            {mockStatuses.map(status => <StatusItem key={status.id} status={status} />)}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      <div className="mb-6">
        <SearchBar placeholder="Search messages" />
      </div>

      <div className="space-y-1">
        {mockChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}
      </div>
       {mockChats.length === 0 && (
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Your conversations will appear here.</p>
        </div>
       )}
    </div>
  );
}
