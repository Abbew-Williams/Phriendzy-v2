'use client';

import { UserAvatar } from '@/components/user-avatar';
import { SearchBar } from '@/components/search-bar';
import type { Status, Chat, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, limit, getDocs, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getOrCreateChat } from '@/firebase/firestore/chats';
import { Skeleton } from '@/components/ui/skeleton';

function StatusItem({ user }: { user: User }) {
  return (
    <Link href={`/status/${user.uid}`} className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
      <div className="relative cursor-pointer">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
           <div className="bg-background rounded-full p-0.5">
             <UserAvatar user={user} className="w-full h-full" />
           </div>
        </div>
      </div>
      <p className="text-xs truncate w-full text-center">{user.username}</p>
    </Link>
  )
}

function MyStatus({ hasStatus }: { hasStatus: boolean }) {
  const { appUser } = useUser();
  if (!appUser) return null;

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
      <div className="relative">
        <Link href={hasStatus ? `/status/${appUser.uid}` : `/create-status`}>
          <div className={`w-16 h-16 rounded-full ${hasStatus ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5' : ''}`}>
             <div className={`w-full h-full bg-background rounded-full ${hasStatus ? 'p-0.5' : ''}`}>
               <UserAvatar user={appUser} className="w-full h-full" />
             </div>
          </div>
        </Link>
        {!hasStatus && (
            <Button asChild size="icon" className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full border-2 border-background">
              <Link href="/create-status"><Plus className="w-4 h-4"/></Link>
            </Button>
        )}
      </div>
      <p className="text-xs truncate w-full text-center font-semibold">Your Story</p>
    </div>
  );
}


function ChatItem({ chat }: { chat: Chat }) {
  const { appUser } = useUser();
  const otherUser = chat.participants.find(p => p.uid !== appUser?.uid);

  if (!otherUser) return null;
  
  const timeAgo = chat.lastMessageTimestamp ? formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true }) : '';

  return (
    <Link href={`/messages/${chat.id}`}>
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
    </Link>
  )
}

