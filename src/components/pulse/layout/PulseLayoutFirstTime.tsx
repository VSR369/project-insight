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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - sticky within flex container for reliable iframe rendering */}
      <div className="flex-shrink-0">
        <PulseHeaderFirstTime />
      </div>
      
      {/* Main content - scrollable */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
