/**
 * WaveProgressPanel — Displays wave-by-wave AI review progress
 * with per-section detail in the right sidebar.
 * Supports dual-mode: Pass 1 (analyse) and Pass 2 (generate).
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  Ban,
  ChevronRight,
  MessageSquare,
  SkipForward,
  PenLine,
  Sparkles,
} from 'lucide-react';
import type { WaveProgress, WaveResult } from '@/lib/cogniblend/waveConfig';
import { SECTION_LABELS } from '@/lib/cogniblend/waveConfig';
import type { SectionKey } from '@/types/sections';

export type PassType = 'analyse' | 'generate';

interface WaveProgressPanelProps {
  progress: WaveProgress;
  onCancel: () => void;
  passType?: PassType;
  commentCounts?: Partial<Record<SectionKey, number>>;
  suggestionCounts?: Partial<Record<SectionKey, number>>;
}

const WaveStatusIcon = React.forwardRef<HTMLElement, { status: string }>(
  function WaveStatusIcon({ status }, _ref) {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
      case 'cancelled':
        return <Ban className="h-4 w-4 text-muted-foreground shrink-0" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
    }
  }
);

function SectionStatusIcon({ status, action }: { status: string; action: string }) {
  if (status === 'error') return <XCircle className="h-3 w-3 text-destructive shrink-0" />;
  if (status === 'skipped') return <SkipForward className="h-3 w-3 text-muted-foreground shrink-0" />;
  if (action === 'generate') return <PenLine className="h-3 w-3 text-blue-600 shrink-0" />;
  return <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />;
}

function SectionActionLabel({
  action,
  status,
  passType,
}: {
  action: string;
  status: string;
  passType: PassType;
}) {
  if (status === 'error') return <span className="text-destructive">Error</span>;
  if (status === 'skipped') return <span className="text-muted-foreground">Skipped</span>;

  if (passType === 'generate') {
    if (action === 'generate') return <span className="text-blue-600">Content Drafted</span>;
    return <span className="text-emerald-600">Suggestions Generated</span>;
  }

  // Pass 1 (analyse)
  if (action === 'generate') return <span className="text-blue-600">Drafted</span>;
  return <span className="text-emerald-600">Analysed</span>;
}

function WaveDetail({
  wave,
  passType,
  commentCounts,
  suggestionCounts,
}: {
  wave: WaveResult;
  passType: PassType;
  commentCounts?: Partial<Record<SectionKey, number>>;
  suggestionCounts?: Partial<Record<SectionKey, number>>;
}) {
  const [open, setOpen] = useState(false);
  const isExpandable = wave.status === 'completed' || wave.status === 'error';
  const sectionCount = wave.sections.length;
  const successCount = wave.sections.filter((s) => s.status === 'success').length;
  const reviewedCount = wave.sections.filter(
    (s) => s.status === 'success' && s.action === 'review',
  ).length;
  const generatedCount = wave.sections.filter(
    (s) => s.status === 'success' && s.action === 'generate',
  ).length;

  const summaryLabel = passType === 'generate'
    ? `${reviewedCount > 0 ? `${reviewedCount} suggestions` : ''}${reviewedCount > 0 && generatedCount > 0 ? ', ' : ''}${generatedCount > 0 ? `${generatedCount} drafted` : ''}`
    : `${reviewedCount > 0 ? `${reviewedCount} analysed` : ''}${reviewedCount > 0 && generatedCount > 0 ? ', ' : ''}${generatedCount > 0 ? `${generatedCount} drafted` : ''}`;

  const counts = passType === 'generate' ? suggestionCounts : commentCounts;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-start gap-2">
        <WaveStatusIcon status={wave.status} />
        <div className="min-w-0 flex-1">
          {isExpandable ? (
            <CollapsibleTrigger className="flex items-center gap-1 text-left w-full group">
              <ChevronRight
                className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${
                  open ? 'rotate-90' : ''
                }`}
              />
              <p className="text-xs font-medium text-foreground leading-tight">
                Wave {wave.waveNumber}: {wave.name}
                <span className="text-muted-foreground font-normal ml-1">
                  ({sectionCount})
                </span>
              </p>
            </CollapsibleTrigger>
          ) : (
            <p className="text-xs font-medium text-foreground leading-tight">
              Wave {wave.waveNumber}: {wave.name}
              <span className="text-muted-foreground font-normal ml-1">
                ({sectionCount} sections)
              </span>
            </p>
          )}

          {wave.status === 'completed' && successCount > 0 && !open && (
            <p className="text-[10px] text-muted-foreground ml-4">
              {summaryLabel}
            </p>
          )}
          {wave.status === 'running' && (
            <p className="text-[10px] text-primary ml-4">processing…</p>
          )}

          <CollapsibleContent>
            <div className="mt-1.5 ml-4 space-y-1 border-l border-border pl-2">
              {wave.sections.map((s) => {
                const label =
                  SECTION_LABELS[s.sectionId as SectionKey] ?? s.sectionId;
                const count = counts?.[s.sectionId as SectionKey];
                const CountIcon = passType === 'generate' ? Sparkles : MessageSquare;
                return (
                  <div
                    key={s.sectionId}
                    className="flex items-center gap-1.5 text-[10px]"
                  >
                    <SectionStatusIcon status={s.status} action={s.action} />
                    <span className="truncate text-foreground">{label}</span>
                    <span className="text-muted-foreground">—</span>
                    <SectionActionLabel action={s.action} status={s.status} passType={passType} />
                    {count != null && count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                        <CountIcon className="h-2.5 w-2.5" />
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

export function WaveProgressPanel({
  progress,
  onCancel,
  passType = 'analyse',
  commentCounts,
  suggestionCounts,
}: WaveProgressPanelProps) {
  if (progress.overallStatus === 'idle') return null;

  const completedWaves = progress.waves.filter(
    (w) => w.status === 'completed',
  ).length;
  const overallPct =
    progress.totalWaves > 0
      ? Math.round((completedWaves / progress.totalWaves) * 100)
      : 0;

  const isRunning = progress.overallStatus === 'running';
  const isFinished =
    progress.overallStatus === 'completed' ||
    progress.overallStatus === 'cancelled';

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

  const headerLabel = (() => {
    const prefix = passType === 'generate' ? 'Generate Suggestions' : 'AI Analysis';
    if (isRunning) return `${prefix} — Wave ${progress.currentWave} of ${progress.totalWaves}`;
    if (progress.overallStatus === 'completed') return `${prefix} Complete`;
    if (progress.overallStatus === 'cancelled') return `${prefix} Cancelled`;
    return prefix;
  })();

  const reviewedBadgeLabel = passType === 'generate' ? 'Suggestions' : 'Analysed';
  const draftedBadgeLabel = passType === 'generate' ? 'Content Drafted' : 'Drafted';

  return (
    <Card className="border-border">
      <CardContent className="pt-3 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {headerLabel}
          </p>
        </div>

        <Progress value={isFinished ? 100 : overallPct} className="h-2" />
        <p className="text-[10px] text-muted-foreground">
          {completedWaves}/{progress.totalWaves} waves · {overallPct}%
        </p>

        <div className="space-y-1.5">
          {progress.waves.map((wave) => (
            <WaveDetail
              key={wave.waveNumber}
              wave={wave}
              passType={passType}
              commentCounts={commentCounts}
              suggestionCounts={suggestionCounts}
            />
          ))}
        </div>

        {isFinished && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {totals.reviewed > 0 && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                {totals.reviewed} {reviewedBadgeLabel}
              </Badge>
            )}
            {totals.generated > 0 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                {totals.generated} {draftedBadgeLabel}
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