export default function MessagesPage() {
    const { appUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const [followedUsersWithStatus, setFollowedUsersWithStatus] = useState<User[]>([]);
    const [hasOwnStatus, setHasOwnStatus] = useState(false);
    const [loadingStatuses, setLoadingStatuses] = useState(true);

    useEffect(() => {
        if (!firestore || !appUser) {
            setLoadingStatuses(false);
            return;
        }

        setLoadingStatuses(true);
        
        // --- Fetch followed users with statuses (one-time fetch on load) ---
        const fetchFollowedStatuses = async () => {
            const followingRef = collection(firestore, 'users', appUser.uid, 'following');
            const followingSnapshot = await getDocs(followingRef);
            const followingIds = followingSnapshot.docs.map(doc => doc.id);

            const usersWithStatus: User[] = [];
            const userPromises = followingIds.map(async (id) => {
                const statusQuery = query(
                    collection(firestore, 'users', id, 'statuses'),
                    where('expiresAt', '>', new Date()),
                    limit(1)
                );
                const statusSnapshot = await getDocs(statusQuery);
                if (!statusSnapshot.empty) {
                    const userRef = doc(firestore, 'users', id);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        usersWithStatus.push({ id: userSnap.id, ...userSnap.data() } as User);
                    }
                }
            });
            await Promise.all(userPromises);
            setFollowedUsersWithStatus(usersWithStatus);
        };

        fetchFollowedStatuses();

        // --- Listen for own status in real-time ---
        const ownStatusQuery = query(
            collection(firestore, 'users', appUser.uid, 'statuses'),
            where('expiresAt', '>', new Date())
        );
        const unsubscribeOwnStatus = onSnapshot(ownStatusQuery, (snapshot) => {
            setHasOwnStatus(!snapshot.empty);
            setLoadingStatuses(false); // Set loading to false once we have the status info
        }, (error) => {
            console.error("Error checking own status:", error);
            setLoadingStatuses(false);
        });

        return () => {
            unsubscribeOwnStatus();
        };
    }, [firestore, appUser]);


    // Fetch user's chats
    useEffect(() => {
        if (!firestore || !appUser) return;
        setLoading(true);
        // Removed orderBy to avoid index error. Sorting is now done on the client.
        const q = query(collection(firestore, 'chats'), where('participants', 'array-contains', appUser.uid));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatsData = await Promise.all(snapshot.docs.map(async chatDoc => {
                const data = chatDoc.data();
                
                const participantsData = await Promise.all(
                    data.participants.map(async (userId: string) => {
                        if (userId === appUser.uid) return appUser;
                        const userRef = doc(firestore, 'users', userId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            return { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;
                        }
                        return null;
                    })
                );

                const isUnread = data.lastMessageAuthorId && data.lastMessageAuthorId !== appUser.uid && !data.readBy?.includes(appUser.uid);

                return {
                    id: chatDoc.id,
                    participants: participantsData.filter(p => p) as User[],
                    lastMessage: data.lastMessage || 'No messages yet.',
                    lastMessageTimestamp: data.updatedAt,
                    unreadCount: isUnread ? 1 : 0,
                    updatedAt: data.updatedAt,
                    createdAt: data.createdAt,
                    lastMessageAuthorId: data.lastMessageAuthorId,
                } as Chat;
            }));
            
            // Sort chats by the last message timestamp, newest first.
            const sortedChats = chatsData
                .filter(c => c.participants.length > 1 && c.lastMessageTimestamp)
                .sort((a, b) => {
                    if (!a.lastMessageTimestamp) return 1;
                    if (!b.lastMessageTimestamp) return -1;
                    const timeA = a.lastMessageTimestamp.toDate().getTime();
                    const timeB = b.lastMessageTimestamp.toDate().getTime();
                    return timeB - timeA;
                });

            setChats(sortedChats);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats snapshot:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, appUser]);

    // Search for users
    useEffect(() => {
        if (!firestore || !searchTerm.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        const searchUsers = async () => {
            setIsSearching(true);
            try {
                const usersRef = collection(firestore, 'users');
                const q = query(
                    usersRef,
                    where('username', '>=', searchTerm.toLowerCase()),
                    where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);
                const usersData = querySnapshot.docs
                    .map(doc => ({id: doc.id, uid: doc.id, ...doc.data()} as User))
                    .filter(u => u.uid !== appUser?.uid);
                setSearchResults(usersData);
            } catch (error) {
                console.error("Error searching users:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(() => {
            searchUsers();
        }, 300);

        return () => clearTimeout(debounce);

    }, [searchTerm, firestore, appUser]);
    
    const handleUserSelect = async (targetUser: User) => {
        if (!appUser || !firestore) return;
        
        try {
            const chatId = await getOrCreateChat(appUser.uid, targetUser.uid, firestore);
            router.push(`/messages/${chatId}`);
        } catch (error) {
            console.error("Error creating or getting chat:", error);
        }
    };


  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Messages</h1>
      
      <div className="mb-8">
        <ScrollArea className="w-full whitespace-nowrap">
          {loadingStatuses ? (
            <div className="flex gap-4 pb-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <Skeleton className="h-2 w-12" />
                    </div>
                ))}
            </div>
          ) : (
            <div className="flex gap-4 pb-4">
              <MyStatus hasStatus={hasOwnStatus} />
              {followedUsersWithStatus.map(user => <StatusItem key={user.id} user={user} />)}
            </div>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      <div className="mb-6">
        <SearchBar 
            placeholder="Search for people to message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {searchTerm.trim() ? (
          <div className="space-y-1">
            <h2 className="font-bold text-lg mb-2">Results</h2>
            {isSearching && [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            ))}
            {!isSearching && searchResults.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No users found for &quot;{searchTerm}&quot;</p>
            )}
            {searchResults.map(user => (
                <div key={user.id} onClick={() => handleUserSelect(user)} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <UserAvatar user={user} className="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{user.username}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.name}</p>
                    </div>
                </div>
            ))}
          </div>
      ) : (
        <div className="space-y-1">
            {loading ? (
                [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-2">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))
            ) : chats.length > 0 ? (
                chats.map(chat => <ChatItem key={chat.id} chat={chat} />)
            ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Your conversations will appear here.</p>
                </div>
            )}
        </div>
       )}
    </div>
  );
}
