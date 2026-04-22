import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import type { EscrowFundingContextData } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';
import { canSeedInstallments } from '@/services/cogniblend/escrowInstallments/escrowInstallmentValidationService';

type EscrowInstallmentInsert = Database['public']['Tables']['escrow_installments']['Insert'];

interface SeedArgs {
  context: EscrowFundingContextData | null;
  userId: string | undefined;
}

export function useSeedEscrowInstallments(challengeId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ context, userId }: SeedArgs) => {
      if (!challengeId || !context || !userId) return 0;
      if (!canSeedInstallments(context)) return 0;

      const rows: EscrowInstallmentInsert[] = context.normalizedSchedule.map((installment) => ({
        challenge_id: challengeId,
        escrow_record_id: context.legacyEscrowRecord?.id ?? null,
        installment_number: installment.installmentNumber,
        schedule_label: installment.scheduleLabel,
        trigger_event: installment.triggerEvent,
        scheduled_pct: installment.scheduledPct,
        scheduled_amount: installment.scheduledAmount,
        currency: installment.currency,
        status: 'PENDING',
        created_by: userId,
      }));

      const { error } = await supabase
        .from('escrow_installments')
        .upsert(rows, { onConflict: 'challenge_id,installment_number', ignoreDuplicates: true });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: async (count) => {
      if (!challengeId || count === 0) return;
      toast.success(count === 1 ? 'Escrow installment seeded' : `${count} escrow installments seeded`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['escrow-installments', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['escrow-funding-context', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['challenge-preview', challengeId] }),
      ]);
    },
    onError: (error) => handleMutationError(error, { operation: 'seed_escrow_installments', component: 'useSeedEscrowInstallments' }),
  });
}
