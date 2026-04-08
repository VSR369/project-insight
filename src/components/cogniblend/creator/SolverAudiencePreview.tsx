/**
 * SolverAudiencePreview — Pre-submit card showing solver audience
 * that will be notified when the challenge is published.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Zap, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SolverAudiencePreviewProps {
  engagementModel: string;
}

function useSolverCount() {
  return useQuery({
    queryKey: ['solver-audience-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('solver_profiles' as never)
        .select('id', { count: 'exact', head: true }) as { count: number | null; error: unknown };
      if (error) return { total: 0 };
      return { total: count ?? 0 };
    },
    staleTime: 5 * 60_000,
  });
}

export function SolverAudiencePreview({ engagementModel }: SolverAudiencePreviewProps) {
  const { data, isLoading } = useSolverCount();

  const isMarketplace = engagementModel === 'MP';

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Solver Audience</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : data && data.total > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Certified solvers notified immediately</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Standard solvers notified with 48h delay</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isMarketplace
              ? 'Marketplace — solvers can contact you directly.'
              : 'Aggregator — platform manages all communication.'}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No registered solvers yet — challenge will be listed on the Browse page for discovery.
        </p>
      )}
    </div>
  );
}
