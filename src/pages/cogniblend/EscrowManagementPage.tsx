/**
 * EscrowManagementPage — Lightweight FC escrow queue.
 * Route: /cogni/escrow
 *
 * This page now acts as a fallback list view. The actual escrow
 * confirmation experience lives in the per-challenge workspace at
 * /cogni/challenges/:id/finance (mirrors the LC pattern).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';
import { PwaAcceptanceGate } from '@/components/cogniblend/workforce/PwaAcceptanceGate';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import type { GovernanceMode } from '@/lib/governanceMode';

interface EscrowChallenge {
  challenge_id: string;
  challenge_title: string;
  escrow_status: string | null;
  reward_total: number;
  currency: string;
  bank_name: string | null;
  deposit_reference: string | null;
  governance_mode: GovernanceMode;
}

export default function EscrowManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(user?.id);
  const [pwaAccepted, setPwaAccepted] = useState(false);

  const { data: escrowChallenges, isLoading } = useQuery({
    queryKey: ['fc-escrow-challenges', user?.id],
    queryFn: async (): Promise<EscrowChallenge[]> => {
      if (!user?.id) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roleData } = await (supabase as any)
        .from('user_challenge_roles')
        .select('challenge_id')
        .eq('user_id', user.id)
        .eq('role_code', 'FC')
        .eq('is_active', true);
      const challengeIds = ((roleData ?? []) as Array<{ challenge_id: string }>).map(
        (r) => r.challenge_id,
      );
      if (challengeIds.length === 0) return [];

      const results: EscrowChallenge[] = [];
      for (const cid of challengeIds) {
        const [challengeRes, escrowRes] = await Promise.all([
          supabase
            .from('challenges')
            .select(
              'id, title, reward_structure, governance_profile, governance_mode_override',
            )
            .eq('id', cid)
            .single(),
          supabase
            .from('escrow_records')
            .select('escrow_status, bank_name, deposit_reference, currency')
            .eq('challenge_id', cid)
            .maybeSingle(),
        ]);
        if (!challengeRes.data) continue;
        const govMode = resolveGovernanceMode(
          (challengeRes.data as Record<string, unknown>).governance_mode_override as string | null
            ?? (challengeRes.data as Record<string, unknown>).governance_profile as string | null,
        );
        if (govMode === 'STRUCTURED' || govMode === 'QUICK') continue;
        const rs = challengeRes.data.reward_structure as Record<string, unknown> | null;
        let rewardTotal = 0;
        if (rs) {
          const p = Number(rs.platinum_award ?? rs.budget_max ?? 0);
          const g = Number(rs.gold_award ?? 0);
          const s = Number(rs.silver_award ?? 0);
          rewardTotal = p + g + s;
          if (rewardTotal === 0) rewardTotal = Number(rs.budget_max ?? rs.budget_min ?? 0);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const esc = escrowRes.data as any;
        results.push({
          challenge_id: cid,
          challenge_title: challengeRes.data.title,
          escrow_status: esc?.escrow_status ?? null,
          reward_total: rewardTotal,
          currency: esc?.currency ?? 'USD',
          bank_name: esc?.bank_name ?? null,
          deposit_reference: esc?.deposit_reference ?? null,
          governance_mode: govMode,
        });
      }
      return results;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (isLoading || pwaLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hasPwa && !pwaAccepted) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> Escrow Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open a challenge to confirm its escrow deposit in the per-challenge Finance Workspace.
        </p>
      </div>

      {(!escrowChallenges || escrowChallenges.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No challenges requiring escrow are assigned to you.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {escrowChallenges?.map((ch) => {
          const isFunded = ch.escrow_status === 'FUNDED';
          return (
            <Card key={ch.challenge_id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{ch.challenge_title}</p>
                      <Badge variant={isFunded ? 'default' : 'secondary'}>
                        {isFunded ? 'Funded' : ch.escrow_status ?? 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reward Total:{' '}
                      <span className="font-medium">
                        {ch.currency} {ch.reward_total.toLocaleString()}
                      </span>
                      {isFunded && ch.bank_name && (
                        <span className="ml-3">
                          Bank: {ch.bank_name}
                          {ch.deposit_reference && ` · Ref: ${ch.deposit_reference}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isFunded ? 'outline' : 'default'}
                    onClick={() =>
                      navigate(`/cogni/challenges/${ch.challenge_id}/finance`)
                    }
                    className="shrink-0"
                  >
                    {isFunded ? 'View Workspace' : 'Open Finance Workspace'}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
                {isFunded && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Escrow Confirmed — read-only.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
