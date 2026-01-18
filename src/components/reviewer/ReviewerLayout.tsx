import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReviewerSidebar } from './ReviewerSidebar';
import { ReviewerHeader } from './ReviewerHeader';

interface ReviewerLayoutProps {
  children: ReactNode;
}

export function ReviewerLayout({ children }: ReviewerLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <ReviewerSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <ReviewerHeader />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
