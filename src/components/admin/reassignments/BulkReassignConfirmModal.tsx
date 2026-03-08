/**
 * MOD-M-05: Bulk Reassign Confirmation Modal
 * Entry points: Availability change to On_Leave/Inactive, "Reassign All Pending" in SCR-05-03
 */
import { useBulkReassignPreview } from '@/hooks/queries/useBulkReassignPreview';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { logWarning } from '@/lib/errorHandler';

interface BulkReassignConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  targetStatus: 'On_Leave' | 'Inactive';
  leaveStartDate?: string;
  leaveEndDate?: string;
  onConfirmed?: () => void;
}

function CompactSLABar({ slaStartAt, slaDurationSeconds }: { slaStartAt: string | null; slaDurationSeconds: number | null }) {
  if (!slaStartAt || !slaDurationSeconds) return null;
  const elapsed = (Date.now() - new Date(slaStartAt).getTime()) / 1000;
  const pct = Math.min((elapsed / slaDurationSeconds) * 100, 100);
  const isBreached = elapsed > slaDurationSeconds;

  return (
    <div className="w-[100px] h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full ${isBreached ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function getTierBadge(tier: string | null | undefined) {
  if (!tier || tier === 'NONE') return null;
  const config: Record<string, { label: string; className: string }> = {
    TIER1: { label: '⚠ T1', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    TIER2: { label: '🔴 T2', className: 'bg-red-100 text-red-800 border-red-300' },
    TIER3: { label: '🚨 T3', className: 'bg-red-200 text-red-900 border-red-400' },
  };
  const c = config[tier];
  return c ? <Badge variant="outline" className={c.className}>{c.label}</Badge> : null;
}

export function BulkReassignConfirmModal({
  open,
  onOpenChange,
  adminId,
  targetStatus,
  leaveStartDate,
  leaveEndDate,
  onConfirmed,
}: BulkReassignConfirmModalProps) {
  const { data: verifications, isLoading } = useBulkReassignPreview(adminId);
  const [isPending, setIsPending] = useState(false);

  const breachedCount = (verifications ?? []).filter(
    v => v.sla_breach_tier && v.sla_breach_tier !== 'NONE',
  ).length;

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      // Step 1: Update availability status
      const { error } = await supabase
        .from('platform_admin_profiles')
        .update({ availability_status: targetStatus })
        .eq('id', adminId);

      if (error) throw error;

      // Step 2: BR-MPA-044 / BR-MPA-005(e) — Invoke bulk-reassign edge function
      // to process all active verifications through the Auto-Assignment Engine
      try {
        const { error: fnError } = await supabase.functions.invoke('bulk-reassign', {
          body: {
            departing_admin_id: adminId,
            trigger: targetStatus === 'On_Leave' ? 'LEAVE' : 'DEACTIVATION',
          },
        });
        if (fnError) {
          logWarning('Bulk reassign invocation error: ' + String(fnError), { operation: 'bulk_reassign', component: 'BulkReassignConfirmModal' });
          // Non-blocking — status is already updated, reassignment is best-effort
        }
      } catch (fnErr) {
        logWarning('Bulk reassign function error: ' + String(fnErr), { operation: 'bulk_reassign', component: 'BulkReassignConfirmModal' });
      }

      toast.success(
        targetStatus === 'On_Leave'
          ? 'Status set to On Leave. Verifications are being reassigned.'
          : 'Status set to Inactive. Verifications are being reassigned.',
      );
      onConfirmed?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setIsPending(false);
    }
  };

  const title = targetStatus === 'On_Leave'
    ? 'Setting Status to On Leave — Review Pending Verifications'
    : 'Deactivating — Review Pending Verifications';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <p className="text-sm">
                <strong>You have {verifications?.length ?? 0} verification(s) currently assigned.</strong>{' '}
                All will be automatically reassigned.
              </p>

              {/* Preview table */}
              {verifications && verifications.length > 0 && (
                <div className="relative w-full overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">Org Name</th>
                        <th className="p-2 text-center">SLA</th>
                        <th className="p-2 text-center">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifications.map(v => (
                        <tr key={v.id} className="border-b last:border-0">
                          <td className="p-2 font-medium">{v.organization_name}</td>
                          <td className="p-2">
                            <CompactSLABar slaStartAt={v.sla_start_at} slaDurationSeconds={v.sla_duration_seconds} />
                          </td>
                          <td className="p-2 text-center">{getTierBadge(v.sla_breach_tier)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Info box */}
              <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Each verification will be processed through the Auto-Assignment Engine independently. Admins with matching domain expertise will be prioritized.</span>
              </div>

              {/* Breached warning */}
              {breachedCount > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>⚠ {breachedCount} of your verifications have active SLA breaches that require urgent reassignment.</span>
                </div>
              )}

              {/* Leave dates */}
              {(leaveStartDate || leaveEndDate) && (
                <div className="text-sm text-muted-foreground">
                  {leaveStartDate && <span>Leave from: {leaveStartDate}</span>}
                  {leaveEndDate && <span className="ml-3">Until: {leaveEndDate}</span>}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || isLoading}
          >
            {isPending
              ? 'Processing...'
              : targetStatus === 'On_Leave'
                ? 'Confirm & Go On Leave'
                : 'Confirm & Deactivate'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
