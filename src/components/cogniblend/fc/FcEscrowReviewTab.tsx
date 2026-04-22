import type { UseFormReturn } from 'react-hook-form';
import { AlertCircle, Banknote } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EscrowDepositForm, type EscrowFormValues } from '@/pages/cogniblend/EscrowDepositForm';
import { RecommendedEscrowCard } from '@/components/cogniblend/fc/RecommendedEscrowCard';
import { FcEscrowConfirmedSummary } from '@/components/cogniblend/fc/FcEscrowConfirmedSummary';
import type { GovernanceMode } from '@/lib/governanceMode';
import type { EscrowRecord } from '@/hooks/cogniblend/useEscrowDeposit';

interface FcEscrowReviewTabProps {
  challengeId: string;
  governanceMode: GovernanceMode;
  currentPhase: number | null | undefined;
  rewardTotal: number;
  escrowRecord: EscrowRecord | null;
  isPreview: boolean;
  canEditDepositFields: boolean;
  canUploadProof: boolean;
  canConfirmEscrow: boolean;
  isFunded: boolean;
  fcDone: boolean;
  form: UseFormReturn<EscrowFormValues>;
  onSubmit: (values: EscrowFormValues) => void;
  onSaveDraft: (values: EscrowFormValues) => void;
  isSavingDraft: boolean;
  isPending: boolean;
  proofFile: File | null;
  onProofFileChange: (file: File | null) => void;
  proofUploading: boolean;
}

function formatCurrency(currency: string | null | undefined, amount: number): string {
  return `${currency ?? 'USD'} ${amount.toLocaleString()}`;
}

export function FcEscrowReviewTab({
  challengeId,
  governanceMode,
  currentPhase,
  rewardTotal,
  escrowRecord,
  isPreview,
  canEditDepositFields,
  canUploadProof,
  canConfirmEscrow,
  isFunded,
  fcDone,
  form,
  onSubmit,
  onSaveDraft,
  isSavingDraft,
  isPending,
  proofFile,
  onProofFileChange,
  proofUploading,
}: FcEscrowReviewTabProps) {
  const escrowStatus = escrowRecord?.escrow_status ?? 'PENDING';
  const showForm = !fcDone && !isFunded;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Banknote className="h-4 w-4 text-primary" />
            Escrow Status
            <Badge variant={isFunded ? 'default' : 'secondary'} className="ml-auto">
              {escrowStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-muted-foreground">Expected escrow</span>
            <span className="font-mono font-semibold">{formatCurrency(escrowRecord?.currency, rewardTotal)}</span>
          </div>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-muted-foreground">Lifecycle gate</span>
            <span>{isPreview ? `Preview only until Phase 3 (currently Phase ${currentPhase ?? '?'})` : 'Escrow submission is unlocked'}</span>
          </div>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-muted-foreground">Governance</span>
            <span>{governanceMode === 'CONTROLLED' ? 'Mandatory before publication' : 'Optional escrow flow'}</span>
          </div>
        </CardContent>
      </Card>

      {isPreview && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Create the FC deposit record</AlertTitle>
          <AlertDescription>
            Creator and Curator recommendations are shown below as context. Finance Coordinator captures the actual bank, proof, and funding record separately.
          </AlertDescription>
        </Alert>
      )}

      {!escrowRecord && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No escrow record yet</AlertTitle>
          <AlertDescription>
            Enter bank and deposit details below to prepare the finance review for this challenge.
          </AlertDescription>
        </Alert>
      )}

      <RecommendedEscrowCard challengeId={challengeId} />

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">FC Deposit Record</CardTitle>
            <p className="text-xs text-muted-foreground">
              Finance Coordinator completes escrow here: save deposit details, upload proof, confirm funding, then submit the review back to Curator.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <EscrowDepositForm
              form={form}
              onSubmit={onSubmit}
              onSaveDraft={onSaveDraft}
              isPending={isPending}
              isSavingDraft={isSavingDraft}
              proofFile={proofFile}
              onProofFileChange={onProofFileChange}
              proofUploading={proofUploading}
              governanceMode={governanceMode}
              canEditFields={canEditDepositFields}
              canUploadProof={canUploadProof}
              canSubmit={canConfirmEscrow}
              canSaveDraft={canEditDepositFields}
              maskedAccountNumber={escrowRecord?.account_number_masked ?? null}
              existingProofFileName={escrowRecord?.proof_file_name ?? null}
               previewMessage={isPreview ? 'This section creates the Finance Coordinator deposit record. Recommendation context above is not treated as saved funding data until FC saves it here.' : undefined}
            />
          </CardContent>
        </Card>
      )}

      {(fcDone || isFunded) && <FcEscrowConfirmedSummary escrow={escrowRecord} />}
    </div>
  );
}

export default FcEscrowReviewTab;
