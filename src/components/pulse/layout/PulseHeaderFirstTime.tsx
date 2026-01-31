import { Sparkles } from 'lucide-react';

/**
 * Simplified header for first-time Solution Providers.
 * Shows Pulse branding centered.
 * No dashboard exit button or notifications (user hasn't set up profile yet).
 * CTA is in the ProfileBuildBanner below the header.
 */
export function PulseHeaderFirstTime() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="h-full max-w-lg mx-auto px-4 flex items-center justify-center">
        {/* Center - Pulse branding only */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Pulse
          </span>
        </div>
      </div>
    </header>
  );
}
