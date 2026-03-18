/**
 * AmendmentDetailPanel — Expandable detail view for a single amendment.
 *
 * Shows modification points as severity-tagged checkboxes (REQUIRED / RECOMMENDED / OPTIONAL)
 * matching the M-14-C curation review pattern.
 */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';

/* ─── Types ──────────────────────────────────────────────── */

export interface ModificationPoint {
  id: string;
  text: string;
  severity: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  status: 'OPEN' | 'ADDRESSED' | 'WAIVED';
}

interface AmendmentDetailPanelProps {
  amendmentId: string;
  challengeId: string;
  amendmentNumber: number;
  status: string;
  scopeOfChange: string | null;
  reason: string | null;
  isMaterial: boolean;
  createdAt: string;
  withdrawalDeadline?: string | null;
  /** Whether the current user can edit modification points */
  canEdit: boolean;
}

/* ─── Severity styles ────────────────────────────────────── */

const SEVERITY_STYLE: Record<string, string> = {
  REQUIRED: 'bg-[hsl(0,60%,93%)] text-[hsl(0,55%,40%)] border-transparent',
  RECOMMENDED: 'bg-[hsl(38,60%,92%)] text-[hsl(38,55%,35%)] border-transparent',
  OPTIONAL: 'bg-muted text-muted-foreground border-transparent',
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'text-[hsl(38,65%,42%)]',
  ADDRESSED: 'text-[hsl(145,50%,35%)]',
  WAIVED: 'text-muted-foreground line-through',
};

/* ─── Helpers ────────────────────────────────────────────── */

function parseScopeAreas(scopeOfChange: string | null): string[] {
  if (!scopeOfChange) return [];
  try {
    const parsed = JSON.parse(scopeOfChange);
    return Array.isArray(parsed?.areas) ? parsed.areas : [];
  } catch {
    return [scopeOfChange];
  }
}

function parseModificationPoints(scopeOfChange: string | null): ModificationPoint[] {
  if (!scopeOfChange) return [];
  try {
    const parsed = JSON.parse(scopeOfChange);
    return Array.isArray(parsed?.modification_points) ? parsed.modification_points : [];
  } catch {
    return [];
  }
}

/* ─── Component ──────────────────────────────────────────── */

