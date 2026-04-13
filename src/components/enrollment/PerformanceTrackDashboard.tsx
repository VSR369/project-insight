/**
 * PerformanceTrackDashboard — Shows a provider's 6 performance dimensions,
 * composite score, and progress toward auto-certification thresholds.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProviderPerformanceScore, extractDimensionScores } from '@/hooks/queries/useProviderPerformanceScore';
import { PERFORMANCE_DIMENSION_LABELS, PERFORMANCE_CERT_THRESHOLDS } from '@/constants/enrollment.constants';
import type { PerformanceDimension } from '@/constants/enrollment.constants';
import { TrendingUp, Award, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceTrackDashboardProps {
  providerId: string;
  className?: string;
}

const TIER_LABELS: Record<string, { label: string; stars: number; color: string }> = {
  PROVEN: { label: 'Proven', stars: 1, color: 'text-amber-600' },
  ACCLAIMED: { label: 'Acclaimed', stars: 2, color: 'text-blue-600' },
  EMINENT: { label: 'Eminent', stars: 3, color: 'text-purple-600' },
};

function getNextTier(composite: number): { tier: string; threshold: number; remaining: number } | null {
  if (composite < PERFORMANCE_CERT_THRESHOLDS.PROVEN) {
    return { tier: 'PROVEN', threshold: PERFORMANCE_CERT_THRESHOLDS.PROVEN, remaining: PERFORMANCE_CERT_THRESHOLDS.PROVEN - composite };
  }
  if (composite < PERFORMANCE_CERT_THRESHOLDS.ACCLAIMED) {
    return { tier: 'ACCLAIMED', threshold: PERFORMANCE_CERT_THRESHOLDS.ACCLAIMED, remaining: PERFORMANCE_CERT_THRESHOLDS.ACCLAIMED - composite };
  }
  if (composite < PERFORMANCE_CERT_THRESHOLDS.EMINENT) {
    return { tier: 'EMINENT', threshold: PERFORMANCE_CERT_THRESHOLDS.EMINENT, remaining: PERFORMANCE_CERT_THRESHOLDS.EMINENT - composite };
  }
  return null;
}

export function PerformanceTrackDashboard({ providerId, className }: PerformanceTrackDashboardProps) {
  const { data: score, isLoading } = useProviderPerformanceScore(providerId);
  const dimensions = extractDimensionScores(score);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const composite = score?.composite_score ?? 0;
  const nextTier = getNextTier(composite);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Track
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{composite.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next tier progress */}
        {nextTier && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                Next: <span className="font-medium">{TIER_LABELS[nextTier.tier]?.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {nextTier.remaining.toFixed(1)} pts to go
              </span>
            </div>
            <Progress value={(composite / nextTier.threshold) * 100} className="h-2" />
          </div>
        )}

        {!nextTier && (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Star className="h-3 w-3 mr-1" /> Eminent tier reached!
          </Badge>
        )}

        {/* Dimension breakdown */}
        <div className="space-y-3">
          {dimensions && (Object.entries(PERFORMANCE_DIMENSION_LABELS) as [PerformanceDimension, string][]).map(
            ([dim, label]) => {
              const val = dimensions[dim] ?? 0;
              return (
                <div key={dim} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val.toFixed(0)}</span>
                  </div>
                  <Progress value={val} className={cn('h-1.5')} />
                </div>
              );
            }
          )}

          {!dimensions && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No performance data yet. Start participating in challenges to build your score.
            </p>
          )}
        </div>

        {/* Raw counts summary */}
        {score && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <StatCell label="Solutions" value={score.full_solutions_submitted} />
            <StatCell label="Accepted" value={score.solutions_accepted} />
            <StatCell label="Wins" value={score.wins_platinum + score.wins_gold + score.wins_silver} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
