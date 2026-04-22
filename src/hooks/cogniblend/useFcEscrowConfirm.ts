/**
 * useFcEscrowConfirm — Owns the escrow deposit confirmation flow for a
 * single challenge. Pure extraction of the logic that previously lived
 * inline in EscrowManagementPage. No business-rule changes.
 *
 * The mutation:
 *   1. Uploads the deposit proof to the escrow-proofs bucket
 *   2. Inserts/updates the escrow_records row → status FUNDED
 *   3. Logs an audit_trail entry
 *   4. Best-effort: status history + notify Curator
 *   5. Best-effort idempotent: complete_financial_review RPC (canonical
 *      submission path is the explicit "Submit Financial Review" button
 *      via useFcFinanceSubmit — this RPC call is a safety net so single-
 *      step deposits still complete).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { logStatusTransition } from '@/lib/cogniblend/statusHistoryLogger';
import { notifyEscrowConfirmed } from '@/lib/cogniblend/workflowNotifications';
import { getActiveRoleUsers } from '@/lib/cogniblend/challengeRoleLookup';
import {
  escrowFormSchema,
  type EscrowFormValues,
} from '@/pages/cogniblend/EscrowDepositForm';

interface UseFcEscrowConfirmArgs {
  challengeId: string;
  userId: string | undefined;
  escrowId: string | null;
  rewardTotal: number;
}

function maskAccountNumber(raw: string): string {
  if (!raw) return '';
  if (raw.length <= 6) return '****' + raw.slice(-2);
  return raw.slice(0, 2) + '****' + raw.slice(-4);
}

export function useFcEscrowConfirm({
  challengeId,
  userId,
  escrowId,
  rewardTotal,
}: UseFcEscrowConfirmArgs) {
  const queryClient = useQueryClient();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

  const form = useForm<EscrowFormValues>({
    resolver: zodResolver(escrowFormSchema),
    defaultValues: {
      bank_name: '',
      bank_branch: '',
      bank_address: '',
      currency: 'USD',
      deposit_amount: rewardTotal || 0,
      deposit_date: new Date().toISOString().split('T')[0],
      deposit_reference: '',
      account_number: '',
      ifsc_swift_code: '',
      fc_notes: '',
    },
  });

  const { clearPersistedData } = useFormPersistence(
    `cogni_escrow_${challengeId}`,
    form,
  );

  const confirmEscrow = useMutation({
    mutationFn: async (values: EscrowFormValues) => {
      if (!userId) throw new Error('Not authenticated');

      // 1. Upload proof.
      let proofUrl: string | null = null;
      let proofFileName: string | null = null;
      if (proofFile) {
        setProofUploading(true);
        try {
          const safeName = sanitizeFileName(proofFile.name);
          const storagePath = `${challengeId}/${Date.now()}_${safeName}`;
          const { error: uploadErr } = await supabase.storage
            .from('escrow-proofs')
            .upload(storagePath, proofFile, { upsert: false });
          if (uploadErr) throw new Error(`Proof upload failed: ${uploadErr.message}`);
          proofUrl = storagePath;
          proofFileName = proofFile.name;
        } finally {
          setProofUploading(false);
        }
      }

      const newColumns = {
        account_number_masked: maskAccountNumber(values.account_number),
        ifsc_swift_code: values.ifsc_swift_code,
        proof_document_url: proofUrl,
        proof_file_name: proofFileName,
        proof_uploaded_at: proofUrl ? new Date().toISOString() : null,
      };

      const baseRow = {
        escrow_status: 'FUNDED',
        deposit_amount: values.deposit_amount,
        remaining_amount: values.deposit_amount,
        bank_name: values.bank_name,
        bank_branch: values.bank_branch ?? null,
        bank_address: values.bank_address ?? null,
        currency: values.currency,
        deposit_date: new Date(values.deposit_date).toISOString(),
        deposit_reference: values.deposit_reference,
        fc_notes: values.fc_notes ?? null,
        ...newColumns,
      };

      if (escrowId) {
        const { error } = await supabase
          .from('escrow_records')
          .update({
            ...baseRow,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          } as never)
          .eq('id', escrowId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('escrow_records')
          .insert({
            ...baseRow,
            challenge_id: challengeId,
            created_by: userId,
          } as never);
        if (error) throw new Error(error.message);
      }

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

      // Best-effort status history.
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

      // Best-effort: notify Curator(s).
      void (async () => {
        const curatorIds = await getActiveRoleUsers(challengeId, ['CU']);
        await Promise.all(
          curatorIds.map((uid) =>
            notifyEscrowConfirmed({
              challengeId,
              curatorUserId: uid,
              amount: values.deposit_amount,
              currency: values.currency,
            }),
          ),
        );
      })();

      // Idempotent safety net: trigger phase advancement automatically too.
      // Canonical path is the explicit "Submit Financial Review" button.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)('complete_financial_review', {
          p_challenge_id: challengeId,
          p_user_id: userId,
        });
      } catch (rpcErr) {
        logWarning('complete_financial_review safety-net call failed', {
          operation: 'fc_confirm_escrow_safety_net',
          metadata: { error: rpcErr instanceof Error ? rpcErr.message : String(rpcErr) },
        });
      }

      form.reset();
      clearPersistedData();
      setProofFile(null);
      setProofUploading(false);

      queryClient.invalidateQueries({ queryKey: ['fc-escrow-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['fc-challenge-queue'] });
      queryClient.invalidateQueries({ queryKey: ['escrow-deposit', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['publication-readiness', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-fc-detail', challengeId] });
    },
    onError: (err: Error) => {
      setProofUploading(false);
      handleMutationError(err, { operation: 'fc_confirm_escrow' });
    },
  });

  const handleSubmit = (values: EscrowFormValues) => {
    if (!proofFile) {
      toast.error('Please upload deposit proof before submitting.');
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

  return {
    form,
    proofFile,
    setProofFile,
    proofUploading,
    confirmEscrow,
    handleSubmit,
    clearForm: () => {
      form.reset();
      clearPersistedData();
      setProofFile(null);
    },
  };
}
