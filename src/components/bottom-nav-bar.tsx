'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Bell, User, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border/50 md:hidden">
      <div className="grid h-full grid-cols-5 mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex flex-col items-center justify-center px-5 hover:bg-accent/50 transition-colors group',
              pathname === item.href
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
