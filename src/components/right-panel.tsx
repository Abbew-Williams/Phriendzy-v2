'use client';

import { users } from '@/lib/data';
import { UserAvatar } from './user-avatar';
import { Button } from './ui/button';
import Link from 'next/link';

export function RightPanel() {
    // Exclude current user from suggestions, and take top 5
    const suggestedUsers = users.slice(1, 6);
    
    return (
        <div className="p-4 space-y-6">
            <div>
                <h2 className="text-lg font-semibold mb-4">Suggested for you</h2>
                <div className="space-y-4">
                    {suggestedUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-3">
                            <UserAvatar user={user} className="w-10 h-10" />
                            <div className="flex-1">
                                <Link href="#" className="font-semibold text-sm hover:underline">{user.username}</Link>
                                <p className="text-xs text-muted-foreground">Suggested for you</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary text-xs">Follow</Button>
                        </div>
                    ))}
                </div>
            </div>
            {/* Placeholder for other content like trending topics */}
        </div>
    )
}
