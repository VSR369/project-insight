/**
 * ChallengeTelemetryPanel — Per-challenge AI review trend summary.
 *
 * Renders the latest review's headline metrics plus delta vs. previous run,
 * giving curators a quick read on whether quality is improving across re-reviews.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingDown, TrendingUp, Minus, Clock, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChallengeTelemetry } from '@/hooks/queries/useChallengeTelemetry';

interface ChallengeTelemetryPanelProps {
  challengeId: string;
}

export function ChallengeTelemetryPanel({ challengeId }: ChallengeTelemetryPanelProps) {
  const { rows, trend, isLoading } = useChallengeTelemetry(challengeId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Review Quality Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0 || !trend.latest) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Review Quality Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No telemetry recorded yet. Run an AI Review to capture quality metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { latest, findingsDelta, correctionsDelta, isImproving } = trend;
  const totalFindings = latest.consistency_findings_count + latest.ambiguity_findings_count;
  const totalTokens = (latest.pass1_tokens ?? 0) + (latest.pass2_tokens ?? 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Review Quality Trend
          </span>
          <Badge variant="outline" className="text-[10px]">
            {rows.length} review{rows.length === 1 ? '' : 's'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile
            label="Findings"
            value={String(totalFindings)}
            delta={findingsDelta}
            invertDelta
          />
          <MetricTile
            label="Corrections"
            value={String(latest.total_corrections)}
            delta={correctionsDelta}
            invertDelta
          />
          <MetricTile
            label="Duration"
            value={latest.review_duration_seconds ? `${latest.review_duration_seconds}s` : '—'}
            icon={<Clock className="h-3 w-3" />}
          />
          <MetricTile
            label="Tokens"
            value={totalTokens > 0 ? totalTokens.toLocaleString() : '—'}
            icon={<Cpu className="h-3 w-3" />}
          />
        </div>

        {findingsDelta !== null && (
          <div
            className={cn(
              'text-xs px-3 py-2 rounded-md border',
              isImproving
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted border-border text-muted-foreground',
            )}
          >
            {isImproving
              ? '✓ Quality improving — fewer findings and corrections than the previous review.'
              : 'Comparing latest review against previous run for this challenge.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Metric tile ──────────────────────────────────── */

interface MetricTileProps {
  label: string;
  value: string;
  delta?: number | null;
  /** When true, negative delta is "good" (e.g., fewer findings). */
  invertDelta?: boolean;
  icon?: React.ReactNode;
}

function MetricTile({ label, value, delta, invertDelta, icon }: MetricTileProps) {
  const showDelta = typeof delta === 'number' && delta !== 0;
  const isGood = showDelta ? (invertDelta ? delta < 0 : delta > 0) : false;
  const DeltaIcon = !showDelta ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {typeof delta === 'number' && (
        <div
          className={cn(
            'inline-flex items-center gap-0.5 text-[10px] font-medium',
            !showDelta && 'text-muted-foreground',
            showDelta && isGood && 'text-emerald-600 dark:text-emerald-400',
            showDelta && !isGood && 'text-amber-600 dark:text-amber-400',
          )}
        >
          <DeltaIcon className="h-2.5 w-2.5" />
          {showDelta ? `${delta > 0 ? '+' : ''}${delta} vs last` : 'no change'}
        </div>
      )}
    </div>
  );
}
