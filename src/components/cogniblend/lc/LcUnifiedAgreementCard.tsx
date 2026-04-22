/**
 * LcUnifiedAgreementCard — Step 2/3 wrapper for the LC legal workspace.
 * Renders the Pass 3 review panel plus the Step 3 "approved" confirmation
 * banner. Extracted from LcLegalWorkspacePage to keep that file ≤ 250 lines.
 */
import { ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  LcPass3ReviewPanel,
  type ArmRegenerateFn,
  type Pass3ReviewState,
} from '@/components/cogniblend/lc/LcPass3ReviewPanel';

export interface LcUnifiedAgreementCardProps {
  review: Pass3ReviewState;
  isAccepted: boolean;
  reviewedAt: string | null;
  /** True when LC has submitted to curator (challenge.lc_compliance_complete). */
  isLocked?: boolean;
  onRegisterArm?: (fn: ArmRegenerateFn) => void;
}

export function LcUnifiedAgreementCard({
  review,
  isAccepted,
  reviewedAt,
  isLocked = false,
  onRegisterArm,
}: LcUnifiedAgreementCardProps) {
  return (
    <div className="space-y-4">
      <LcPass3ReviewPanel review={review} isLocked={isLocked} onRegisterArm={onRegisterArm} />

      {isAccepted && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Step 3 — Legal Documents Approved</AlertTitle>
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            The unified Solution Provider Agreement has been approved
            {reviewedAt
              ? ` on ${new Date(reviewedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
            . You can now submit your review to advance the challenge.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default LcUnifiedAgreementCard;
