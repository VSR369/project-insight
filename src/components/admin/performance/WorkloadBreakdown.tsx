import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCurrentAdminProfile } from '@/hooks/queries/useCurrentAdminProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WorkloadBreakdownProps {
  currentPending: number;
  maxConcurrent: number;
}

function getSlaElapsedPct(slaStartAt: string | null, slaPausedHours: number, slaDurationSeconds: number): number {
  if (!slaStartAt) return 0;
  const startMs = new Date(slaStartAt).getTime();
  const pausedMs = (slaPausedHours ?? 0) * 3600 * 1000;
  const elapsedMs = Date.now() - startMs - pausedMs;
  const totalMs = slaDurationSeconds * 1000;
  return Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
}

function getTierLabel(breachTier: string | null): { label: string; classes: string } | null {
  if (!breachTier || breachTier === 'None' || breachTier === 'NONE') return null;
  if (breachTier === 'Tier_3' || breachTier === 'TIER3') return { label: 'T3 CRITICAL', classes: 'bg-destructive text-destructive-foreground' };
  if (breachTier === 'Tier_2' || breachTier === 'TIER2') return { label: 'T2', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' };
  return { label: 'T1', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' };
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return '[&>div]:bg-destructive';
  if (pct >= 50) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-emerald-500';
}

/**
 * Lightweight hook — fetches only SLA fields from verifications.
 * Does NOT resolve org names/countries/industries (unlike useMyAssignments).
 */
function useLightweightAssignments() {
  const { data: profile } = useCurrentAdminProfile();

  return useQuery({
    queryKey: ['verifications', 'lightweight-sla', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admin_verifications')
        .select('id, organization_id, sla_start_at, sla_paused_duration_hours, sla_duration_seconds, sla_breach_tier')
        .eq('assigned_admin_id', profile!.id)
        .eq('is_current', true)
        .in('status', ['Under_Verification', 'Pending_Assignment'])
        .order('sla_start_at', { ascending: true });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];

      // Fetch only org names — single query, no country/type/industry resolution
      const orgIds = [...new Set(data.map(d => d.organization_id))];
      const { data: orgs } = await supabase
        .from('seeker_organizations')
        .select('id, organization_name')
        .in('id', orgIds);

      const orgMap = new Map((orgs ?? []).map(o => [o.id, o.organization_name]));

      return data.map(v => ({
        ...v,
        organization_name: orgMap.get(v.organization_id) ?? 'Unknown Org',
      }));
    },
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function WorkloadBreakdown({ currentPending, maxConcurrent }: WorkloadBreakdownProps) {
  const { data: assignments, isLoading } = useLightweightAssignments();
  const navigate = useNavigate();

  const displayItems = (assignments ?? []).slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Workload Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Current Pending ({currentPending} of {maxConcurrent})
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : displayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No pending assignments</p>
        ) : (
          displayItems.map((item) => {
            const pct = getSlaElapsedPct(
              item.sla_start_at,
              item.sla_paused_duration_hours ?? 0,
              item.sla_duration_seconds ?? 172800,
            );
            const tier = getTierLabel(item.sla_breach_tier);
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate max-w-[60%]">
                    {item.organization_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {tier && <Badge className={cn('text-[10px] px-1.5 py-0', tier.classes)}>{tier.label}</Badge>}
                    <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                  </div>
                </div>
                <Progress value={pct} className={cn('h-1.5', getProgressColor(pct))} />
              </div>
            );
          })
        )}
        {(assignments ?? []).length > 3 && (
          <button
            onClick={() => navigate('/admin/verifications')}
            className="text-xs text-primary hover:underline"
          >
            View all {assignments!.length} →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
