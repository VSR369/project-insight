/**
 * useRegistrationPayments — CRUD hooks for registration_payments table.
 * Per Project Knowledge: React Query + audit fields + standard error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy } from '@/lib/auditFields';

export function useRegistrationPayment(orgId: string | undefined) {
  return useQuery({
    queryKey: ['registration-payments', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('registration_payments')
        .select('id, organization_id, payment_amount, currency_code, transaction_id, gateway_reference, payment_method, payment_timestamp, status, payment_attempts, failure_reason, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
  });
}

export function useCreateRegistrationPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      organization_id: string;
      tenant_id: string;
      payment_amount: number;
      currency_code: string;
      payment_method: string;
    }) => {
      const withAudit = await withCreatedBy({
        ...payment,
        status: 'Completed' as any,
        payment_timestamp: new Date().toISOString(),
        gateway_reference: `SIM-${Date.now()}`,
      });
      const { data, error } = await supabase
        .from('registration_payments')
        .insert(withAudit as any)
        .select('id, transaction_id, status')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['registration-payments', variables.organization_id] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'create_registration_payment', component: 'registration' }),
  });
}
