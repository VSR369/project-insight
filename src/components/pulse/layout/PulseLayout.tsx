import { ReactNode } from 'react';
import { PulseBottomNav } from './PulseBottomNav';
import { PulseHeader } from './PulseHeader';
import { PulseQuickNav } from './PulseQuickNav';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useAuth } from '@/hooks/useAuth';

interface BreadcrumbConfig {
  parentLabel: string;
  parentPath: string;
  currentLabel: string;
}

interface PulseLayoutProps {
  children: ReactNode;
  // New navigation props
  isPrimaryPage?: boolean;
  breadcrumb?: BreadcrumbConfig;
  hideActions?: boolean;
  // Legacy props (still supported)
  title?: string;
  showBackButton?: boolean;
  parentRoute?: string;
  // Sidebar props
  providerId?: string;
  isFirstTime?: boolean;
  showSidebars?: boolean;
}

export function PulseLayout({ 
  children, 
  isPrimaryPage,
  breadcrumb,
  hideActions,
  title, 
  showBackButton = false, 
  parentRoute,
  providerId,
  isFirstTime = false,
  showSidebars = true
}: PulseLayoutProps) {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - fixed at top */}
      <PulseHeader 
        isPrimaryPage={isPrimaryPage}
        breadcrumb={breadcrumb}
        hideActions={hideActions}
        title={title} 
        showBackButton={showBackButton} 
        parentRoute={parentRoute} 
      />
      
      {/* Main content wrapper - responsive three-column layout */}
      <div className="flex-1 overflow-hidden pt-14 pb-20 lg:pb-0 flex flex-col">
        {/* Desktop Quick Nav - full width above columns */}
        {showSidebars && (
          <div className="hidden lg:block sticky top-14 z-10 bg-background border-b">
            <PulseQuickNav />
          </div>
        )}
        
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar - hidden on mobile/tablet, visible on large desktop */}
          {showSidebars && (
            <aside className="hidden xl:block w-[280px] flex-shrink-0 border-r overflow-y-auto">
              <LeftSidebar providerId={providerId} userId={user?.id} isFirstTime={isFirstTime} />
            </aside>
          )}
          
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
          
          {/* Right Sidebar - hidden on mobile, visible on desktop */}
          {showSidebars && (
            <aside className="hidden lg:block w-[320px] flex-shrink-0 border-l overflow-y-auto">
              <RightSidebar providerId={providerId} isFirstTime={isFirstTime} />
            </aside>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation - fixed at bottom, only on mobile */}
      <div className="lg:hidden">
        <PulseBottomNav />
      </div>
    </div>
  );
}
