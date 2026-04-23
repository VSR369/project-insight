import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { handleMutationError } from '@/lib/errorHandler';
import { validateInstallmentFunding } from '@/services/cogniblend/escrowInstallments/escrowInstallmentValidationService';
import type {
  EscrowFundingFormValues,
  EscrowFundingRole,
  EscrowInstallmentRecord,
  EscrowFundingContextData,
} from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

interface FundInstallmentArgs {
  challengeId: string;
  userId: string;
  fundingRole: EscrowFundingRole;
  context: EscrowFundingContextData;
  installment: EscrowInstallmentRecord;
  values: EscrowFundingFormValues;
  proofFile: File | null;
  isFinalReadOnly: boolean;
}

function maskAccountNumber(raw: string): string {
  if (!raw) return '';
  if (raw.length <= 6) return `****${raw.slice(-2)}`;
  return `${raw.slice(0, 2)}****${raw.slice(-4)}`;
}

export function useEscrowInstallmentFunding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: FundInstallmentArgs) => {
      const validation = validateInstallmentFunding({
        governanceMode: args.context.governanceMode,
        fundingRole: args.fundingRole,
        installment: args.installment,
        values: args.values,
        isFinalReadOnly: args.isFinalReadOnly,
        hasProofFile: !!args.proofFile,
        existingProofFileName: args.installment.proof_file_name,
      });
      if (!validation.isValid) {
        throw new Error(validation.errors[0] ?? 'Invalid installment funding payload');
      }

      let proofPath = args.installment.proof_document_url;
      let proofFileName = args.installment.proof_file_name;
      let proofUploadedAt = args.installment.proof_uploaded_at;

      if (args.proofFile) {
        if (args.installment.proof_document_url) {
          const { error: removeError } = await supabase.storage
            .from('escrow-proofs')
            .remove([args.installment.proof_document_url]);
          if (removeError) throw new Error(`Existing proof cleanup failed: ${removeError.message}`);
        }

        const safeName = sanitizeFileName(args.proofFile.name);
        const storagePath = `${args.challengeId}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('escrow-proofs')
          .upload(storagePath, args.proofFile, { upsert: false });
        if (uploadError) throw new Error(`Proof upload failed: ${uploadError.message}`);
        proofPath = storagePath;
        proofFileName = args.proofFile.name;
        proofUploadedAt = new Date().toISOString();
      }

      const { error } = await supabase
        .from('escrow_installments')
        .update({
          status: 'FUNDED',
          funded_by_role: args.fundingRole,
          funded_by: args.userId,
          funded_at: new Date().toISOString(),
          bank_name: args.values.bankName,
          bank_branch: args.values.bankBranch || null,
          bank_address: args.values.bankAddress || null,
          account_number_masked: maskAccountNumber(args.values.accountNumber),
          ifsc_swift_code: args.values.ifscSwiftCode,
          deposit_amount: args.values.depositAmount,
          deposit_date: new Date(args.values.depositDate).toISOString(),
          deposit_reference: args.values.depositReference,
          proof_document_url: proofPath,
          proof_file_name: proofFileName,
          proof_uploaded_at: proofUploadedAt,
          fc_notes: args.values.notes || null,
          updated_at: new Date().toISOString(),
          updated_by: args.userId,
        })
        .eq('id', args.installment.id);
      if (error) throw error;

      const { error: syncError } = await supabase.rpc('sync_escrow_record_from_installments', {
        p_challenge_id: args.challengeId,
        p_user_id: args.userId,
      });
      if (syncError) throw syncError;

      return args.installment.id;
    },
    onSuccess: async (_id, args) => {
      toast.success(`Installment ${args.installment.installment_number} saved`);
      const challengeId = args.challengeId;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['escrow-installments', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['escrow-funding-context', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['escrow-deposit', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['publication-readiness', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['challenge-preview', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['challenge-fc-detail', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['curation-challenge', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['fc-escrow-challenges'] }),
      ]);
    },
    onError: (error) => handleMutationError(error, { operation: 'fund_escrow_installment', component: 'useEscrowInstallmentFunding' }),
  });
}
