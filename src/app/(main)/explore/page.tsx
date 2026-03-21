'use client';

import { SearchBar } from '@/components/search-bar';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RadioTower } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, query, where, doc, getDoc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { toggleFollow } from '@/firebase/firestore/interactions';

function UserSkeleton() {
    return (
        <div className="flex items-center gap-4 p-2">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
        </div>
    )
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { appUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [suggestedUsers, setSuggestedUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});
  
  const [goLiveMinFollowers, setGoLiveMinFollowers] = useState(1000); // High default
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            let usersQuery;
            if (appUser) {
                usersQuery = query(collection(firestore, 'users'), where('uid', '!=', appUser.uid), limit(20));
            } else {
                usersQuery = query(collection(firestore, 'users'), limit(20));
            }
            const querySnapshot = await getDocs(usersQuery);
            const usersData = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as AppUser));
            setSuggestedUsers(usersData);

            // If logged in, check follow status for each suggested user
            if (appUser) {
                const followingPromises = usersData.map(user => 
                    getDoc(doc(firestore, 'users', appUser.uid, 'following', user.uid))
                );
                const followingSnapshots = await Promise.all(followingPromises);
                const newFollowingStatus: Record<string, boolean> = {};
                followingSnapshots.forEach((snap, index) => {
                    newFollowingStatus[usersData[index].uid] = snap.exists();
                });
                setFollowingStatus(newFollowingStatus);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({ title: "Error", description: "Could not fetch creators.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    fetchUsers();
  }, [firestore, appUser, toast]);

  useEffect(() => {
    const fetchSettings = async () => {
        if (!firestore) return;
        setLoadingSettings(true);
        try {
            const settingsRef = doc(firestore, 'config', 'appSettings');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                setGoLiveMinFollowers(settingsSnap.data().goLiveFollowerMinimum || 1000);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            // Use default value if settings can't be fetched
        } finally {
            setLoadingSettings(false);
        }
    };
    fetchSettings();
  }, [firestore]);
  
  const handleFollowToggle = async (targetUserId: string) => {
    if (!appUser) {
      toast({ title: 'Please log in to follow users.', variant: 'destructive' });
      return;
    }
    
    setFollowLoading(prev => ({...prev, [targetUserId]: true}));
    
    try {
        const newFollowState = await toggleFollow(appUser.uid, targetUserId);
        setFollowingStatus(prev => ({...prev, [targetUserId]: newFollowState}));

        setSuggestedUsers(users => users.map(u => {
            if (u.uid === targetUserId) {
                const currentFollowers = u.followersCount || 0;
                return {
                    ...u,
                    followersCount: currentFollowers + (newFollowState ? 1 : -1)
                }
            }
            return u;
        }));

    } catch (error) {
        console.error("Error toggling follow:", error);
        toast({ title: 'Error', description: 'Could not update follow status.'});
    } finally {
        setFollowLoading(prev => ({...prev, [targetUserId]: false}));
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
        return suggestedUsers;
    }
    return suggestedUsers.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, suggestedUsers]);

  const handleGoLiveClick = () => {
    if (!appUser) {
      toast({ title: 'Please log in to go live.', variant: 'destructive' });
      return;
    }
    if (loadingSettings) {
      toast({ title: 'Checking eligibility...', description: 'Please wait a moment.' });
      return;
    }
    if ((appUser.followersCount || 0) < goLiveMinFollowers) {
      toast({ title: 'Not eligible for Live', description: `You need at least ${goLiveMinFollowers} followers to go live.`, variant: 'destructive'});
    } else {
      router.push('/go-live');
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Explore</h1>
        <Button variant="ghost" onClick={handleGoLiveClick} className="flex items-center gap-2 text-red-500 hover:text-red-500">
          <RadioTower className="w-5 h-5" />
          <span className="font-semibold">Live</span>
        </Button>
      </div>
      <div className="mb-6">
        <SearchBar 
          placeholder="Search for creators..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg">{searchTerm ? 'Search Results' : 'Suggested Creators'}</h2>
        {loading ? (
             <div className="space-y-4">
                {[...Array(5)].map((_, i) => <UserSkeleton key={i} />)}
            </div>
        ) : filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
            <Link href={`/profile/${user.username}`} key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                <UserAvatar user={user} className="w-12 h-12" />
                <div className="flex-1">
                <p className="font-bold">{user.username}</p>
                <p className="text-sm text-muted-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{(user.followersCount || 0).toLocaleString()} followers</p>
                </div>
                <Button 
                  size="sm" 
                  variant={followingStatus[user.uid] ? 'secondary' : 'default'}
                  loading={followLoading[user.uid]}
                  onClick={(e) => { 
                      e.preventDefault();
                      handleFollowToggle(user.uid);
                  }}>
                  {followingStatus[user.uid] ? 'Following' : 'Follow'}
                </Button>
            </Link>
            ))
        ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">{searchTerm ? 'No users found.' : 'No creators to suggest right now.'}</p>
            </div>
         )}
      </div>
    </div>
  );
}
