'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import type { User } from '@/lib/types';
import { collection, doc, getDoc, getDocs, onSnapshot, Firestore } from 'firebase/firestore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { toggleFollow } from '@/firebase/firestore/interactions';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// To avoid prop-drilling, I'll fetch the currentUser's following list inside this component
const useFollowingList = (currentUserId?: string) => {
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const firestore = useFirestore();

    useEffect(() => {
        if (!firestore || !currentUserId) return;
        const followingRef = collection(firestore, 'users', currentUserId, 'following');
        const unsubscribe = onSnapshot(followingRef, (snapshot) => {
            const ids = new Set(snapshot.docs.map(doc => doc.id));
            setFollowingIds(ids);
        });
        return () => unsubscribe();
    }, [firestore, currentUserId]);

    return followingIds;
};

const FollowListItem = ({ user, currentUserId, isFollowing, onToggleFollow }: { user: User, currentUserId?: string, isFollowing: boolean, onToggleFollow: (targetUserId: string) => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);
        await onToggleFollow(user.uid);
        setIsLoading(false);
    }
    
    return (
        <div key={user.id} className="flex items-center gap-3">
            <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1">
                <UserAvatar user={user} />
                <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.name}</p>
                </div>
            </Link>
            {currentUserId && currentUserId !== user.uid && (
                <Button size="sm" variant={isFollowing ? 'secondary' : 'default'} onClick={handleFollow} loading={isLoading}>
                    {isFollowing ? 'Following' : 'Follow'}
                </Button>
            )}
        </div>
    )
}

export const FollowSheet = ({ open, onOpenChange, userId, type }: { open: boolean; onOpenChange: (open: boolean) => void; userId: string; type: 'followers' | 'following' }) => {
    const firestore = useFirestore();
    const { appUser } = useUser();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const currentUserFollowingIds = useFollowingList(appUser?.uid);

    useEffect(() => {
        if (!firestore || !open) return;

        setLoading(true);
        const colRef = collection(firestore, 'users', userId, type);
        const unsubscribe = onSnapshot(colRef, async (snapshot) => {
            const userIds = snapshot.docs.map(doc => doc.id);
            const usersDataPromises = userIds.map(async (id) => {
                const userRef = doc(firestore, 'users', id);
                const userSnap = await getDoc(userRef);
                return userSnap.exists() ? { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User : null;
            });
            const usersData = (await Promise.all(usersDataPromises)).filter(Boolean) as User[];
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, userId, type, open]);

    const handleToggleFollow = async (targetUserId: string) => {
        if (!appUser || !firestore) {
            toast({ title: "Please login to follow users.", variant: "destructive" });
            return;
        }
        try {
            await toggleFollow(firestore, appUser.uid, targetUserId);
        } catch (e) {
            console.error(e);
            toast({ title: "Something went wrong.", variant: "destructive" });
        }
    };
    
    const title = type.charAt(0).toUpperCase() + type.slice(1);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col">
                <SheetHeader className="text-center">
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    {loading && <div className="p-4 space-y-4">
                        {[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-8 w-20 rounded-md" /></div>)}
                    </div>}
                    {!loading && users.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No {type} yet.</p></div>}
                    <div className="space-y-4 py-4">
                        {users.map(user => (
                            <FollowListItem 
                                key={user.id}
                                user={user}
                                currentUserId={appUser?.uid}
                                isFollowing={currentUserFollowingIds.has(user.uid)}
                                onToggleFollow={handleToggleFollow}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
