import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { escrowFormSchema, type EscrowFormValues } from '@/pages/cogniblend/EscrowDepositForm';
import { buildEscrowFormDefaults, type OrgFinanceEscrowDefaults } from '@/services/cogniblend/fcFinanceWorkspaceViewService';
import type { EscrowRecord } from '@/hooks/cogniblend/useEscrowDeposit';

interface UseFcEscrowConfirmArgs {
  rewardTotal: number;
  escrowRecord: EscrowRecord | null;
  orgFinanceDefaults?: OrgFinanceEscrowDefaults | null;
}

export function useFcEscrowConfirm({ rewardTotal, escrowRecord, orgFinanceDefaults }: UseFcEscrowConfirmArgs) {
  const [proofFile, setProofFile] = useState<File | null>(null);

  const form = useForm<EscrowFormValues>({
    resolver: zodResolver(escrowFormSchema),
    defaultValues: buildEscrowFormDefaults(escrowRecord, rewardTotal, orgFinanceDefaults),
  });

  return {
    form,
    proofFile,
    setProofFile,
    proofUploading: false,
    saveDraft: { isPending: false },
    confirmEscrow: { isPending: false },
    handleDraftSubmit: (_values: EscrowFormValues) => undefined,
    handleConfirmSubmit: (_values: EscrowFormValues) => undefined,
    clearForm: () => {
      form.reset(buildEscrowFormDefaults(escrowRecord, rewardTotal, orgFinanceDefaults));
      setProofFile(null);
    },
  };
}
