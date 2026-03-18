/**
 * RecentNotificationsWidget — Shows latest cogni_notifications for the current user.
 * Color-coded left border: amber for returns, blue for assignments, green for completions.
 */

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CogniNotification {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_BORDER: Record<string, string> = {
  return: 'border-l-amber-500',
  assignment: 'border-l-[hsl(210,68%,54%)]',
  completion: 'border-l-[hsl(155,68%,37%)]',
  sla_warning: 'border-l-destructive',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentNotificationsWidget() {
  const { user } = useAuth();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['cogni-notifications-recent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('cogni_notifications')
        .select('id, title, message, notification_type, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return (data ?? []) as CogniNotification[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (notifications.length === 0) return null;

  return (
    <Card className="border-border">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Recent Notifications</h3>
      </div>
      <CardContent className="p-0">
        {notifications.map((n) => {
          const borderClass = TYPE_BORDER[n.notification_type] ?? 'border-l-muted-foreground';
          return (
            <div
              key={n.id}
              className={cn(
                'border-l-4 px-4 py-3 border-b last:border-b-0',
                borderClass,
                !n.is_read && 'bg-accent/30',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {formatTimeAgo(n.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
