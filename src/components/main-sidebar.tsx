'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Compass,
  Bell,
  MessageCircle,
  LogOut,
  Settings,
  User,
  Loader2,
  PlusSquare,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Logo, LogoIcon } from '@/components/logo';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { signOut } from '@/firebase/auth/auth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import { useUnreadCounts } from '@/hooks/use-unread-counts';

const mockUser = {
    id: 'temp-user',
    uid: 'temp-user',
    username: 'Guest',
    firstName: 'Guest',
    lastName: 'User',
    avatarUrl: '',
    bio: '',
    followersCount: 0,
    followingCount: 0,
};

export function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { appUser, loading } = useUser();
  const { notificationCount, messageCount } = useUnreadCounts();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isCollapsed = state === 'collapsed';

  const menuItems = [
    { href: '/home', label: 'Home', icon: Home, tooltip: 'Home' },
    { href: '/explore', label: 'Explore', icon: Compass, tooltip: 'Explore' },
    { href: '/create', label: 'Create', icon: PlusSquare, tooltip: 'Create' },
    { href: '/messages', label: 'Messages', icon: MessageCircle, tooltip: 'Messages', count: messageCount },
    { href: '/notifications', label: 'Notifications', icon: Bell, tooltip: 'Notifications', count: notificationCount },
    { href: '/profile', label: 'Profile', icon: User, tooltip: 'Profile' },
  ];
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push('/login');
  };
  
  const user = appUser || mockUser;
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return (
    <>
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
           {isCollapsed ? <LogoIcon className="size-6 shrink-0" /> : <Logo className="h-6" />}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(({ href, label, icon: Icon, tooltip, count }) => (
            <SidebarMenuItem key={href}>
               <SidebarMenuButton
                asChild
                isActive={pathname === href}
                tooltip={{ children: tooltip, side: 'right' }}
              >
                <Link href={href}>
                  <Icon />
                  <span>{label}</span>
                  {appUser && typeof count === 'number' && count > 0 && <SidebarMenuBadge>{count > 9 ? '9+' : count}</SidebarMenuBadge>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {appUser?.role === 'admin' && (
             <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin')}
                    tooltip={{ children: 'Admin', side: 'right' }}
                >
                    <Link href="/admin">
                        <Shield />
                        <span>Admin</span>
                    </Link>
                </SidebarMenuButton>
             </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <div className={cn(isCollapsed && 'w-full flex justify-center')}>
            {loading ? (
                <div className={cn("flex items-center p-2", isCollapsed && "w-auto justify-center")}>
                    <Skeleton className="h-10 w-10 rounded-full" />
                    {!isCollapsed && <div className="ml-2 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                    </div>}
                </div>
            ) : appUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-auto w-full justify-start p-2", isCollapsed && "w-auto")}>
                      <UserAvatar user={user} className="shrink-0" />
                      <div className={cn("ml-2 flex flex-col items-start", isCollapsed && "hidden")}>
                        <span className="font-medium">{userName}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                        {isLoggingOut ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                        )}
                        <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button asChild className={cn(isCollapsed && "w-auto")}>
                    <Link href="/login">Login</Link>
                </Button>
            )}
        </div>
      </SidebarFooter>
    </>
  );
}