import { MainSidebar } from '@/components/main-sidebar';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r border-border/50">
          <MainSidebar />
        </Sidebar>
        <SidebarInset>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
