import { ReactNode } from 'react';
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
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - rendered via portal to document.body for reliable visibility */}
      <PulseHeaderPortal>
        <PulseHeaderFirstTime />
      </PulseHeaderPortal>
      
      {/* Spacer to reserve space for the fixed portal header */}
      <PulseHeaderSpacer />
      
      {/* Main content - scrollable */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
