/**
 * CorrectionRateTrend — Weekly edit magnitude trend chart.
 * Shows whether curator edit distance is decreasing over time (= AI improving).
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { CuratorCorrectionRow } from '@/hooks/queries/useCuratorCorrections';

interface CorrectionRateTrendProps {
  corrections: CuratorCorrectionRow[];
}

interface WeekBucket {
  label: string;
  avgEditDistance: number;
  count: number;
}

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return `${start.getMonth() + 1}/${start.getDate()}`;
}

export function CorrectionRateTrend({ corrections }: CorrectionRateTrendProps) {
  const weeks = useMemo(() => {
    if (corrections.length === 0) return [];

    const buckets = new Map<string, { total: number; count: number; weekStart: Date }>();

    for (const c of corrections) {
      const date = new Date(c.created_at);
      const label = getWeekLabel(date);
      const existing = buckets.get(label);
      if (existing) {
        existing.total += c.edit_distance_percent;
        existing.count += 1;
      } else {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        buckets.set(label, { total: c.edit_distance_percent, count: 1, weekStart });
      }
    }

    const sorted = Array.from(buckets.entries())
      .map(([label, b]) => ({
        label,
        avgEditDistance: Math.round(b.total / b.count),
        count: b.count,
        weekStart: b.weekStart,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .slice(-8);

    return sorted;
  }, [corrections]);

  const trend = useMemo(() => {
    if (weeks.length < 2) return 'neutral';
    const first = weeks[0].avgEditDistance;
    const last = weeks[weeks.length - 1].avgEditDistance;
    if (last < first - 3) return 'improving';
    if (last > first + 3) return 'declining';
    return 'neutral';
  }, [weeks]);

  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'declining' ? TrendingUp : Minus;
  const trendColor = trend === 'improving' ? 'text-emerald-600' : trend === 'declining' ? 'text-amber-600' : 'text-muted-foreground';
  const trendLabel = trend === 'improving' ? 'Improving — curators editing less' : trend === 'declining' ? 'Declining — curators editing more' : 'Stable';

  const maxVal = Math.max(...weeks.map(w => w.avgEditDistance), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Correction Rate Trend</CardTitle>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trendLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weeks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Not enough data yet. Corrections will appear here as curators interact with AI suggestions.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {weeks.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-mono">{w.avgEditDistance}%</span>
                <div
                  className="w-full bg-primary/20 rounded-t"
                  style={{ height: `${(w.avgEditDistance / maxVal) * 60}px`, minHeight: '2px' }}
                />
                <span className="text-[9px] text-muted-foreground">{w.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