export function AmendmentDetailPanel({
  amendmentId,
  challengeId,
  amendmentNumber,
  status,
  scopeOfChange,
  reason,
  isMaterial,
  createdAt,
  withdrawalDeadline,
  canEdit,
}: AmendmentDetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [points, setPoints] = useState<ModificationPoint[]>(() => parseModificationPoints(scopeOfChange));
  const [newPointText, setNewPointText] = useState('');
  const [newPointSeverity, setNewPointSeverity] = useState<'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL'>('RECOMMENDED');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const areas = parseScopeAreas(scopeOfChange);
  const hasWithdrawalWindow = isMaterial && withdrawalDeadline;
  const deadlineActive = hasWithdrawalWindow && new Date(withdrawalDeadline).getTime() > Date.now();

  const requiredOpen = points.filter((p) => p.severity === 'REQUIRED' && p.status === 'OPEN');

  /* ── Save modification points to scope_of_change JSON ── */
  const savePoints = async (updatedPoints: ModificationPoint[]) => {
    setSaving(true);
    try {
      const currentScope = scopeOfChange ? JSON.parse(scopeOfChange) : {};
      const newScope = JSON.stringify({
        ...currentScope,
        modification_points: updatedPoints,
      });

      const withAudit = await withUpdatedBy({
        scope_of_change: newScope,
        updated_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('amendment_records')
        .update(withAudit)
        .eq('id', amendmentId);

      if (error) throw new Error(error.message);

      setPoints(updatedPoints);
      queryClient.invalidateQueries({ queryKey: ['amendments', challengeId] });
      toast.success('Modification points updated');
    } catch (err) {
      toast.error('Failed to save modification points');
    } finally {
      setSaving(false);
    }
  };

  const addPoint = () => {
    if (!newPointText.trim()) return;
    const newPoint: ModificationPoint = {
      id: crypto.randomUUID(),
      text: newPointText.trim(),
      severity: newPointSeverity,
      status: 'OPEN',
    };
    const updated = [...points, newPoint];
    savePoints(updated);
    setNewPointText('');
  };

  const togglePointStatus = (pointId: string, newStatus: 'ADDRESSED' | 'WAIVED') => {
    const updated = points.map((p) =>
      p.id === pointId ? { ...p, status: p.status === newStatus ? 'OPEN' as const : newStatus } : p,
    );
    savePoints(updated);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row — clickable to expand */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-semibold text-foreground">
          Amendment #{amendmentNumber}
        </span>
        {isMaterial && (
          <AlertTriangle className="h-3.5 w-3.5 text-[hsl(38,70%,45%)]" />
        )}
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          {format(new Date(createdAt), 'dd MMM yyyy')}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Status + scope */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <Badge variant="secondary" className="text-[10px]">{status}</Badge>
            {areas.map((area) => (
              <Badge key={area} variant="outline" className="text-[10px]">{area}</Badge>
            ))}
            {isMaterial && (
              <Badge className="bg-[hsl(38,60%,92%)] text-[hsl(38,65%,32%)] border-transparent text-[10px]">
                Material Change
              </Badge>
            )}
          </div>

          {/* Reason */}
          {reason && (
            <p className="text-sm text-muted-foreground">{reason}</p>
          )}

          {/* Withdrawal deadline countdown */}
          {hasWithdrawalWindow && (
            <div className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
              deadlineActive
                ? 'border-[hsl(38,60%,70%)] bg-[hsl(38,60%,96%)] text-[hsl(38,55%,30%)]'
                : 'border-border bg-muted text-muted-foreground'
            )}>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {deadlineActive
                ? `Withdrawal window: ${formatDistanceToNow(new Date(withdrawalDeadline), { addSuffix: true })} (${format(new Date(withdrawalDeadline), 'dd MMM yyyy HH:mm')})`
                : `Withdrawal window expired (${format(new Date(withdrawalDeadline), 'dd MMM yyyy')})`}
            </div>
          )}

          <Separator />

          {/* ── Modification Points ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Modification Points
              {requiredOpen.length > 0 && (
                <span className="ml-2 text-[hsl(0,55%,45%)] normal-case tracking-normal font-medium">
                  ({requiredOpen.length} required open)
                </span>
              )}
            </h4>

            {points.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No modification points defined yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {points.map((point) => (
                  <li key={point.id} className="flex items-start gap-2.5">
                    {canEdit ? (
                      <Checkbox
                        checked={point.status === 'ADDRESSED'}
                        onCheckedChange={() => togglePointStatus(point.id, 'ADDRESSED')}
                        className="mt-0.5"
                        disabled={saving}
                      />
                    ) : (
                      <span className={cn(
                        'mt-1 h-3 w-3 rounded-full shrink-0 border',
                        point.status === 'ADDRESSED'
                          ? 'bg-[hsl(145,50%,45%)] border-[hsl(145,50%,45%)]'
                          : point.status === 'WAIVED'
                            ? 'bg-muted border-border'
                            : 'bg-transparent border-border'
                      )} />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-sm', STATUS_STYLE[point.status] ?? '')}>
                        {point.text}
                      </span>
                    </div>
                    <Badge variant="secondary" className={cn('text-[9px] shrink-0', SEVERITY_STYLE[point.severity])}>
                      {point.severity}
                    </Badge>
                    {canEdit && point.status === 'OPEN' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => togglePointStatus(point.id, 'WAIVED')}
                        disabled={saving}
                      >
                        Waive
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add new point (edit mode) */}
            {canEdit && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Textarea
                    value={newPointText}
                    onChange={(e) => setNewPointText(e.target.value)}
                    placeholder="Describe the required change…"
                    rows={2}
                    className="text-sm resize-none flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Severity:</Label>
                  {(['REQUIRED', 'RECOMMENDED', 'OPTIONAL'] as const).map((sev) => (
                    <button
                      key={sev}
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                        newPointSeverity === sev
                          ? SEVERITY_STYLE[sev]
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                      )}
                      onClick={() => setNewPointSeverity(sev)}
                    >
                      {sev}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 text-xs"
                    onClick={addPoint}
                    disabled={!newPointText.trim() || saving}
                  >
                    Add Point
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
