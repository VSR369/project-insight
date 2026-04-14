/**
 * WaveProgressPanel — Displays wave-by-wave AI review progress
 * in the right sidebar. Replaces the old Phase 2 progress bar.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Circle, XCircle, Ban } from 'lucide-react';
import type { WaveProgress } from '@/lib/cogniblend/waveConfig';

interface WaveProgressPanelProps {
  progress: WaveProgress;
  onCancel: () => void;
}

function WaveStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'cancelled':
      return <Ban className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40" />;
  }
}

export function WaveProgressPanel({ progress, onCancel }: WaveProgressPanelProps) {
  if (progress.overallStatus === 'idle') return null;

  const completedWaves = progress.waves.filter((w) => w.status === 'completed').length;
  const overallPct = progress.totalWaves > 0
    ? Math.round((completedWaves / progress.totalWaves) * 100)
    : 0;

  const isRunning = progress.overallStatus === 'running';
  const isFinished = progress.overallStatus === 'completed' || progress.overallStatus === 'cancelled';

  // Count totals for completion summary
  const totals = { reviewed: 0, generated: 0, skipped: 0, errored: 0 };
  for (const wave of progress.waves) {
    for (const s of wave.sections) {
      if (s.status === 'success') {
        if (s.action === 'review') totals.reviewed++;
        else if (s.action === 'generate') totals.generated++;
        else totals.skipped++;
      } else if (s.status === 'skipped') {
        totals.skipped++;
      } else if (s.status === 'error') {
        totals.errored++;
      }
    }
  }

  return (
    <Card className="border-border">
      <CardContent className="pt-3 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {isRunning
              ? `AI Review — Wave ${progress.currentWave} of ${progress.totalWaves}`
              : progress.overallStatus === 'completed'
                ? 'AI Review Complete'
                : progress.overallStatus === 'cancelled'
                  ? 'AI Review Cancelled'
                  : 'AI Review'}
          </p>
        </div>

        {/* Overall progress bar */}
        <Progress
          value={isFinished ? 100 : overallPct}
          className="h-2"
        />
        <p className="text-[10px] text-muted-foreground">
          {completedWaves}/{progress.totalWaves} waves · {overallPct}%
        </p>

        {/* Wave list */}
        <div className="space-y-1.5">
          {progress.waves.map((wave) => {
            const sectionCount = wave.sections.length;
            const successCount = wave.sections.filter((s) => s.status === 'success').length;
            const reviewedCount = wave.sections.filter((s) => s.status === 'success' && s.action === 'review').length;
            const generatedCount = wave.sections.filter((s) => s.status === 'success' && s.action === 'generate').length;

            return (
              <div key={wave.waveNumber} className="flex items-start gap-2">
                <WaveStatusIcon status={wave.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-tight">
                    Wave {wave.waveNumber}: {wave.name}
                    <span className="text-muted-foreground font-normal ml-1">
                      ({sectionCount} sections)
                    </span>
                  </p>
                  {wave.status === 'completed' && successCount > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {reviewedCount > 0 && `${reviewedCount} reviewed`}
                      {reviewedCount > 0 && generatedCount > 0 && ', '}
                      {generatedCount > 0 && `${generatedCount} drafted`}
                    </p>
                  )}
                  {wave.status === 'running' && (
                    <p className="text-[10px] text-primary">processing…</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion summary */}
        {isFinished && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {totals.reviewed > 0 && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                {totals.reviewed} Reviewed
              </Badge>
            )}
            {totals.generated > 0 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                {totals.generated} Drafted
              </Badge>
            )}
            {totals.skipped > 0 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {totals.skipped} Skipped
              </Badge>
            )}
            {totals.errored > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">
                {totals.errored} Errors
              </Badge>
            )}
          </div>
        )}

        {/* Cancel button */}
        {isRunning && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onCancel}
          >
            Cancel after current wave
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
