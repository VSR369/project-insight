import { ReactNode } from 'react';
import { PulseHeaderFirstTime } from './PulseHeaderFirstTime';

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
      {/* Header - fixed at top, simplified for first-time users */}
      <PulseHeaderFirstTime />
      
      {/* Main content - scrollable, with padding for header only (no bottom nav) */}
      <main className="flex-1 overflow-auto pt-14">
        {children}
      </main>
    </div>
  );
}
