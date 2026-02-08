import { ReactNode, useState, useCallback } from 'react';
import { PulseBottomNav } from './PulseBottomNav';
import { PulseHeader } from './PulseHeader';
import { PulseQuickNav } from './PulseQuickNav';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { PulseHeaderPortal, PulseHeaderSpacer } from './PulseHeaderPortal';
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
  
  // Track whether the portal is active to enable fallback rendering
  const [portalActive, setPortalActive] = useState(true);
  
  const handlePortalStatusChange = useCallback((isActive: boolean) => {
    setPortalActive(isActive);
  }, []);

  // Header component (reused for both portal and fallback)
  const headerContent = (
    <PulseHeader 
      isPrimaryPage={isPrimaryPage}
      breadcrumb={breadcrumb}
      hideActions={hideActions}
      title={title} 
      showBackButton={showBackButton} 
      parentRoute={parentRoute} 
    />
  );
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - rendered via portal to dedicated root for reliable visibility */}
      <PulseHeaderPortal onPortalStatusChange={handlePortalStatusChange}>
        {headerContent}
      </PulseHeaderPortal>
      
      {/* Fallback: If portal is not active, render header inline */}
      {!portalActive && (
        <div className="fixed inset-x-0 top-0 z-[1000]" data-testid="pulse-header-fallback">
          {headerContent}
        </div>
      )}
      
      {/* Spacer to reserve space for the fixed header (portal or fallback) */}
      <PulseHeaderSpacer />
      
      {/* Main content wrapper - responsive three-column layout */}
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <div className="flex h-full">
          {/* Left Sidebar - hidden on mobile/tablet, visible on lg desktop */}
          {showSidebars && (
            <aside className="hidden lg:flex flex-col w-56 xl:w-64 2xl:w-72 flex-shrink-0 border-r overflow-y-auto h-[calc(100vh-56px)] sticky top-0">
              <LeftSidebar providerId={providerId} userId={user?.id} isFirstTime={isFirstTime} />
            </aside>
          )}
          
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {/* Desktop Quick Nav - visible when sidebars are shown on lg+ */}
            {showSidebars && (
              <div className="hidden lg:block sticky top-0 z-10 bg-background border-b overflow-x-auto scrollbar-hide">
                <PulseQuickNav />
              </div>
            )}
            {children}
          </main>
          
          {/* Right Sidebar - hidden on mobile/tablet, visible on lg desktop */}
          {showSidebars && (
            <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 border-l overflow-y-auto h-[calc(100vh-56px)] sticky top-0">
              <RightSidebar providerId={providerId} isFirstTime={isFirstTime} />
            </aside>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation - fixed at bottom, only on mobile/tablet */}
      <div className="lg:hidden">
        <PulseBottomNav />
      </div>
    </div>
  );
}
