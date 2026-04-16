/**
 * WaveTimingTable — Per-wave duration display for a Pass execution record.
 * Pure presentational component. Reads start/complete timestamps already
 * persisted in the ExecutionRecord — no new state, no new effects.
 */

import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';
import type { ExecutionRecord } from '@/services/cogniblend/waveExecutionHistory';
import { computeWaveDurations, formatDuration } from '@/lib/cogniblend/waveTimingFormat';

interface Props {
  record: ExecutionRecord | null | undefined;
}

function statusBadgeVariant(status: string): 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'secondary';
  if (status === 'error' || status === 'cancelled') return 'destructive';
  return 'outline';
}

export function WaveTimingTable({ record }: Props) {
  // Tick every second so a live "running" wave shows growing elapsed time.
  const [, setTick] = useState(0);
  const hasLive = !!record?.waves.some((w) => w.status === 'running' && w.startedAt && !w.completedAt);
  useEffect(() => {
    if (!hasLive) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasLive]);

  if (!record || record.waves.length === 0) return null;

  const summary = computeWaveDurations(record);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 flex items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">Wave Timing</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Wave</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-28">Sections</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-28 text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.waves.map((w) => (
            <TableRow key={w.waveNumber}>
              <TableCell className="text-xs font-medium">#{w.waveNumber}</TableCell>
              <TableCell className="text-xs">{w.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {w.sectionsCompleted}/{w.sectionsTotal}
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(w.status)} className="text-[10px] capitalize">
                  {w.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums">
                {w.isLive ? (
                  <span className="text-muted-foreground">
                    {formatDuration(w.durationMs)} <span className="text-[10px]">(running…)</span>
                  </span>
                ) : (
                  formatDuration(w.durationMs)
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="text-xs font-semibold">Total</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {summary.totalSectionsCompleted}/{summary.totalSections}
            </TableCell>
            <TableCell />
            <TableCell className="text-xs text-right font-semibold tabular-nums">
              {formatDuration(summary.totalDurationMs)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
