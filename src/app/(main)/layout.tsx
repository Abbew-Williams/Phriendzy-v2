'use client';

import { usePathname } from 'next/navigation';
import { MainSidebar } from '@/components/main-sidebar';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { cn } from '@/lib/utils';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === '/home';

  return (
    <SidebarProvider>
      <div className="md:grid md:grid-cols-[auto_1fr] min-h-screen">
        {/* Sidebar for Desktop */}
        <div className="hidden md:flex">
            <Sidebar collapsible="icon" className="border-r border-border/50">
            <MainSidebar />
            </Sidebar>
        </div>

        <main className={cn(isHomePage && 'h-screen')}>
            {children}
        </main>
        
      </div>
      
      {/* Mobile nav and toaster */}
      <BottomNavBar />
      <Toaster />
    </SidebarProvider>
  );
}
