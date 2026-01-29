import { ReactNode } from 'react';
import { PulseBottomNav } from './PulseBottomNav';
import { PulseHeader } from './PulseHeader';

interface PulseLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export function PulseLayout({ children, title, showBackButton = false }: PulseLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - fixed at top */}
      <PulseHeader title={title} showBackButton={showBackButton} />
      
      {/* Main content - scrollable, with padding for header and bottom nav */}
      <main className="flex-1 overflow-auto pt-14 pb-20">
        {children}
      </main>
      
      {/* Bottom Navigation - fixed at bottom */}
      <PulseBottomNav />
    </div>
  );
}
