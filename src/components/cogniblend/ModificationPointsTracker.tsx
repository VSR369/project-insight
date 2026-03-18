/**
 * ModificationPointsTracker — Displays modification points for a challenge.
 *
 * Used by:
 *  - Creator: can mark points as "Addressed" when resubmitting
 *  - Curator: can review and toggle point statuses (Addressed / Outstanding / Waived)
 *  - ID (read-only): sees current status of all points
 *
 * Shows a blocking banner when Required points are still Outstanding.
 */

import { useMemo } from 'react';
import {
  useModificationPointsByChallenge,
  useUpdatePointStatus,
  type ModificationPoint,
} from '@/hooks/cogniblend/useModificationPoints';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModificationPointsTrackerProps {
  challengeId: string;
  /** 'creator' = checkbox toggle, 'curator' = dropdown toggle, 'readonly' = view only */
  mode: 'creator' | 'curator' | 'readonly';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<string, string> = {
  REQUIRED: 'bg-destructive/10 text-destructive border-destructive/30',
  RECOMMENDED: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  OPTIONAL: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLES: Record<string, string> = {
  OUTSTANDING: 'bg-destructive/10 text-destructive border-destructive/30',
  ADDRESSED: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  WAIVED: 'bg-muted text-muted-foreground border-border',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModificationPointsTracker({
  challengeId,
  mode,
}: ModificationPointsTrackerProps) {
  // ══════════════════════════════════════
  // SECTION 1: Hooks
  // ══════════════════════════════════════
  const { user } = useAuth();
  const { data: points = [], isLoading } = useModificationPointsByChallenge(challengeId);
  const updateStatus = useUpdatePointStatus();

  // ══════════════════════════════════════
  // SECTION 2: Computed
  // ══════════════════════════════════════
  const hasOutstandingRequired = useMemo(
    () => points.some((p) => p.severity === 'REQUIRED' && p.status === 'OUTSTANDING'),
    [points],
  );

  const stats = useMemo(() => {
    const total = points.length;
    const addressed = points.filter((p) => p.status === 'ADDRESSED').length;
    const outstanding = points.filter((p) => p.status === 'OUTSTANDING').length;
    const waived = points.filter((p) => p.status === 'WAIVED').length;
    return { total, addressed, outstanding, waived };
  }, [points]);

  // ══════════════════════════════════════
  // SECTION 3: Handlers
  // ══════════════════════════════════════
  const handleCreatorToggle = (point: ModificationPoint, checked: boolean) => {
    if (!user?.id) return;
    updateStatus.mutate({
      pointId: point.id,
      status: checked ? 'ADDRESSED' : 'OUTSTANDING',
      userId: user.id,
    });
  };

  const handleCuratorChange = (point: ModificationPoint, newStatus: string) => {
    if (!user?.id) return;
    updateStatus.mutate({
      pointId: point.id,
      status: newStatus as 'ADDRESSED' | 'WAIVED' | 'OUTSTANDING',
      userId: user.id,
    });
  };

  // ══════════════════════════════════════
  // SECTION 4: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (points.length === 0) return null;

  // ══════════════════════════════════════
  // SECTION 5: Render
  // ══════════════════════════════════════
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Modification Points
        </CardTitle>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {stats.addressed}/{stats.total} addressed
          </span>
          {stats.outstanding > 0 && (
            <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES.OUTSTANDING}`}>
              {stats.outstanding} outstanding
            </Badge>
          )}
          {stats.waived > 0 && (
            <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES.WAIVED}`}>
              {stats.waived} waived
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {/* Blocking banner for required outstanding */}
        {hasOutstandingRequired && mode !== 'readonly' && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-medium">
              {mode === 'creator'
                ? 'You must address all Required points before resubmitting.'
                : 'All Required points must be Addressed or Waived before submitting to ID.'}
            </p>
          </div>
        )}

        {/* Points list */}
        {points.map((point) => (
          <div
            key={point.id}
            className={`flex items-start gap-2.5 p-3 rounded-lg border ${
              point.status === 'ADDRESSED'
                ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                : point.status === 'WAIVED'
                ? 'border-border bg-muted/30'
                : 'border-border'
            }`}
          >
            {/* Creator mode: checkbox */}
            {mode === 'creator' && (
              <Checkbox
                checked={point.status === 'ADDRESSED'}
                onCheckedChange={(checked) => handleCreatorToggle(point, !!checked)}
                disabled={updateStatus.isPending}
                className="mt-0.5 shrink-0"
              />
            )}

            {/* Read-only icon */}
            {mode === 'readonly' && (
              <div className="mt-0.5 shrink-0">
                {point.status === 'ADDRESSED' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <p
                className={`text-sm ${
                  point.status === 'ADDRESSED'
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                }`}
              >
                {point.description}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${SEVERITY_STYLES[point.severity] ?? ''}`}
                >
                  {point.severity}
                </Badge>
                {mode === 'readonly' && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${STATUS_STYLES[point.status] ?? ''}`}
                  >
                    {point.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Curator mode: dropdown */}
            {mode === 'curator' && (
              <Select
                value={point.status}
                onValueChange={(val) => handleCuratorChange(point, val)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="h-7 w-[120px] text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTSTANDING">Outstanding</SelectItem>
                  <SelectItem value="ADDRESSED">Addressed</SelectItem>
                  <SelectItem value="WAIVED">Waived</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
