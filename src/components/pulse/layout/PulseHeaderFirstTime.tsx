import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Simplified header for first-time Solution Providers.
 * Shows Pulse branding and prominent "Build Profile" CTA.
 * No dashboard exit button or notifications (user hasn't set up profile yet).
 */
export function PulseHeaderFirstTime() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="h-full max-w-lg mx-auto px-4 flex items-center justify-between">
        {/* Left section - Pulse branding */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Pulse
          </span>
        </div>

        {/* Right section - Build Profile CTA */}
        <Button
          onClick={() => navigate('/pulse/get-started')}
          size="sm"
          className="gap-1"
        >
          Build Profile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
