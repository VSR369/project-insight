/**
 * FcChallengeQueuePage — FC queue showing challenges needing escrow deposit.
 * Route: /cogni/fc-queue
 */

import { useState, useMemo, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Banknote, ArrowRight, Inbox, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { handleQueryError } from '@/lib/errorHandler';

interface FcQueueItem {
  challenge_id: string;
  title: string;
  reward_total: number;
  currency: string;
  escrow_status: string | null;
  current_phase: number;
  fc_compliance_complete: boolean;
  created_at: string;
}

export default function FcChallengeQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['fc-challenge-queue', user?.id],
    queryFn: async (): Promise<FcQueueItem[]> => {
      if (!user?.id) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roleData } = await (supabase as any)
        .from('user_challenge_roles').select('challenge_id')
        .eq('user_id', user.id).eq('role_code', 'FC').eq('is_active', true);
      const ids = ((roleData ?? []) as unknown as Array<{ challenge_id: string }>).map(r => r.challenge_id);
      if (ids.length === 0) return [];

      const results: FcQueueItem[] = [];
      for (const cid of ids) {
        const [chRes, escRes] = await Promise.all([
          supabase.from('challenges').select('id, title, reward_structure, current_phase, fc_compliance_complete, governance_profile, governance_mode_override, created_at').eq('id', cid).single(),
          supabase.from('escrow_records').select('escrow_status').eq('challenge_id', cid).maybeSingle(),
        ]);
        if (!chRes.data) continue;
        const ch = chRes.data;
        // S9R guard: STRUCTURED governance is handled by the Curator — skip.
        const gov = ((ch as Record<string, unknown>).governance_mode_override
          ?? (ch as Record<string, unknown>).governance_profile
          ?? '') as string;
        const govUpper = gov.toUpperCase();
        if (govUpper === 'STRUCTURED' || govUpper === 'QUICK') continue;
        if (ch.fc_compliance_complete) continue;
        const rs = ch.reward_structure as Record<string, unknown> | null;
        const total = Number(rs?.platinum_award ?? rs?.budget_max ?? 0);
        results.push({
          challenge_id: cid, title: ch.title, reward_total: total,
          currency: (rs?.currency as string) ?? 'USD',
          escrow_status: escRes.data?.escrow_status ?? null,
          current_phase: ch.current_phase ?? 0,
          fc_compliance_complete: !!ch.fc_compliance_complete,
          created_at: ch.created_at,
        });
      }
      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const filteredQueue = useMemo(() => {
    if (!queue) return [];
    if (!deferredSearch.trim()) return queue;
    const q = deferredSearch.toLowerCase();
    return queue.filter((item) => item.title.toLowerCase().includes(q));
  }, [queue, deferredSearch]);

  const awaitingItems = useMemo(
    () => filteredQueue.filter((i) => i.current_phase >= 3 && !i.fc_compliance_complete),
    [filteredQueue],
  );
  const upcomingItems = useMemo(
    () => filteredQueue.filter((i) => i.current_phase < 3),
    [filteredQueue],
  );

  const renderRow = (item: FcQueueItem, mode: 'awaiting' | 'upcoming') => (
    <Card key={item.challenge_id}>
      <CardContent className="py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>
                Reward:{' '}
                <span className="font-medium text-foreground">
                  {item.currency} {item.reward_total.toLocaleString()}
                </span>
              </span>
              <Badge
                variant={item.escrow_status === 'FUNDED' ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {item.escrow_status ?? 'Pending Deposit'}
              </Badge>
              <span>Phase {item.current_phase}</span>
              {mode === 'upcoming' && (
                <Badge variant="outline" className="text-[10px]">
                  Available at Phase 3
                </Badge>
              )}
              <span>·</span>
              <span>{format(new Date(item.created_at), 'MMM d, yyyy · h:mm a')}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={mode === 'upcoming' ? 'outline' : 'default'}
            onClick={() => navigate(`/cogni/challenges/${item.challenge_id}/finance`)}
            className="shrink-0"
          >
            {mode === 'upcoming' ? (
              <>
                <Eye className="h-3.5 w-3.5 mr-1" /> View challenge context
              </>
            ) : (
              <>
                Open Finance Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    handleQueryError(error as Error, { operation: 'fetch_fc_queue' });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> Finance Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review finance workspaces for CONTROLLED governance challenges assigned to you.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Finance review applies to CONTROLLED governance challenges only.
        </p>
      </div>
...
      {filteredQueue.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {deferredSearch.trim() ? 'No matching challenges' : 'No FC assignments yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {deferredSearch.trim()
                ? 'No challenges match your search.'
                : "You haven't been assigned as Finance Coordinator on any CONTROLLED challenges yet. New CONTROLLED challenges will appear here once a Curator advances them and routes you in."}
            </p>
            {!deferredSearch.trim() && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>
                View Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {awaitingItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Awaiting your action ({awaitingItems.length})
          </h2>
          {awaitingItems.map((item) => renderRow(item, 'awaiting'))}
        </section>
      )}

      {upcomingItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Upcoming (in curation) ({upcomingItems.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            These challenges are still being curated. You can review the context now;
            escrow confirmation unlocks at Phase 3.
          </p>
          {upcomingItems.map((item) => renderRow(item, 'upcoming'))}
        </section>
      )}
    </div>
  );
}
