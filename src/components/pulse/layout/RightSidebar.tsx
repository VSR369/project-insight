/**
 * Right Sidebar
 * Contains DailyStandupWidget, QuickActionsWidget, TrendingTopicsWidget
 */

import { DailyStandupWidget, QuickActionsWidget, TrendingTopicsWidget } from '@/components/pulse/widgets';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  providerId?: string;
  isFirstTime?: boolean;
  className?: string;
}

export function RightSidebar({ providerId, isFirstTime, className }: RightSidebarProps) {
  return (
    <div className={cn("p-4 space-y-4 overflow-y-auto", className)}>
      {/* Daily Standup - shows for all users with adapted content */}
      {providerId && (
        <DailyStandupWidget providerId={providerId} isFirstTime={isFirstTime} />
      )}

      {/* Quick Actions */}
      <QuickActionsWidget 
        providerId={providerId}
        hasLootBox={!isFirstTime}
        profileProgress={isFirstTime ? 10 : 75}
      />

      {/* Trending Topics */}
      <TrendingTopicsWidget />
    </div>
  );
}
