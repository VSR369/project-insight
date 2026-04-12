import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActivityItem {
  audit_id: string;
  challenge_id: string | null;
  challenge_title: string | null;
  solution_id: string | null;
  user_id: string;
  user_name: string;
  action: string;
  method: string;
  details: Record<string, unknown> | null;
  phase_from: number | null;
  phase_to: number | null;
  created_at: string;
}

interface ActivityFeedProps {
  maxItems?: number;
  showLoadMore?: boolean;
}

const METHOD_CONFIG: Record<string, { dot: string; badge: string; badgeBg: string; label: string }> = {
  HUMAN: {
    dot: 'bg-[hsl(157,68%,37%)]',
    badge: 'text-[hsl(157,68%,27%)]',
    badgeBg: 'bg-[hsl(157,68%,93%)]',
    label: 'Manual',
  },
  AUTO_COMPLETE: {
    dot: 'bg-[hsl(213,66%,54%)]',
    badge: 'text-[hsl(213,66%,44%)]',
    badgeBg: 'bg-[hsl(213,66%,93%)]',
    label: 'Auto-completed',
  },
  SYSTEM: {
    dot: 'bg-[hsl(48,2%,52%)]',
    badge: 'text-[hsl(48,2%,42%)]',
    badgeBg: 'bg-[hsl(48,2%,93%)]',
    label: 'System',
  },
};

function getMethodConfig(method: string) {
  return METHOD_CONFIG[method] ?? METHOD_CONFIG.SYSTEM;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchActivity(
  userId: string,
  limit: number,
  cursor?: string
): Promise<ActivityItem[]> {
  // Get challenges the user is involved in
  const { data: roleData } = await supabase
    .from('user_challenge_roles')
    .select('challenge_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  const challengeIds = (roleData ?? []).map((r) => r.challenge_id);

  // Query the view — since it's not in generated types, use rpc-style raw query
  let query = supabase
    .from('recent_activity_view' as never)
    .select('audit_id, challenge_id, challenge_title, solution_id, user_id, user_name, action, method, details, phase_from, phase_to, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // Filter: user's own actions OR challenges they participate in
  if (challengeIds.length > 0) {
    query = query.or(
      `user_id.eq.${userId},challenge_id.in.(${challengeIds.join(',')})`
    );
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as ActivityItem[]) ?? [];
}

export default function ActivityFeed({
  maxItems = 20,
  showLoadMore = true,
}: ActivityFeedProps) {
  // ── Hooks ──
  const [userId, setUserId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<ActivityItem[]>([]);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Initial query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activity-feed', userId, cursor],
    queryFn: () => fetchActivity(userId!, maxItems, cursor),
    enabled: !!userId,
    staleTime: 30_000,
  });

  // Accumulate pages
  useEffect(() => {
    if (!data) return;
    if (!cursor) {
      setAllItems(data);
    } else {
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.audit_id));
        const newOnes = data.filter((d) => !existingIds.has(d.audit_id));
        return [...prev, ...newOnes];
      });
    }
  }, [data, cursor]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('activity-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_trail' },
        (payload) => {
          const newRow = payload.new as { id: string; user_id: string; challenge_id: string };
          // Refresh the feed
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
          setNewItemIds((prev) => new Set(prev).add(newRow.id));
          // Clear animation class after 600ms
          setTimeout(() => {
            setNewItemIds((prev) => {
              const next = new Set(prev);
              next.delete(newRow.id);
              return next;
            });
          }, 600);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const handleLoadMore = useCallback(() => {
    if (allItems.length > 0) {
      setCursor(allItems[allItems.length - 1].created_at);
    }
  }, [allItems]);

  // ── Conditional renders ──
  if (!userId || isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (allItems.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-base font-medium text-muted-foreground">
          No activity yet
        </p>
        <p className="text-[13px] text-muted-foreground/70 mt-1 max-w-xs">
          Your actions will appear here as you work on challenges.
        </p>
      </div>
    );
  }

  const hasMore = data?.length === maxItems;

  return (
    <div className="space-y-2">
      {allItems.map((item) => {
        const config = getMethodConfig(item.method);
        const isNew = newItemIds.has(item.audit_id);

        return (
          <div
            key={item.audit_id}
            className={`flex items-start gap-3 rounded-lg border border-border bg-card p-3 px-4 transition-all ${
              isNew ? 'animate-fade-in' : ''
            }`}
          >
            {/* Dot */}
            <div className="flex-shrink-0 pt-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[hsl(218,54%,25%)] leading-tight truncate">
                {formatAction(item.action)}
              </p>
              {item.challenge_title && (
                <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                  {item.challenge_title}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {formatRelativeTime(item.created_at)}
              </p>
            </div>

            {/* Badge */}
            <div className="flex-shrink-0 pt-0.5">
              <span
                className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badge}`}
              >
                {config.label}
              </span>
            </div>
          </div>
        );
      })}

      {showLoadMore && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isFetching}
            className="text-[13px] text-muted-foreground"
          >
            {isFetching ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
