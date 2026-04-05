/**
 * FcChallengeQueuePage — FC queue showing challenges needing escrow deposit.
 * Route: /cogni/fc-queue
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, ArrowRight, Inbox } from 'lucide-react';
import { handleQueryError } from '@/lib/errorHandler';

interface FcQueueItem {
  challenge_id: string;
  title: string;
  reward_total: number;
  currency: string;
  escrow_status: string | null;
  current_phase: number;
}

export default function FcChallengeQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['fc-challenge-queue', user?.id],
    queryFn: async (): Promise<FcQueueItem[]> => {
      if (!user?.id) return [];
      const { data: roleData } = await supabase
        .from('user_challenge_roles' as string).select('challenge_id')
        .eq('user_id', user.id).eq('role_code', 'FC').eq('is_active', true);
      const ids = ((roleData ?? []) as unknown as Array<{ challenge_id: string }>).map(r => r.challenge_id);
      if (ids.length === 0) return [];

      const results: FcQueueItem[] = [];
      for (const cid of ids) {
        const [chRes, escRes] = await Promise.all([
          supabase.from('challenges').select('id, title, reward_structure, current_phase, fc_compliance_complete').eq('id', cid).single(),
          supabase.from('escrow_records').select('escrow_status').eq('challenge_id', cid).maybeSingle(),
        ]);
        if (!chRes.data) continue;
        const ch = chRes.data;
        if (ch.fc_compliance_complete || (ch.current_phase ?? 0) < 3) continue;
        const rs = ch.reward_structure as Record<string, unknown> | null;
        const total = Number(rs?.platinum_award ?? rs?.budget_max ?? 0);
        results.push({
          challenge_id: cid, title: ch.title, reward_total: total,
          currency: (rs?.currency as string) ?? 'USD',
          escrow_status: escRes.data?.escrow_status ?? null,
          current_phase: ch.current_phase ?? 3,
        });
      }
      return results;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

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
          <Banknote className="h-5 w-5 text-primary" /> FC Challenge Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Challenges awaiting your escrow deposit confirmation
        </p>
      </div>

      {(!queue || queue.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Queue is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              No challenges currently need your escrow deposit.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {queue?.map((item) => (
          <Card key={item.challenge_id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      Reward: <span className="font-medium text-foreground">
                        {item.currency} {item.reward_total.toLocaleString()}
                      </span>
                    </span>
                    <Badge variant={item.escrow_status === 'FUNDED' ? 'default' : 'secondary'} className="text-[10px]">
                      {item.escrow_status ?? 'Pending Deposit'}
                    </Badge>
                    <span>Phase {item.current_phase}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/cogni/escrow')}
                  className="shrink-0"
                >
                  Enter Deposit <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
