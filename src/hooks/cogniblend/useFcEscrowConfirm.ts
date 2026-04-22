import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import type { EscrowRecord } from '@/hooks/cogniblend/useEscrowDeposit';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { logStatusTransition } from '@/lib/cogniblend/statusHistoryLogger';
import { notifyEscrowConfirmed } from '@/lib/cogniblend/workflowNotifications';
import { getActiveRoleUsers } from '@/lib/cogniblend/challengeRoleLookup';
import { escrowFormSchema, type EscrowFormValues } from '@/pages/cogniblend/EscrowDepositForm';
import {
  buildEscrowFormDefaults,
  type OrgFinanceEscrowDefaults,
} from '@/services/cogniblend/fcFinanceWorkspaceViewService';

interface UseFcEscrowConfirmArgs {
  challengeId: string;
  userId: string | undefined;
  escrowId: string | null;
  escrowRecord: EscrowRecord | null;
  rewardTotal: number;
  orgFinanceDefaults?: OrgFinanceEscrowDefaults | null;
}

function maskAccountNumber(raw: string): string {
  if (!raw) return '';
  if (raw.length <= 6) return `****${raw.slice(-2)}`;
  return `${raw.slice(0, 2)}****${raw.slice(-4)}`;
}

export function useFcEscrowConfirm({
  challengeId,
  userId,
  escrowId,
  escrowRecord,
  rewardTotal,
  orgFinanceDefaults,
}: UseFcEscrowConfirmArgs) {
  const queryClient = useQueryClient();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const defaultValues = useMemo(
    () => buildEscrowFormDefaults(escrowRecord, rewardTotal, orgFinanceDefaults),
    [escrowRecord, rewardTotal, orgFinanceDefaults],
  );

  const form = useForm<EscrowFormValues>({
    resolver: zodResolver(escrowFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { clearPersistedData } = useFormPersistence(`cogni_escrow_${challengeId}`, form);

  const persistEscrowRecord = async (values: EscrowFormValues, markFunded: boolean) => {
    if (!userId) throw new Error('Not authenticated');

    let proofUrl = escrowRecord?.proof_document_url ?? null;
    let proofFileName = escrowRecord?.proof_file_name ?? null;
    let proofUploadedAt = escrowRecord?.proof_uploaded_at ?? null;

    if (markFunded && proofFile) {
      setProofUploading(true);
      try {
        const safeName = sanitizeFileName(proofFile.name);
        const storagePath = `${challengeId}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('escrow-proofs')
          .upload(storagePath, proofFile, { upsert: false });
        if (uploadError) throw new Error(`Proof upload failed: ${uploadError.message}`);
        proofUrl = storagePath;
        proofFileName = proofFile.name;
        proofUploadedAt = new Date().toISOString();
      } finally {
        setProofUploading(false);
      }
    }

    const escrowStatus = markFunded ? 'FUNDED' : escrowRecord?.escrow_status ?? 'PENDING';
    const persistedAmount = values.deposit_amount;
    const baseRow = {
      escrow_status: escrowStatus,
      deposit_amount: persistedAmount,
      remaining_amount: markFunded ? persistedAmount : Number(escrowRecord?.remaining_amount ?? persistedAmount),
      bank_name: values.bank_name,
      bank_branch: values.bank_branch ?? null,
      bank_address: values.bank_address ?? null,
      currency: values.currency,
      deposit_date: new Date(values.deposit_date).toISOString(),
      deposit_reference: values.deposit_reference,
      fc_notes: values.fc_notes ?? null,
      account_number_masked: values.account_number ? maskAccountNumber(values.account_number) : escrowRecord?.account_number_masked ?? null,
      ifsc_swift_code: values.ifsc_swift_code,
      proof_document_url: proofUrl,
      proof_file_name: proofFileName,
      proof_uploaded_at: proofUploadedAt,
    };

    if (escrowId) {
      const { error } = await supabase
        .from('escrow_records')
        .update({ ...baseRow, updated_at: new Date().toISOString(), updated_by: userId } as never)
        .eq('id', escrowId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('escrow_records')
        .insert({ ...baseRow, challenge_id: challengeId, created_by: userId } as never);
      if (error) throw new Error(error.message);
    }

    return values;
  };

  const saveDraft = useMutation({
    mutationFn: async (values: EscrowFormValues) => {
      await persistEscrowRecord(values, false);
      return values;
    },
    onSuccess: () => {
      toast.success('Escrow draft saved');
      clearPersistedData();
      queryClient.invalidateQueries({ queryKey: ['escrow-deposit', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-fc-detail', challengeId] });
    },
    onError: (error: Error) => {
      setProofUploading(false);
      handleMutationError(error, { operation: 'fc_save_escrow_draft' });
    },
  });

  const confirmEscrow = useMutation({
    mutationFn: async (values: EscrowFormValues) => {
      await persistEscrowRecord(values, true);

      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'ESCROW_FUNDED',
        method: 'FC_MANUAL',
        details: {
          amount: values.deposit_amount,
          currency: values.currency,
          bank_name: values.bank_name,
          deposit_reference: values.deposit_reference,
          ifsc_swift_code: values.ifsc_swift_code,
          proof_uploaded: !!proofUrl,
        },
      } as never);

      return values;
    },
    onSuccess: async (values) => {
      toast.success('Escrow deposit confirmed');

      if (userId) {
        void logStatusTransition({
          challengeId,
          fromStatus: 'PENDING_FC_ESCROW',
          toStatus: 'FC_ESCROW_CONFIRMED',
          changedBy: userId,
          role: 'FC',
          triggerEvent: 'ESCROW_DEPOSIT_CONFIRMED',
          metadata: { amount: values.deposit_amount, currency: values.currency },
        });
      }

      void (async () => {
        const curatorIds = await getActiveRoleUsers(challengeId, ['CU']);
        await Promise.all(
          curatorIds.map((curatorUserId) =>
            notifyEscrowConfirmed({
              challengeId,
              curatorUserId,
              amount: values.deposit_amount,
              currency: values.currency,
            }),
          ),
        );
      })();

      try {
        const { error } = await supabase.rpc('complete_financial_review', {
          p_challenge_id: challengeId,
          p_user_id: userId ?? '',
        });
        if (error) throw error;
      } catch (rpcError) {
        logWarning('complete_financial_review safety-net call failed', {
          operation: 'fc_confirm_escrow_safety_net',
          additionalData: {
            error: rpcError instanceof Error ? rpcError.message : String(rpcError),
          },
        });
      }

       form.reset(buildEscrowFormDefaults(escrowRecord, rewardTotal, orgFinanceDefaults));
      clearPersistedData();
      setProofFile(null);
      setProofUploading(false);

      [
        ['fc-escrow-challenges'],
        ['fc-challenge-queue'],
        ['escrow-deposit', challengeId],
        ['publication-readiness', challengeId],
        ['challenge-fc-detail', challengeId],
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },
    onError: (error: Error) => {
      setProofUploading(false);
      handleMutationError(error, { operation: 'fc_confirm_escrow' });
    },
  });

  const handleConfirmSubmit = (values: EscrowFormValues) => {
    if (!proofFile && !escrowRecord?.proof_document_url) {
      toast.error('Please upload deposit proof before submitting.');
      return;
    }
    if (!values.account_number.trim() && !escrowRecord?.account_number_masked) {
      toast.error('Please enter the bank account number before submitting.');
      return;
    }
    if (rewardTotal > 0 && Math.abs(values.deposit_amount - rewardTotal) > 0.01) {
      toast.error(
        `Deposit amount (${values.currency} ${values.deposit_amount.toLocaleString()}) does not match the challenge reward total (${values.currency} ${rewardTotal.toLocaleString()}). Please enter the exact amount.`,
      );
      return;
    }
    confirmEscrow.mutate(values);
  };

  const handleDraftSubmit = (values: EscrowFormValues) => {
    saveDraft.mutate(values);
  };

  return {
    form,
    proofFile,
    setProofFile,
    proofUploading,
    saveDraft,
    confirmEscrow,
    handleDraftSubmit,
    handleConfirmSubmit,
    clearForm: () => {
      form.reset(buildEscrowFormDefaults(escrowRecord, rewardTotal, orgFinanceDefaults));
      clearPersistedData();
      setProofFile(null);
    },
  };
}
