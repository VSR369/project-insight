/**
 * Inspirational Banner Widget
 * Displays motivational messaging about the platform value proposition
 */

import { Lightbulb, Megaphone, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InspirationalBannerWidgetProps {
  className?: string;
}

export function InspirationalBannerWidget({ className }: InspirationalBannerWidgetProps) {
  return (
    <Card className={cn("bg-muted/50 border-0 shadow-sm", className)}>
      <CardContent className="p-3 lg:p-4 xl:p-5">
        <div className="flex items-start justify-between gap-2">
          {/* Text Content */}
          <div className="space-y-0.5 lg:space-y-1 min-w-0">
            <p className="text-sm lg:text-base xl:text-lg font-semibold text-foreground italic truncate">
              Solve Industry Challenges.
            </p>
            <p className="text-sm lg:text-base xl:text-lg font-semibold text-amber-500 italic truncate">
              Monetize Your Expertise.
            </p>
            <p className="text-sm lg:text-base xl:text-lg font-semibold text-foreground italic truncate">
              Build Your Brand.
            </p>
          </div>

          {/* Icons - scale with container */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {/* Lightbulb Icon */}
              <div className="relative">
                <Lightbulb className="h-5 w-5 lg:h-6 lg:w-6 text-amber-400" />
                {/* Sparkle lines */}
                <div className="absolute -top-1 -right-1 w-1 h-1 lg:w-1.5 lg:h-1.5 border-t border-r border-amber-400 rotate-45" />
                <div className="absolute -top-0.5 right-1 w-0.5 h-0.5 lg:w-1 lg:h-1 border-t border-amber-400" />
              </div>
              
              {/* Megaphone Icon */}
              <div className="relative ml-1">
                <Megaphone className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500" />
              </div>
            </div>
            
            {/* Dollar Icon */}
            <div className="mt-1">
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full border-2 border-cyan-500 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-cyan-500" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
