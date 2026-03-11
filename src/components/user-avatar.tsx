'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { AvatarProps } from '@radix-ui/react-avatar';

interface UserAvatarProps extends AvatarProps {
  user?: User | null;
}

export function UserAvatar({ user, className, ...props }: UserAvatarProps) {
  if (!user) {
    // Render a placeholder or null if user is not available
    const fallback = 'G';
     return (
      <Avatar className={cn('h-8 w-8', className)} {...props}>
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    );
  }

  const fallback = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('') || user.username?.[0] || 'U';

  return (
    <Avatar className={cn('h-8 w-8', className)} {...props}>
      <AvatarImage src={user.avatarUrl} alt={`${user.username}'s avatar`} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
