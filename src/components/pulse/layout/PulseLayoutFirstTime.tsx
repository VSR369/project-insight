import { ReactNode, useState, useCallback } from 'react';
import { PulseHeaderFirstTime } from './PulseHeaderFirstTime';
import { PulseHeaderPortal, PulseHeaderSpacer } from './PulseHeaderPortal';

interface PulseLayoutFirstTimeProps {
  children: ReactNode;
}

/**
 * Layout for first-time Solution Providers on Industry Pulse.
 * - No sidebar navigation
 * - No bottom navigation bar
 * - Simplified header with "Build Profile" CTA
 * - Focuses user attention on the profile build banner
 */
export function PulseLayoutFirstTime({ children }: PulseLayoutFirstTimeProps) {
  // Track whether the portal is active to enable fallback rendering
  const [portalActive, setPortalActive] = useState(true);
  
  const handlePortalStatusChange = useCallback((isActive: boolean) => {
    setPortalActive(isActive);
  }, []);

  // Header component (reused for both portal and fallback)
  const headerContent = <PulseHeaderFirstTime />;

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
      
      {/* Main content - scrollable */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
