/**
 * ApprovalReturnModal — "Modification Instructions" dialog.
 *
 * Enhanced: instead of just free-text reason, provides a structured list
 * of modification points with description + severity (Required / Recommended / Optional).
 * Also retains a summary reason field.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import type { ModificationPointInput } from '@/hooks/cogniblend/useModificationPoints';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, points: ModificationPointInput[]) => void;
  isPending: boolean;
}

type Severity = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

interface PointDraft {
  description: string;
  severity: Severity;
}

const SEVERITY_LABELS: Record<Severity, { label: string; className: string }> = {
  REQUIRED: { label: 'Required', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  RECOMMENDED: { label: 'Recommended', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' },
  OPTIONAL: { label: 'Optional', className: 'bg-muted text-muted-foreground border-border' },
};

const MIN_REASON_CHARS = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApprovalReturnModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApprovalReturnModalProps) {
  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const [reason, setReason] = useState('');
  const [points, setPoints] = useState<PointDraft[]>([
    { description: '', severity: 'REQUIRED' },
  ]);

  // ══════════════════════════════════════
  // SECTION 2: Handlers
  // ══════════════════════════════════════
  const handleAddPoint = useCallback(() => {
    setPoints((prev) => [...prev, { description: '', severity: 'RECOMMENDED' }]);
  }, []);

  const handleRemovePoint = useCallback((index: number) => {
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePointChange = useCallback(
    (index: number, field: keyof PointDraft, value: string) => {
      setPoints((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  const validPoints = points.filter((p) => p.description.trim().length > 0);
  const isValid = reason.trim().length >= MIN_REASON_CHARS && validPoints.length >= 1;

  const handleConfirm = () => {
    const cleanPoints: ModificationPointInput[] = validPoints.map((p) => ({
      description: p.description.trim(),
      severity: p.severity,
    }));
    onConfirm(reason.trim(), cleanPoints);
    // Reset
    setReason('');
    setPoints([{ description: '', severity: 'REQUIRED' }]);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setReason('');
      setPoints([{ description: '', severity: 'REQUIRED' }]);
    }
    onOpenChange(v);
  };

  // ══════════════════════════════════════
  // SECTION 3: Render
  // ══════════════════════════════════════
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Modification Instructions</DialogTitle>
          <DialogDescription>
            Provide structured modification points. Each point has a description and severity.
            The Curator/Creator must address all Required points before resubmission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4">
          {/* Summary Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="return-summary">Summary Reason *</Label>
            <Textarea
              id="return-summary"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="High-level reason for returning (min 20 characters)..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/{MIN_REASON_CHARS} characters minimum
            </p>
          </div>

          {/* Modification Points */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Modification Points *</Label>
              <Button variant="outline" size="sm" onClick={handleAddPoint}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Point
              </Button>
            </div>

            {points.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs">At least one modification point is required.</p>
              </div>
            )}

            {points.map((point, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-3 space-y-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground mt-2 shrink-0 w-5">
                    {i + 1}.
                  </span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={point.description}
                      onChange={(e) => handlePointChange(i, 'description', e.target.value)}
                      placeholder="Describe what needs to be modified..."
                      className="text-sm"
                    />
                    <RadioGroup
                      value={point.severity}
                      onValueChange={(val) => handlePointChange(i, 'severity', val)}
                      className="flex items-center gap-3"
                    >
                      {(['REQUIRED', 'RECOMMENDED', 'OPTIONAL'] as Severity[]).map((sev) => (
                        <div key={sev} className="flex items-center gap-1.5">
                          <RadioGroupItem value={sev} id={`sev-${i}-${sev}`} />
                          <label
                            htmlFor={`sev-${i}-${sev}`}
                            className="text-xs cursor-pointer select-none"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${SEVERITY_LABELS[sev].className}`}
                            >
                              {SEVERITY_LABELS[sev].label}
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleRemovePoint(i)}
                    disabled={points.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Summary badges */}
            {validPoints.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span>{validPoints.length} point{validPoints.length !== 1 ? 's' : ''}</span>
                {(['REQUIRED', 'RECOMMENDED', 'OPTIONAL'] as Severity[]).map((sev) => {
                  const count = validPoints.filter((p) => p.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={sev}
                      variant="outline"
                      className={`text-[10px] ${SEVERITY_LABELS[sev].className}`}
                    >
                      {count} {SEVERITY_LABELS[sev].label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1.5" />
            )}
            {isPending ? 'Returning...' : 'Return with Instructions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
