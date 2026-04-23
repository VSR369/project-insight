import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EscrowInstallmentContextCard } from './EscrowInstallmentContextCard';
import { EscrowInstallmentDetailsCard } from './EscrowInstallmentDetailsCard';
import { EscrowInstallmentSummary } from './EscrowInstallmentSummary';
import { EscrowInstallmentTable } from './EscrowInstallmentTable';
import { EscrowFundingForm } from './EscrowFundingForm';
import { EscrowLegacySummary } from './EscrowLegacySummary';
import { useEscrowFundingContext } from '@/hooks/cogniblend/useEscrowFundingContext';
import { useSeedEscrowInstallments } from '@/hooks/cogniblend/useSeedEscrowInstallments';
import { useEscrowInstallmentFunding } from '@/hooks/cogniblend/useEscrowInstallmentFunding';
import { useSignedUrl } from '@/hooks/cogniblend/useSignedUrl';
import { deriveEscrowInstallmentAccessState } from '@/services/cogniblend/escrowInstallments/escrowInstallmentAccessService';
import { isLegacyEscrowOnly } from '@/services/cogniblend/escrowInstallments/escrowInstallmentValidationService';
import type { EscrowFundingFormValues, EscrowFundingRole, EscrowInstallmentRecord } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';
import { handleQueryError } from '@/lib/errorHandler';

export interface EscrowInstallmentWorkspaceProps {
  challengeId: string;
  userId: string;
  fundingRole: EscrowFundingRole;
  isReadOnly: boolean;
}

export function EscrowInstallmentWorkspace({ challengeId, userId, fundingRole, isReadOnly }: EscrowInstallmentWorkspaceProps) {
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [editingFundedId, setEditingFundedId] = useState<string | null>(null);
  const contextQuery = useEscrowFundingContext(challengeId);
  const seedMutation = useSeedEscrowInstallments(challengeId);
  const fundingMutation = useEscrowInstallmentFunding();
  const { openSignedUrl } = useSignedUrl('escrow-proofs');

  const accessState = useMemo(() => deriveEscrowInstallmentAccessState({
    context: contextQuery.data,
    fundingRole,
    isReadOnly,
  }), [contextQuery.data, fundingRole, isReadOnly]);
  const selectedInstallment = useMemo<EscrowInstallmentRecord | null>(() => {
    if (!selectedInstallmentId) return null;
    return contextQuery.data?.installments.find((installment) => installment.id === selectedInstallmentId) ?? null;
  }, [contextQuery.data?.installments, selectedInstallmentId]);

  useEffect(() => {
    if (!contextQuery.data || !accessState.canSeed || seedMutation.isPending || seedMutation.isSuccess || isReadOnly) return;
    seedMutation.mutate({ context: contextQuery.data, userId });
  }, [accessState.canSeed, contextQuery.data, isReadOnly, seedMutation, userId]);

  useEffect(() => {
    if (!accessState.selectableInstallments.length) {
      setSelectedInstallmentId(null);
      return;
    }
    setSelectedInstallmentId((current) => current && accessState.selectableInstallments.some((item) => item.id === current)
      ? current
      : accessState.selectableInstallments[0]?.id ?? null);
  }, [accessState.selectableInstallments]);

  useEffect(() => {
    setEditingFundedId(null);
    setProofFile(null);
  }, [selectedInstallmentId]);

  useEffect(() => {
    if (!fundingMutation.isSuccess) return;
    setEditingFundedId(null);
    setProofFile(null);
  }, [fundingMutation.isSuccess]);

  if (contextQuery.isLoading) {
    return <div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (contextQuery.error) {
    const handled = handleQueryError(contextQuery.error, { operation: 'load_escrow_workspace', component: 'EscrowInstallmentWorkspace' }, false);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not load escrow schedule</AlertTitle>
        <AlertDescription>
          Reference ID: {handled.correlationId}
          <div className="mt-3"><Button type="button" variant="outline" size="sm" onClick={() => void contextQuery.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Retry</Button></div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!contextQuery.data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No escrow context found</AlertTitle>
        <AlertDescription>Challenge funding details are not available yet.</AlertDescription>
      </Alert>
    );
  }

  const context = contextQuery.data;

  if (isLegacyEscrowOnly(context)) {
    return <EscrowLegacySummary context={context} />;
  }

  if (context.installments.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No installments available yet</AlertTitle>
        <AlertDescription>The escrow schedule will appear here once installment rows are seeded.</AlertDescription>
      </Alert>
    );
  }

  const handleSubmit = (values: EscrowFundingFormValues) => {
    if (!selectedInstallment) return;
    fundingMutation.mutate({
      challengeId,
      userId,
      fundingRole,
      context,
      installment: selectedInstallment,
      values,
      proofFile,
      isFinalReadOnly: accessState.isFinalReadOnly,
    });
  };

  const canEditSelectedInstallment = !!selectedInstallment && accessState.editableInstallments.some((installment) => installment.id === selectedInstallment.id);
  const isPendingSelectedInstallment = selectedInstallment?.status === 'PENDING';
  const isFundedSelectedInstallment = selectedInstallment?.status === 'FUNDED';
  const isEditingFundedInstallment = !!selectedInstallment && editingFundedId === selectedInstallment.id;

  return (
    <div className="space-y-4">
      <EscrowInstallmentContextCard context={context} fundingRole={fundingRole} />
      <EscrowInstallmentSummary context={context} />
      <EscrowInstallmentTable
        installments={context.installments}
        selectedInstallmentId={selectedInstallment?.id ?? null}
        onSelect={(installment) => setSelectedInstallmentId(installment.id)}
        canSelect={accessState.selectableInstallments.length > 0}
        editableInstallmentIds={accessState.editableInstallments.map((installment) => installment.id)}
        isFinalReadOnly={accessState.isFinalReadOnly}
      />
      {selectedInstallment ? (
        <EscrowInstallmentDetailsCard installment={selectedInstallment} />
      ) : null}
      {selectedInstallment && isPendingSelectedInstallment && canEditSelectedInstallment ? (
        <EscrowFundingForm
          installment={selectedInstallment}
          fundingRole={fundingRole}
          mode="confirm"
          proofFile={proofFile}
          onOpenExistingProof={() => void openSignedUrl(selectedInstallment.proof_document_url)}
          onProofFileChange={setProofFile}
          isSubmitting={fundingMutation.isPending}
          canSubmit={accessState.canSubmitChanges && !accessState.isFinalReadOnly}
          onSubmit={handleSubmit}
        />
      ) : null}
      {selectedInstallment && isFundedSelectedInstallment && canEditSelectedInstallment && !accessState.isFinalReadOnly ? (
        isEditingFundedInstallment ? (
          <div className="space-y-3">
            <EscrowFundingForm
              installment={selectedInstallment}
              fundingRole={fundingRole}
              mode="edit"
              proofFile={proofFile}
              onOpenExistingProof={() => void openSignedUrl(selectedInstallment.proof_document_url)}
              onProofFileChange={setProofFile}
              isSubmitting={fundingMutation.isPending}
              canSubmit={accessState.canSubmitChanges && !accessState.isFinalReadOnly}
              onSubmit={handleSubmit}
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => {
              setEditingFundedId(null);
              setProofFile(null);
            }}>
              Cancel edit
            </Button>
          </div>
        ) : (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingFundedId(selectedInstallment.id)}>
              <Pencil className="h-4 w-4" />
              Edit funding details
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
