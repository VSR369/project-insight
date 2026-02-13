import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-area loading skeleton shown while lazy-loaded admin pages are fetched.
 * The sidebar and header remain visible and interactive during this time.
 */
function ContentSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

/**
 * AdminShell — Persistent layout for all /admin/* routes.
 *
 * Renders the sidebar and header ONCE. Only the content area (via <Outlet>)
 * swaps on navigation, wrapped in a Suspense boundary so the sidebar never
 * unmounts or resets scroll position.
 */
export function AdminShell() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <SidebarInset className="flex flex-col">
            <AdminHeader />
            <main className="flex-1 overflow-auto p-6">
              <Suspense fallback={<ContentSkeleton />}>
                <Outlet />
              </Suspense>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
