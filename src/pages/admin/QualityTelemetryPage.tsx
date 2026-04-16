/**
 * QualityTelemetryPage — Admin dashboard for AI review quality telemetry.
 */

import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQualityTelemetry } from '@/hooks/queries/useQualityTelemetry';
import { TelemetryStats } from '@/components/admin/telemetry/TelemetryStats';
import { TelemetryTable } from '@/components/admin/telemetry/TelemetryTable';

export default function QualityTelemetryPage() {
  const { rows, stats, isLoading } = useQualityTelemetry();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6" /> Quality Telemetry
        </h1>
        <p className="text-sm text-muted-foreground">
          Track AI review performance: duration, token usage, and cross-section findings.
        </p>
      </div>

      <TelemetryStats stats={stats} />
      <TelemetryTable rows={rows} />
    </div>
  );
}
