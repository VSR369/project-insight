import { useQuery } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { handleQueryError } from '@/lib/errorHandler';
import type { EscrowInstallmentRecord } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

type EscrowInstallmentRow = Database['public']['Tables']['escrow_installments']['Row'];

function mapInstallmentRow(row: EscrowInstallmentRow): EscrowInstallmentRecord {
  return {
    ...row,
    status: row.status as EscrowInstallmentRecord['status'],
    funded_by_role: row.funded_by_role as EscrowInstallmentRecord['funded_by_role'],
  };
}

export function useEscrowInstallments(challengeId: string | undefined) {
  return useQuery<EscrowInstallmentRecord[]>({
    queryKey: ['escrow-installments', challengeId],
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('escrow_installments')
        .select('id, challenge_id, escrow_record_id, installment_number, schedule_label, trigger_event, scheduled_pct, scheduled_amount, currency, status, funded_by_role, bank_name, bank_branch, bank_address, account_number_raw, account_number_masked, ifsc_swift_code, deposit_amount, deposit_date, deposit_reference, proof_document_url, proof_file_name, proof_uploaded_at, fc_notes, funded_at, funded_by, created_at, created_by, updated_at, updated_by')
        .eq('challenge_id', challengeId)
        .order('installment_number', { ascending: true });
      if (error) {
        handleQueryError(error, { operation: 'fetch_escrow_installments', component: 'useEscrowInstallments' });
        throw error;
      }
      return (data ?? []).map(mapInstallmentRow);
    },
  });
}
