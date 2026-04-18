/**
 * RepairMalformedButton — One-click admin action embedded in the curation
 * header that scans the challenge for empty / `[object Object]` / raw-JSON /
 * truncated section content and regenerates clean AI suggestions for each.
 *
 * Two-step UX:
 *   1. Dry-run on open → shows the detected findings + counts
 *   2. Confirm → kicks off regeneration via review-challenge-sections
 *
 * The curator must subsequently click "Accept All AI Suggestions" to commit
 * the regenerated suggestions to the persisted DB columns.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  useRepairMalformedSections,
  type RepairDetection,
  type RepairResponse,
} from '@/hooks/queries/useRepairMalformedSections';
import { toast } from 'sonner';

interface RepairMalformedButtonProps {
  challengeId: string;
  disabled?: boolean;
}

const DETECTION_LABEL: Record<RepairDetection, string> = {
  empty: 'Empty content',
  json_in_text: 'Raw JSON stored as text',
  object_object: '[object Object] dump',
  truncated: 'Truncated mid-word',
  duplicated_token: 'Duplicated token (e.g. "ahindra ahindra")',
};

const DETECTION_VARIANT: Record<RepairDetection, 'destructive' | 'secondary' | 'outline'> = {
  empty: 'outline',
  json_in_text: 'destructive',
  object_object: 'destructive',
  truncated: 'secondary',
  duplicated_token: 'secondary',
};

export function RepairMalformedButton({ challengeId, disabled }: RepairMalformedButtonProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<'idle' | 'scanning' | 'preview' | 'repairing' | 'done'>('idle');
  const [report, setReport] = useState<RepairResponse | null>(null);
  const repairMut = useRepairMalformedSections();

  const handleOpen = async () => {
    setOpen(true);
    setStage('scanning');
    setReport(null);
    try {
      const data = await repairMut.mutateAsync({ challengeId, dryRun: true });
      setReport(data);
      setStage('preview');
    } catch {
      setOpen(false);
      setStage('idle');
    }
  };

  const handleConfirm = async () => {
    setStage('repairing');
    try {
      const data = await repairMut.mutateAsync({ challengeId, dryRun: false });
      setReport(data);
      setStage('done');
      const ok = data.summary?.regenerated ?? 0;
      const fail = data.summary?.failed ?? 0;
      if (ok > 0 && fail === 0) {
        toast.success(`Regenerated ${ok} section${ok === 1 ? '' : 's'}. Click "Accept All AI Suggestions" to apply.`);
      } else if (ok > 0 && fail > 0) {
        toast.warning(`Regenerated ${ok}, ${fail} failed — see details in dialog.`);
      } else {
        toast.error('Repair failed for all detected sections.');
      }
    } catch {
      setStage('preview');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStage('idle');
    setReport(null);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpen}
            disabled={disabled || repairMut.isPending}
          >
            {repairMut.isPending && stage !== 'preview'
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              : <Wrench className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Re-run Pass 2 for malformed sections</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Repair Malformed Sections
            </DialogTitle>
            <DialogDescription>
              Scans this challenge for empty, JSON-corrupted, or truncated content and
              regenerates clean AI suggestions. You'll still need to accept the regenerated
              suggestions to apply them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
            {stage === 'scanning' && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Scanning sections…
                </p>
              </div>
            )}

            {(stage === 'preview' || stage === 'repairing' || stage === 'done') && report && (
              <RepairFindingsList report={report} stage={stage} />
            )}
          </div>

          <DialogFooter className="gap-2">
            {stage === 'preview' && report && report.findings.length > 0 && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={repairMut.isPending}>
                  {repairMut.isPending && (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  )}
                  Regenerate {report.findings.length} section{report.findings.length === 1 ? '' : 's'}
                </Button>
              </>
            )}
            {stage === 'preview' && report && report.findings.length === 0 && (
              <Button onClick={handleClose}>Close</Button>
            )}
            {stage === 'repairing' && (
              <Button disabled>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Regenerating…
              </Button>
            )}
            {stage === 'done' && <Button onClick={handleClose}>Done</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RepairFindingsList({
  report,
  stage,
}: {
  report: RepairResponse;
  stage: 'preview' | 'repairing' | 'done';
}) {
  if (report.findings.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-md border bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/40 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">No malformed sections detected.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {report.message ?? 'This challenge is already clean and ready to export.'}
          </p>
        </div>
      </div>
    );
  }

  const repairedByKey = new Map(
    (report.repaired ?? []).map((r) => [r.section_key, r]),
  );

  return (
    <div className="space-y-2">
      {report.summary && stage === 'done' && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span><strong>{report.summary.scanned}</strong> scanned</span>
          <span>·</span>
          <span><strong>{report.summary.detected}</strong> detected</span>
          <span>·</span>
          <span className="text-emerald-600">
            <strong>{report.summary.regenerated}</strong> regenerated
          </span>
          {report.summary.failed > 0 && (
            <>
              <span>·</span>
              <span className="text-destructive">
                <strong>{report.summary.failed}</strong> failed
              </span>
            </>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {report.findings.map((f) => {
          const result = repairedByKey.get(f.section_key);
          return (
            <li
              key={f.section_key}
              className="rounded-md border p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-xs font-medium">{f.section_key}</span>
                <Badge variant={DETECTION_VARIANT[f.detection]} className="text-[10px]">
                  {DETECTION_LABEL[f.detection]}
                </Badge>
              </div>
              {f.preview && (
                <p className="text-xs text-muted-foreground font-mono break-all line-clamp-2">
                  {f.preview}
                </p>
              )}
              {result && (
                <div className="flex items-center gap-1.5 text-xs">
                  {result.status === 'regenerated' && (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Regenerated</span>
                    </>
                  )}
                  {result.status === 'error' && (
                    <>
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span className="text-destructive break-all">
                        {result.message ?? 'Error'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {stage === 'preview' && (
        <p className="text-xs text-muted-foreground pt-1">
          Regeneration calls the AI gateway once per section. After completion, click
          <strong> "Accept All AI Suggestions" </strong> to apply the new suggestions.
        </p>
      )}
    </div>
  );
}
