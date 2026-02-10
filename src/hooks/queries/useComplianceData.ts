/**
 * Compliance Data Hooks (REG-003)
 * 
 * React Query hooks for export control statuses, data residency options,
 * and upserting compliance records.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MASTER_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

// ============================================================
// Export Control Statuses
// ============================================================
export function useExportControlStatuses() {
  return useQuery({
    queryKey: ['export_control_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_export_control_statuses')
        .select('id, code, name, description, requires_itar_compliance')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Data Residency Options
// ============================================================
export function useDataResidencyOptions() {
  return useQuery({
    queryKey: ['data_residency_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_data_residency')
        .select('id, code, name, description')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Upsert Compliance Record
// ============================================================
export function useUpsertCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      tenant_id: string;
      export_control_status_id: string;
      itar_certified: boolean;
      itar_certification_expiry?: string;
      data_residency_id?: string;
      gdpr_compliant: boolean;
      hipaa_compliant: boolean;
      soc2_compliant: boolean;
      iso27001_certified: boolean;
      compliance_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('seeker_compliance')
        .upsert(
          {
            organization_id: payload.organization_id,
            tenant_id: payload.tenant_id,
            export_control_status_id: payload.export_control_status_id,
            itar_certified: payload.itar_certified,
            itar_certification_expiry: payload.itar_certification_expiry || null,
            data_residency_id: payload.data_residency_id || null,
            gdpr_compliant: payload.gdpr_compliant,
            hipaa_compliant: payload.hipaa_compliant,
            soc2_compliant: payload.soc2_compliant,
            iso27001_certified: payload.iso27001_certified,
            compliance_notes: payload.compliance_notes || null,
          },
          { onConflict: 'organization_id' }
        )
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_compliance'] });
      toast.success('Compliance details saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save compliance: ${error.message}`);
    },
  });
}
