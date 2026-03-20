'use client';
import { users } from '@/lib/data';
import { SearchBar } from '@/components/search-bar';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RadioTower } from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { appUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleGoLiveClick = () => {
    if (!appUser) {
      toast({ title: 'Please log in to go live.', variant: 'destructive' });
      return;
    }
    if ((appUser.followersCount || 0) < 10) {
      toast({ title: 'Not eligible for Live', description: 'You need at least 10 followers to go live.', variant: 'destructive'});
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
        {filteredUsers.map(user => (
          <Link href={`/profile/${user.username}`} key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
            <UserAvatar user={user} className="w-12 h-12" />
            <div className="flex-1">
              <p className="font-bold">{user.username}</p>
              <p className="text-sm text-muted-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.followersCount.toLocaleString()} followers</p>
            </div>
            <Button size="sm" onClick={(e) => { e.preventDefault(); /* todo: handle follow */}}>Follow</Button>
          </Link>
        ))}
         {filteredUsers.length === 0 && (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No users found.</p>
            </div>
         )}
      </div>
    </div>
  );
}
