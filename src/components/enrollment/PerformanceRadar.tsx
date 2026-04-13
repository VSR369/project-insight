/**
 * PerformanceRadar
 * 
 * Radar chart showing 6 performance dimensions using recharts.
 * Consumes data from useProviderPerformanceScore hook.
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import {
  useProviderPerformanceScore,
  extractDimensionScores,
} from '@/hooks/queries/useProviderPerformanceScore';
import { PERFORMANCE_DIMENSION_LABELS } from '@/constants/enrollment.constants';
import { analyzeDimensions } from '@/services/enrollment/performanceScoreService';
import { cn } from '@/lib/utils';

interface PerformanceRadarProps {
  providerId: string;
  className?: string;
}

export function PerformanceRadar({ providerId, className }: PerformanceRadarProps) {
  const { data: score, isLoading } = useProviderPerformanceScore(providerId);
  const dimensions = extractDimensionScores(score);

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!dimensions || !score) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No performance data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scores are computed after your first challenge participation
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = analyzeDimensions(dimensions);

  const chartData = Object.entries(PERFORMANCE_DIMENSION_LABELS).map(([key, label]) => ({
    dimension: label,
    score: dimensions[key as keyof typeof dimensions],
    fullMark: 100,
  }));

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance Radar
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            Composite: {score.composite_score}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9 }}
              tickCount={5}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Strengths summary */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Strongest:</span>
          <Badge variant="default" className="text-[10px]">
            {PERFORMANCE_DIMENSION_LABELS[analysis.strongest]}
          </Badge>
          <span className="text-muted-foreground ml-2">Weakest:</span>
          <Badge variant="outline" className="text-[10px]">
            {PERFORMANCE_DIMENSION_LABELS[analysis.weakest]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
