/**
 * MOD-M-04: Supervisor Reassign Modal
 * Entry points: "Assign →" on SCR-06-01, "Force Reassign" on SCR-06-02
 * GAP-8: Current Admin info row
 * GAP-9: Org summary with industry chips, HQ country, tier badge, SLA bar
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { EligibleAdminsTable } from './EligibleAdminsTable';
import { IndustryTagChips } from '@/components/admin/verifications/IndustryTagChips';
import { useEligibleAdmins } from '@/hooks/queries/useEligibleAdmins';
import { useReassignVerification } from '@/hooks/queries/useReassignVerification';
import { AlertTriangle, Inbox, Globe, User } from 'lucide-react';

interface SupervisorReassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verificationId: string;
  orgName: string;
  /** If from inbox, the request ID to mark approved */
  requestId?: string;
  /** Original admin reason (shown as reference) */
  adminReason?: string;
  /** Org context for eligible admins RPC */
  hqCountry?: string;
  hqCountryName?: string;
  industrySegments?: string[];
  industryNames?: string[];
  orgType?: string;
  currentAdminId?: string;
  currentAdminName?: string;
  currentAdminAvailability?: string;
  currentAdminPendingCount?: number;
  reassignmentCount?: number;
  /** SLA context */
  slaBreachTier?: string;
  slaStartAt?: string | null;
  slaDurationSeconds?: number | null;
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

export function SupervisorReassignModal({
  open,
  onOpenChange,
  verificationId,
  orgName,
  requestId,
  adminReason,
  hqCountry = '',
  hqCountryName,
  industrySegments = [],
  industryNames = [],
  orgType,
  currentAdminId,
  currentAdminName,
  currentAdminAvailability,
  currentAdminPendingCount,
  reassignmentCount = 0,
  slaBreachTier,
  slaStartAt,
  slaDurationSeconds,
}: SupervisorReassignModalProps) {
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [useQueue, setUseQueue] = useState(false);
  const [reason, setReason] = useState('');

  const { data: eligibleAdmins, isLoading: loadingAdmins } = useEligibleAdmins(
    hqCountry || industrySegments.length > 0
      ? { hqCountry, industrySegments, orgType, excludeAdminId: currentAdminId }
      : undefined
  );

  const reassignMutation = useReassignVerification();

  const isValid = reason.trim().length >= 20 && (useQueue || selectedAdminId);
  const isNearLimit = reassignmentCount >= 2;

  const handleConfirm = () => {
    reassignMutation.mutate(
      {
        verificationId,
        toAdminId: useQueue ? null : selectedAdminId,
        reason: reason.trim(),
        trigger: requestId ? 'ADMIN_REQUEST' : 'MANUAL',
        requestId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Reassign Verification</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          {/* GAP-9: Org summary with industry, country, tier, SLA */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{orgName}</p>
              <div className="flex items-center gap-2">
                {getTierBadge(slaBreachTier)}
                <CompactSLABar slaStartAt={slaStartAt ?? null} slaDurationSeconds={slaDurationSeconds ?? null} />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {hqCountryName && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {hqCountryName}
                </span>
              )}
              {industryNames.length > 0 && (
                <IndustryTagChips tags={industryNames} maxVisible={3} />
              )}
            </div>
          </div>

          {/* GAP-8: Current admin info row */}
          {currentAdminName && (
            <div className="rounded-md border bg-muted/20 p-3 flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                Currently assigned to <strong>{currentAdminName}</strong>
                {currentAdminAvailability && (
                  <> · <Badge variant="outline" className="text-[10px] px-1.5 py-0">{currentAdminAvailability}</Badge></>
                )}
                {currentAdminPendingCount !== undefined && (
                  <> · {currentAdminPendingCount} pending</>
                )}
              </span>
            </div>
          )}

          {/* Admin's original reason (from inbox) */}
          {adminReason && (
            <div className="rounded-md border border-muted bg-muted/20 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Admin's Reason:</p>
              <p className="italic">{adminReason}</p>
            </div>
          )}

          {/* Near-limit warning */}
          {isNearLimit && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>This is the last allowed reassignment ({reassignmentCount}/3).</span>
            </div>
          )}

          {/* Supervisor reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reassignment Reason (min 20 characters)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reassignment reason..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{reason.length}/20 characters minimum</p>
          </div>

          {/* Queue checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="use-queue"
              checked={useQueue}
              onCheckedChange={(checked) => {
                setUseQueue(checked === true);
                if (checked) setSelectedAdminId(null);
              }}
            />
            <label htmlFor="use-queue" className="text-sm cursor-pointer">
              Place in Open Queue instead
            </label>
          </div>

          {/* Eligible admins table */}
          {!useQueue && (
            <>
              {loadingAdmins ? (
                <div className="text-center py-4 text-sm text-muted-foreground">Loading eligible admins...</div>
              ) : !eligibleAdmins || eligibleAdmins.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <Inbox className="h-4 w-4 shrink-0" />
                  <span>No eligible admins found. Consider placing in the Open Queue.</span>
                </div>
              ) : (
                <EligibleAdminsTable
                  admins={eligibleAdmins}
                  selectedAdminId={selectedAdminId}
                  onSelect={setSelectedAdminId}
                />
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || reassignMutation.isPending}
          >
            {reassignMutation.isPending ? 'Reassigning...' : 'Confirm Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
