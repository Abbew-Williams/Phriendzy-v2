import { MainSidebar } from '@/components/main-sidebar';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { RightPanel } from '@/components/right-panel';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="md:grid md:grid-cols-[auto_1fr_320px] min-h-screen">
        {/* Sidebar for Desktop */}
        <div className="hidden md:flex">
            <Sidebar collapsible="icon" className="border-r border-border/50">
            <MainSidebar />
            </Sidebar>
        </div>

        <main>
            {children}
        </main>
        
        {/* Right Panel for Desktop */}
        <aside className="hidden md:block border-l border-border/50">
            <RightPanel />
        </aside>
      </div>
      
      {/* Mobile nav and toaster */}
      <BottomNavBar />
      <Toaster />
    </SidebarProvider>
  );
}
