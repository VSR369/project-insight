/**
 * Right Sidebar
 * Contains DailyStandupWidget, InspirationalBannerWidget, TrendingTopicsWidget
 */

import { DailyStandupWidget, InspirationalBannerWidget, TrendingTopicsWidget } from '@/components/pulse/widgets';
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

      {/* Inspirational Banner */}
      <InspirationalBannerWidget />

      {/* Trending Topics */}
      <TrendingTopicsWidget />
    </div>
  );
}
