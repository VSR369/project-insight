/**
 * TelemetryTable — Displays AI review telemetry records.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { TelemetryRow } from '@/hooks/queries/useQualityTelemetry';

interface TelemetryTableProps {
  rows: TelemetryRow[];
}

export function TelemetryTable({ rows }: TelemetryTableProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Review Telemetry</h3>
          <Badge variant="secondary">{rows.length} records</Badge>
        </div>
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Date</th>
                <th className="pb-2 font-medium text-muted-foreground">Challenge</th>
                <th className="pb-2 font-medium text-muted-foreground">Sections</th>
                <th className="pb-2 font-medium text-muted-foreground">Pass 1</th>
                <th className="pb-2 font-medium text-muted-foreground">Pass 2</th>
                <th className="pb-2 font-medium text-muted-foreground">Consistency</th>
                <th className="pb-2 font-medium text-muted-foreground">Ambiguity</th>
                <th className="pb-2 font-medium text-muted-foreground">Duration</th>
                <th className="pb-2 font-medium text-muted-foreground">Model</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 font-mono text-xs">{r.challenge_id.slice(0, 8)}</td>
                  <td className="py-2 font-mono text-xs">{r.sections_reviewed ?? '—'}</td>
                  <td className="py-2 font-mono text-xs">{(r.pass1_tokens ?? 0).toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs">{(r.pass2_tokens ?? 0).toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs">{r.consistency_findings_count}</td>
                  <td className="py-2 font-mono text-xs">{r.ambiguity_findings_count}</td>
                  <td className="py-2 font-mono text-xs">{r.review_duration_seconds ?? '—'}s</td>
                  <td className="py-2 text-xs">{r.model_used ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No telemetry recorded yet. Data appears after AI reviews are run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
