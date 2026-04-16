/**
 * TelemetryStats — Summary stat cards for AI review quality telemetry.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Clock, Cpu, AlertTriangle, BarChart3 } from 'lucide-react';
import type { TelemetryStats as TelemetryStatsType } from '@/hooks/queries/useQualityTelemetry';

interface TelemetryStatsProps {
  stats: TelemetryStatsType;
}

export function TelemetryStats({ stats }: TelemetryStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BarChart3 className="h-4 w-4" />
            Total Reviews
          </div>
          <p className="text-2xl font-bold">{stats.totalReviews}</p>
          <p className="text-xs text-muted-foreground mt-1">AI review runs recorded</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            Avg Duration
          </div>
          <p className="text-2xl font-bold">{stats.avgDurationSeconds}s</p>
          <p className="text-xs text-muted-foreground mt-1">Per review run</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Cpu className="h-4 w-4" />
            Avg Tokens
          </div>
          <p className="text-2xl font-bold">{stats.avgTokensPerReview.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Pass 1 + Pass 2 combined</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" />
            Avg Findings
          </div>
          <p className="text-2xl font-bold">{stats.avgFindings}</p>
          <p className="text-xs text-muted-foreground mt-1">Consistency + ambiguity per review</p>
        </CardContent>
      </Card>
    </div>
  );
}
