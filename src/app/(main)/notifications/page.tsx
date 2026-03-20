'use client';
import type { Notification } from '@/lib/types';
import { UserAvatar } from '@/components/user-avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { toggleFollow } from '@/firebase/firestore/interactions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


function NotificationItem({ notification, currentUser }: { notification: Notification; currentUser: AppUser | null }) {
  const [timeAgo, setTimeAgo] = useState('');
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState<boolean | undefined>(undefined);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Check initial follow status
  useEffect(() => {
    if (!currentUser || !notification.fromUser || notification.type !== 'follow') return;
    const checkFollow = async () => {
        const firestore = useFirestore();
        if (!firestore) return;
        const followRef = doc(firestore, 'users', currentUser.uid, 'following', notification.fromUser.uid);
        const followSnap = await getDoc(followRef);
        setIsFollowing(followSnap.exists());
    }
    checkFollow();
  }, [currentUser, notification]);
  
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    if (!currentUser || !notification.fromUser) return;
    setIsFollowLoading(true);
    try {
        const newFollowState = await toggleFollow(currentUser.uid, notification.fromUser.uid);
        setIsFollowing(newFollowState);
    } catch {
        toast({ title: 'Error', description: 'Could not update follow status.'});
    } finally {
        setIsFollowLoading(false);
    }
  }

  useEffect(() => {
    if (notification.createdAt) {
      let date: Date;
      if (typeof notification.createdAt.toDate === 'function') {
        date = notification.createdAt.toDate();
      } else {
        date = new Date(notification.createdAt);
      }
      setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
    }
  }, [notification.createdAt]);


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
  
  const notificationLink = notification.type === 'follow'
    ? `/profile/${notification.fromUser.username}`
    : `/post/${notification.postId}`;


  return (
    <Link href={notificationLink} className="flex items-center gap-4 p-4 hover:bg-muted rounded-lg">
      <UserAvatar user={notification.fromUser} />
      <div className="flex-1 text-sm">
        <p>
          <span className="font-bold">{notification.fromUser.username}</span>
          <span className="text-muted-foreground"> {renderContent()} </span>
          {timeAgo && <span className="text-muted-foreground/80 ml-2">{timeAgo}</span>}
        </p>
      </div>
       {notification.type === 'follow' && isFollowing !== undefined && (
            <Button size="sm" loading={isFollowLoading} onClick={handleFollowToggle}>
                {isFollowing ? 'Following' : 'Follow Back'}
            </Button>
        )}
       {notification.post && (
           notification.post.mediaType === 'video' ? (
                <div className="w-11 h-11 bg-muted rounded-md flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                </div>
            ) : (
                <Image src={notification.post.mediaUrl} alt="post" width={44} height={44} className="rounded-md object-cover aspect-square" />
            )
      )}
    </Link>
  )
}

function NotificationSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="w-11 h-11 rounded-md" />
        </div>
    )
}

export default function NotificationsPage() {
  const { appUser } = useUser();
  const firestore = useFirestore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !appUser?.uid) {
        if(appUser === null) setLoading(false);
        return;
    };
    setLoading(true);
    const q = query(
        collection(firestore, 'users', appUser.uid, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(30)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const notifsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            if (data.fromUserId === appUser.uid) return null;
            
            const fromUserRef = doc(firestore, 'users', data.fromUserId);
            const fromUserSnap = await getDoc(fromUserRef);
            const fromUser = fromUserSnap.exists() ? { uid: fromUserSnap.id, id: fromUserSnap.id, ...fromUserSnap.data() } as AppUser : null;

            let post = null;
            if (data.postId) {
                const postRef = doc(firestore, 'posts', data.postId);
                const postSnap = await getDoc(postRef);
                if (postSnap.exists()) {
                    const postData = postSnap.data();
                    // We don't need the post's author here, simplifying the fetch
                    post = { id: postSnap.id, ...postData };
                }
            }

            if (!fromUser) return null;

            return {
                id: docSnap.id,
                ...data,
                fromUser,
                post,
            } as Notification;
        }));

        setNotifications(notifsData.filter(n => n !== null) as Notification[]);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, appUser]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Notifications</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {loading ? (
             <div className="divide-y divide-border">
                {[...Array(5)].map((_, i) => <NotificationSkeleton key={i} />)}
             </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map(n => <NotificationItem key={n.id} notification={n} currentUser={appUser}/>)}
            </div>
          ) : (
             <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
               <p className="text-muted-foreground">You have no new notifications.</p>
             </div>
          )}
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
