/**
 * MOD-M-04: Supervisor Reassign Modal
 * Entry points: "Assign →" on SCR-06-01, "Force Reassign" on SCR-06-02
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
import { EligibleAdminsTable } from './EligibleAdminsTable';
import { useEligibleAdmins } from '@/hooks/queries/useEligibleAdmins';
import { useReassignVerification } from '@/hooks/queries/useReassignVerification';
import { AlertTriangle, Inbox } from 'lucide-react';

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
  industrySegments?: string[];
  orgType?: string;
  currentAdminId?: string;
  reassignmentCount?: number;
}

export function SupervisorReassignModal({
  open,
  onOpenChange,
  verificationId,
  orgName,
  requestId,
  adminReason,
  hqCountry = '',
  industrySegments = [],
  orgType,
  currentAdminId,
  reassignmentCount = 0,
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
          {/* Org summary */}
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="font-medium text-sm">{orgName}</p>
          </div>

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
