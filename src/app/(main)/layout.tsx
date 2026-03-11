import { MainSidebar } from '@/components/main-sidebar';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { BottomNavBar } from '@/components/bottom-nav-bar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r border-border/50">
          <MainSidebar />
        </Sidebar>
        <SidebarInset>
          <main className="flex-1 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
      
      {/* Mobile layout */}
      <div className="md:hidden">
        <main className="bg-black">{children}</main>
        <BottomNavBar />
      </div>

      <Toaster />
    </SidebarProvider>
  );
}
