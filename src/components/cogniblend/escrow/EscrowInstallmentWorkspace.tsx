import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EscrowInstallmentContextCard } from './EscrowInstallmentContextCard';
import { EscrowInstallmentSummary } from './EscrowInstallmentSummary';
import { EscrowInstallmentTable } from './EscrowInstallmentTable';
import { EscrowFundingForm } from './EscrowFundingForm';
import { EscrowLegacySummary } from './EscrowLegacySummary';
import { useEscrowFundingContext } from '@/hooks/cogniblend/useEscrowFundingContext';
import { useSeedEscrowInstallments } from '@/hooks/cogniblend/useSeedEscrowInstallments';
import { useEscrowInstallmentFunding } from '@/hooks/cogniblend/useEscrowInstallmentFunding';
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
  const contextQuery = useEscrowFundingContext(challengeId);
  const seedMutation = useSeedEscrowInstallments(challengeId);
  const fundingMutation = useEscrowInstallmentFunding();
  const [selectedInstallment, setSelectedInstallment] = useState<EscrowInstallmentRecord | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const accessState = useMemo(() => deriveEscrowInstallmentAccessState({
    context: contextQuery.data,
    fundingRole,
    isReadOnly,
  }), [contextQuery.data, fundingRole, isReadOnly]);

  useEffect(() => {
    if (!contextQuery.data || !accessState.canSeed || seedMutation.isPending || seedMutation.isSuccess || isReadOnly) return;
    seedMutation.mutate({ context: contextQuery.data, userId });
  }, [accessState.canSeed, contextQuery.data, isReadOnly, seedMutation, userId]);

  useEffect(() => {
    if (!accessState.actionableInstallments.length) {
      setSelectedInstallment(null);
      return;
    }
    setSelectedInstallment((current) => current && accessState.actionableInstallments.some((item) => item.id === current.id)
      ? current
      : accessState.actionableInstallments[0]);
  }, [accessState.actionableInstallments]);

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
    });
  };

  return (
    <div className="space-y-4">
      <EscrowInstallmentContextCard context={context} fundingRole={fundingRole} />
      <EscrowInstallmentSummary context={context} />
      <EscrowInstallmentTable
        installments={context.installments}
        selectedInstallmentId={selectedInstallment?.id ?? null}
        onSelect={setSelectedInstallment}
        canSelect={accessState.canFund}
      />
      {selectedInstallment && accessState.canFund ? (
        <EscrowFundingForm
          installment={selectedInstallment}
          fundingRole={fundingRole}
          proofFile={proofFile}
          onProofFileChange={setProofFile}
          isSubmitting={fundingMutation.isPending}
          canSubmit={accessState.canFund && !isReadOnly}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}
