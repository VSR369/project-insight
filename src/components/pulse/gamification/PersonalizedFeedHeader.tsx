/**
 * Personalized Feed Header Component
 * Shows date, greeting with name/industry, level badge
 */

import { format } from 'date-fns';
import { Sparkles, Star, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProviderStats } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface PersonalizedFeedHeaderProps {
  providerId: string;
  providerName: string;
  providerAvatar?: string | null;
  primaryIndustry?: string | null;
  className?: string;
}

export function PersonalizedFeedHeader({
  providerId,
  providerName,
  providerAvatar,
  primaryIndustry,
  className,
}: PersonalizedFeedHeaderProps) {
  const { data: stats } = useProviderStats(providerId);
  
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  const greeting = getGreeting();
  const firstName = providerName?.split(' ')[0] || 'there';
  const initials = providerName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  function getGreeting(): string {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div className={cn("p-4 border-b bg-background", className)}>
      {/* Date display */}
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        {formattedDate}
      </p>

      <div className="flex items-start gap-3">
        {/* Avatar with level badge */}
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            {providerAvatar ? (
              <AvatarImage src={providerAvatar} alt={providerName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {stats && (
            <Badge 
              className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-bold bg-primary text-primary-foreground border-2 border-background"
              aria-label={`Level ${stats.current_level}`}
            >
              {stats.current_level}
            </Badge>
          )}
        </div>

        {/* Greeting and info */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg leading-tight">
            {greeting}, {firstName}! 
            <Sparkles className="inline-block h-4 w-4 ml-1 text-yellow-500" aria-hidden="true" />
          </h1>
          
          {primaryIndustry ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              Ready to dominate <span className="font-medium text-primary">{primaryIndustry}</span> today?
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              Ready to share your expertise?
            </p>
          )}

          {/* Stats badges */}
          {stats && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-1 text-cyan-500" aria-hidden="true" />
                Level {stats.current_level}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1 text-purple-500" aria-hidden="true" />
                {Number(stats.total_xp).toLocaleString()} XP
              </Badge>
              {stats.current_streak > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Flame className="h-3 w-3 mr-1 text-orange-500" aria-hidden="true" />
                  {stats.current_streak} day streak
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
