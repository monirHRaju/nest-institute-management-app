'use client';

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b flex items-center px-4 bg-background z-10 sticky top-0 shadow-sm">
          <SidebarTrigger />
          <div className="ml-4 font-semibold text-sm text-muted-foreground">
            {/* Breadcrumbs placeholder */}
            EduManage Dashboard
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {/* Theme & Lang toggles can go here */}
          </div>
        </header>
        <div className="flex-1 p-6 bg-muted/20">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
