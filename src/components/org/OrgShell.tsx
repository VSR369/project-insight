/**
 * OrgShell — Persistent layout shell for all /org/* routes.
 * Mirrors AdminShell: renders sidebar + header ONCE, content swaps via <Outlet>.
 */

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OrgSidebar } from './OrgSidebar';
import { OrgHeader } from './OrgHeader';
import { Skeleton } from '@/components/ui/skeleton';

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

export function OrgShell() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <OrgSidebar />
          <SidebarInset className="flex flex-col">
            <OrgHeader />
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
