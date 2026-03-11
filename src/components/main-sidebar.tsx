'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Compass,
  Bell,
  MessageCircle,
  PlusSquare,
  Settings,
} from 'lucide-react';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Logo, LogoIcon } from '@/components/logo';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/lib/data';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const menuItems = [
  { href: '/home', label: 'Home', icon: Home, tooltip: 'Home' },
  { href: '/explore', label: 'Explore', icon: Compass, tooltip: 'Explore' },
  { href: '/notifications', label: 'Notifications', icon: Bell, tooltip: 'Notifications' },
  { href: '/messages', label: 'Messages', icon: MessageCircle, tooltip: 'Messages' },
];

export function MainSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isCollapsed = state === 'collapsed';

  return (
    <>
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
           {isCollapsed ? <LogoIcon className="size-6 shrink-0" /> : <Logo className="h-6" />}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(({ href, label, icon: Icon, tooltip }) => (
            <SidebarMenuItem key={href}>
              <Link href={href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === href}
                  tooltip={{ children: tooltip, side: 'right' }}
                >
                  <a>
                    <Icon />
                    <span>{label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <div className={cn(isCollapsed && 'w-full flex justify-center')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("h-auto w-full justify-start p-2", isCollapsed && "w-auto")}>
                  <UserAvatar user={currentUser} className="shrink-0" />
                  <div className={cn("ml-2 flex flex-col items-start", isCollapsed && "hidden")}>
                    <span className="font-medium">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground">@{currentUser.username}</span>
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
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </SidebarFooter>
    </>
  );
}
