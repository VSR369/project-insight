/**
 * Left Sidebar
 * Contains Desktop Navigation, LeaderboardMiniWidget and XP Progress
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, Zap, Target, Award, Home, Layers, 
  PlusCircle, Trophy, User, Flame 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaderboardMiniWidget } from '@/components/pulse/widgets';
import { useProviderStats, usePulseMetrics } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface LeftSidebarProps {
  providerId?: string;
  isFirstTime?: boolean;
  className?: string;
}

// Desktop navigation items
const NAV_ITEMS = [
  { path: '/pulse/feed', label: 'Feed', icon: Home },
  { path: '/pulse/sparks', label: 'Sparks', icon: Zap },
  { path: '/pulse/cards', label: 'Cards', icon: Layers },
  { path: '/pulse/create', label: 'Create', icon: PlusCircle },
  { path: '/pulse/ranks', label: 'Ranks', icon: Trophy },
  { path: '/pulse/profile', label: 'Profile', icon: User },
  { path: '/pulse/standup', label: 'Daily Standup', icon: Flame },
];

// XP required per level (simplified formula)
const getXpForLevel = (level: number) => level * 500;
const getXpProgress = (totalXp: number, level: number) => {
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  return Math.min((xpIntoLevel / xpNeeded) * 100, 100);
};

export function LeftSidebar({ providerId, isFirstTime, className }: LeftSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: stats, isLoading: statsLoading } = useProviderStats(providerId || '');
  const { data: metrics, isLoading: metricsLoading } = usePulseMetrics(providerId || '');

  const isLoading = statsLoading || metricsLoading;
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/pulse/feed') {
      return currentPath === '/pulse/feed' || currentPath === '/pulse';
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className={cn("p-4 space-y-4 overflow-y-auto", className)}>
      {/* Desktop Navigation */}
      <nav className="space-y-1" aria-label="Pulse navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.path}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-sm",
                active && "bg-primary/10 text-primary font-medium"
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className={cn(
                "h-4 w-4 mr-2",
                active && "text-primary",
                item.icon === Flame && "text-orange-500",
                item.icon === Zap && !active && "text-yellow-500"
              )} />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Galaxy Leaderboard */}
      <LeaderboardMiniWidget currentProviderId={providerId} isFirstTime={isFirstTime} />

      {/* XP Progress Card */}
      {providerId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-2 w-full" />
              </>
            ) : (
              <>
                {/* Level & XP */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-primary-foreground font-bold">
                      {stats?.current_level || 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Level {stats?.current_level || 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {(stats?.total_xp || 0).toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {stats?.current_streak || 0} streak
                  </Badge>
                </div>

                {/* Progress to next level */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Next Level</span>
                    <span>{getXpForLevel((stats?.current_level || 1) + 1).toLocaleString()} XP</span>
                  </div>
                  <Progress 
                    value={getXpProgress(stats?.total_xp || 0, stats?.current_level || 1)} 
                    className="h-2"
                  />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{metrics?.impressionsThisWeek || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Impressions</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <Award className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                    <p className="text-lg font-bold">{metrics?.industryRank?.rank || '-'}</p>
                    <p className="text-[10px] text-muted-foreground">Rank</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
