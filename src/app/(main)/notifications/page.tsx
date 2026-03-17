'use client';
import { mockNotifications } from '@/lib/data';
import type { Notification } from '@/lib/types';
import { UserAvatar } from '@/components/user-avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

function NotificationItem({ notification }: { notification: Notification }) {
  const timeAgo = notification.createdAt ? formatDistanceToNow(notification.createdAt, { addSuffix: true }) : '';

  const renderContent = () => {
    switch(notification.type) {
      case 'follow':
        return <>started following you.</>;
      case 'like':
        return <>liked your post.</>;
      case 'comment':
        return <>commented: <span className="text-white/80">{notification.commentText}</span></>;
      default:
        return null;
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted rounded-lg">
      <Link href={`/profile/${notification.fromUser.username}`}>
        <UserAvatar user={notification.fromUser} />
      </Link>
      <div className="flex-1 text-sm">
        <p>
          <Link href={`/profile/${notification.fromUser.username}`} className="font-bold">{notification.fromUser.username}</Link>
          <span className="text-muted-foreground"> {renderContent()} </span>
          <span className="text-muted-foreground/80 ml-2">{timeAgo}</span>
        </p>
      </div>
       {notification.type === 'follow' && <Button size="sm">Follow Back</Button>}
       {notification.post && (
        <Link href="#">
           <Image src={notification.post.mediaUrl} alt="post" width={44} height={44} className="rounded-md object-cover aspect-square" />
        </Link>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Notifications</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <div className="divide-y divide-border">
            {mockNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
          </div>
        </TabsContent>
         <TabsContent value="mentions" className="mt-4">
           <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
             <p className="text-muted-foreground">You have no new mentions.</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
