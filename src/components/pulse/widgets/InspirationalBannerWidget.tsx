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
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Text Content */}
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground italic">
              Solve Industry Challenges.
            </p>
            <p className="text-lg font-semibold text-amber-500 italic">
              Monetize Your Expertise.
            </p>
            <p className="text-lg font-semibold text-foreground italic">
              Build Your Brand.
            </p>
          </div>

          {/* Icons */}
          <div className="flex flex-col items-end gap-1 ml-3">
            <div className="flex items-center gap-1">
              {/* Lightbulb Icon */}
              <div className="relative">
                <Lightbulb className="h-6 w-6 text-amber-400" />
                {/* Sparkle lines */}
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 border-t border-r border-amber-400 rotate-45" />
                <div className="absolute -top-0.5 right-1 w-1 h-1 border-t border-amber-400" />
              </div>
              
              {/* Megaphone Icon */}
              <div className="relative ml-1">
                <Megaphone className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            
            {/* Dollar Icon */}
            <div className="mt-1">
              <div className="w-7 h-7 rounded-full border-2 border-cyan-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-cyan-500" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
