/**
 * PlatformStatsBar — Displays live platform stats from platform_stats_cache.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trophy, Building2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformStatsBarProps {
  className?: string;
}

interface PlatformStat {
  stat_key: string;
  stat_value: number;
}

const STAT_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  total_providers: { icon: <Users className="h-5 w-5" />, label: 'Providers' },
  total_challenges: { icon: <Trophy className="h-5 w-5" />, label: 'Challenges' },
  total_organizations: { icon: <Building2 className="h-5 w-5" />, label: 'Organizations' },
  total_submissions: { icon: <Zap className="h-5 w-5" />, label: 'Solutions' },
};

export function PlatformStatsBar({ className }: PlatformStatsBarProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_stats_cache')
        .select('stat_key, stat_value');
      if (error) throw new Error(error.message);
      return (data as PlatformStat[]) ?? [];
    },
    staleTime: 15 * 60_000,
  });

  if (isLoading) {
    return (
      <div className={cn('flex gap-8 justify-center py-6', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-28" />
        ))}
      </div>
    );
  }

  const statsMap = new Map(stats?.map((s) => [s.stat_key, s.stat_value]) ?? []);

  return (
    <div className={cn('flex flex-wrap gap-6 lg:gap-12 justify-center py-6', className)}>
      {Object.entries(STAT_CONFIG).map(([key, config]) => {
        const value = statsMap.get(key) ?? 0;
        return (
          <div key={key} className="flex items-center gap-3 text-center">
            <div className="text-primary">{config.icon}</div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(value)}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
