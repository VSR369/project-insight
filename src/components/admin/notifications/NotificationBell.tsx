/**
 * NotificationBell — Bell icon with unread badge count.
 * Renders in AdminHeader for all admin tiers.
 */

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadNotificationCount, useNotificationRealtime } from '@/hooks/queries/useAdminNotifications';

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  // Subscribe to realtime updates
  useNotificationRealtime();

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
        >
          {displayCount}
        </Badge>
      )}
    </Button>
  );
}
