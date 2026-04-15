/**
 * AnalyseProgressPanel — Stage-based progress for unified AI flow.
 * Replaces WaveProgressPanel for the analyse/generate pipeline.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';

export type StageStatus = 'pending' | 'running' | 'completed' | 'error';

export interface ProgressStage {
  name: string;
  status: StageStatus;
  detail?: string;
}

export interface AnalyseProgressState {
  phase: 'idle' | 'running' | 'completed' | 'error';
  stages: ProgressStage[];
}

export const IDLE_PROGRESS: AnalyseProgressState = { phase: 'idle', stages: [] };

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}

interface AnalyseProgressPanelProps {
  progress: AnalyseProgressState;
}

export function AnalyseProgressPanel({ progress }: AnalyseProgressPanelProps) {
  if (progress.phase === 'idle') return null;

  const completed = progress.stages.filter((s) => s.status === 'completed').length;
  const total = progress.stages.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFinished = progress.phase === 'completed' || progress.phase === 'error';

  return (
    <Card className="border-border">
      <CardContent className="pt-3 pb-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          {progress.phase === 'running'
            ? 'AI Processing…'
            : progress.phase === 'completed'
              ? 'AI Processing Complete'
              : progress.phase === 'error'
                ? 'AI Processing — Error'
                : ''}
        </p>

        <Progress value={isFinished ? 100 : pct} className="h-2" />
        <p className="text-[10px] text-muted-foreground">
          {completed}/{total} stages · {isFinished ? 100 : pct}%
        </p>

        <div className="space-y-1.5">
          {progress.stages.map((stage, i) => (
            <div key={i} className="flex items-start gap-2">
              <StageIcon status={stage.status} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight">
                  {stage.name}
                </p>
                {stage.detail && (
                  <p className="text-[10px] text-muted-foreground">{stage.detail}</p>
                )}
                {stage.status === 'running' && !stage.detail && (
                  <p className="text-[10px] text-primary">processing…</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {progress.phase === 'completed' && (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
            All stages complete
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
