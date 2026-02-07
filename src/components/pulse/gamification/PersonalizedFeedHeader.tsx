/**
 * Personalized Feed Header Component
 * Shows date, greeting with name/industry, level badge
 */

import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Star, Flame, Users, ArrowRight, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProviderStats, useOnlineNetworkCount } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface PersonalizedFeedHeaderProps {
  providerId: string;
  providerName: string;
  providerAvatar?: string | null;
  primaryIndustry?: string | null;
  profileProgress?: number;
  isProfileComplete?: boolean;
  className?: string;
}

export function PersonalizedFeedHeader({
  providerId,
  providerName,
  providerAvatar,
  primaryIndustry,
  profileProgress,
  isProfileComplete,
  className,
}: PersonalizedFeedHeaderProps) {
  const navigate = useNavigate();
  const { data: stats } = useProviderStats(providerId);
  const { data: onlineCount } = useOnlineNetworkCount(providerId);
  
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
    <div className={cn("p-3 sm:p-4 border-b bg-background", className)}>
      {/* Date display */}
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1.5 sm:mb-2">
        {formattedDate}
      </p>

      <div className="flex items-start gap-2 sm:gap-3">
        {/* Avatar with level badge */}
        <div className="relative flex-shrink-0 self-center">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/20">
            {providerAvatar ? (
              <AvatarImage src={providerAvatar} alt={providerName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm sm:text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
          {stats && (
            <Badge 
              className="absolute -bottom-1 -right-1 h-4 sm:h-5 min-w-4 sm:min-w-5 px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-bold bg-primary text-primary-foreground border-2 border-background"
              aria-label={`Level ${stats.current_level}`}
            >
              {stats.current_level}
            </Badge>
          )}
        </div>

        {/* Greeting and info */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base sm:text-lg leading-tight">
            {greeting}, {firstName}! 
            <Sparkles className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 text-yellow-500" aria-hidden="true" />
          </h1>
          
          {primaryIndustry ? (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Ready to dominate <span className="font-medium text-primary">{primaryIndustry}</span> today?
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Ready to share your expertise?
            </p>
          )}

          {/* Stats badges - wrap on mobile */}
          {stats && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 text-cyan-500" aria-hidden="true" />
                Level {stats.current_level}
              </Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 text-purple-500" aria-hidden="true" />
                {Number(stats.total_xp).toLocaleString()} XP
              </Badge>
              {stats.current_streak > 0 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                  <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 text-orange-500" aria-hidden="true" />
                  {stats.current_streak} day streak
                </Badge>
              )}
              {/* Online network count */}
              {onlineCount !== undefined && onlineCount > 0 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 text-green-500" aria-hidden="true" />
                  {onlineCount} online
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Profile Action Button - same rules as ProfileBuildBanner */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(isProfileComplete ? '/pulse/profile' : '/dashboard')}
          className="flex-shrink-0 h-8 sm:h-9 self-center"
        >
          {isProfileComplete ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">View Profile</span>
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Build Profile</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
