import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TierUsageData {
  tier_name: string;
  active_challenges: { used: number; limit: number; remaining: number; percentage: number };
  cumulative_challenges: { used: number; limit: number; remaining: number; percentage: number };
  can_create_challenge: boolean;
}

interface TierUsageBarProps {
  orgId: string;
}

function getBarColor(percentage: number): string {
  if (percentage >= 100) return 'bg-[hsl(0,72%,58%)]';
  if (percentage >= 75) return 'bg-[hsl(40,78%,41%)]';
  return 'bg-[hsl(157,68%,37%)]';
}

export default function TierUsageBar({ orgId }: TierUsageBarProps) {
  const { data, isLoading } = useQuery<TierUsageData>({
    queryKey: ['tier-usage', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tier_usage', { p_org_id: orgId } as never);
      if (error) throw new Error(error.message);
      return data as unknown as TierUsageData;
    },
    enabled: !!orgId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-lg bg-muted p-2 px-3 animate-pulse h-12" />
    );
  }

  const { active_challenges: ac } = data;
  const pct = Math.min(ac.percentage, 100);
  const atLimit = ac.remaining <= 0;
  const nearLimit = ac.percentage >= 75 && !atLimit;

  return (
    <div className="rounded-lg bg-[hsl(210,20%,98%)] border border-border p-2 px-3 space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Active Challenges
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-[hsl(220,13%,91%)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[13px] font-bold text-foreground whitespace-nowrap tabular-nums">
          {ac.used} / {ac.limit}
        </span>
      </div>

      {atLimit && (
        <p className="text-xs text-[hsl(0,72%,50%)]">
          Tier limit reached. Complete or cancel a challenge to create new ones.
        </p>
      )}
      {nearLimit && (
        <p className="text-xs text-[hsl(40,78%,41%)]">
          {ac.remaining} slot{ac.remaining !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  );
}
