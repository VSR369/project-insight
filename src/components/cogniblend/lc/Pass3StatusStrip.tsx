/**
 * Pass3StatusStrip — Compact provenance strip for the unified agreement.
 * Visible at the top of the editor panel so users always know HOW the current
 * draft was produced (AI Pass 3 vs Organize & Merge), the run count, and
 * whether the upstream source docs have changed since.
 */
import { AlertTriangle, RefreshCw, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfirmRegenerateDialog } from '@/components/cogniblend/lc/ConfirmRegenerateDialog';
import { cn } from '@/lib/utils';

export type Pass3StatusKind = 'ai_suggested' | 'organized' | 'accepted';

export interface Pass3StatusStripProps {
  status: Pass3StatusKind;
  runCount: number;
  reviewedAt?: string | null;
  isStale?: boolean;
  onRerunAi?: () => void;
  onReorganize?: () => void;
  isBusy?: boolean;
  /** When true, regenerate clicks show the strong "edits will be lost" copy. */
  isDirty?: boolean;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const VARIANTS: Record<
  Pass3StatusKind,
  { dot: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ai_suggested: {
    dot: 'bg-emerald-500',
    label: 'Drafted by AI Pass 3',
    icon: Sparkles,
  },
  organized: {
    dot: 'bg-sky-500',
    label: 'Organized & Merged from sources',
    icon: FileText,
  },
  accepted: {
    dot: 'bg-violet-500',
    label: 'Approved — locked',
    icon: Sparkles,
  },
};

export function Pass3StatusStrip({
  status,
  runCount,
  reviewedAt,
  isStale,
  onRerunAi,
  onReorganize,
  isBusy,
  isDirty = false,
}: Pass3StatusStripProps) {
  const variant = VARIANTS[status];
  const Icon = variant.icon;
  const dateLabel = formatDate(reviewedAt);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
        <span className={cn('h-2 w-2 rounded-full', variant.dot)} aria-hidden="true" />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium text-foreground">{variant.label}</span>
        {runCount > 0 && (
          <span className="text-muted-foreground">· Run #{runCount}</span>
        )}
        {dateLabel && (
          <span className="text-muted-foreground">· {dateLabel}</span>
        )}
      </div>

      {isStale && status !== 'accepted' && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-sm">New source documents detected</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-xs">
              Source documents changed after the current draft was generated.
              Re-run to incorporate the latest content.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {onRerunAi && (
                <ConfirmRegenerateDialog
                  onConfirm={onRerunAi}
                  isDirty={isDirty}
                  disabled={isBusy}
                  mode="pass3"
                  trigger={
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Re-run AI Pass 3
                    </Button>
                  }
                />
              )}
              {onReorganize && (
                <ConfirmRegenerateDialog
                  onConfirm={onReorganize}
                  isDirty={isDirty}
                  disabled={isBusy}
                  mode="organize"
                  trigger={
                    <Button size="sm" variant="ghost" className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Re-organize
                    </Button>
                  }
                />
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default Pass3StatusStrip;
