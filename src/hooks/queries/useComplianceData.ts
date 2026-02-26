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
      nda_preference?: 'standard_platform_nda' | 'custom_nda';
    }) => {
      // 1. Upsert compliance record
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

      // 2. Update NDA preference on seeker_organizations
      if (payload.nda_preference) {
        const ndaReviewStatus = payload.nda_preference === 'standard_platform_nda'
          ? 'not_applicable'
          : 'pending_review';

        const { error: orgError } = await supabase
          .from('seeker_organizations')
          .update({
            nda_preference: payload.nda_preference,
            nda_review_status: ndaReviewStatus,
          })
          .eq('id', payload.organization_id);

        if (orgError) throw new Error(orgError.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_compliance'] });
      queryClient.invalidateQueries({ queryKey: ['seeker_organizations'] });
      toast.success('Compliance details saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save compliance: ${error.message}`);
    },
  });
}

// ============================================================
// Upload Custom NDA Document
// ============================================================
export function useUploadNdaDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      tenant_id: string;
      file: File;
    }) => {
      const fileExt = payload.file.name.split('.').pop();
      const storagePath = `${payload.tenant_id}/nda/${crypto.randomUUID()}_${payload.file.name}`;

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('org-documents')
        .upload(storagePath, payload.file, {
          contentType: payload.file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      // 2. Create document record
      const { data: docRecord, error: docError } = await supabase
        .from('seeker_org_documents')
        .insert({
          organization_id: payload.organization_id,
          tenant_id: payload.tenant_id,
          document_type: 'custom_nda' as const,
          file_name: payload.file.name,
          file_size: payload.file.size,
          mime_type: payload.file.type,
          storage_path: storagePath,
          verification_status: 'pending' as const,
        })
        .select('id')
        .single();

      if (docError) throw new Error(docError.message);

      // 3. Link document to organization
      const { error: linkError } = await supabase
        .from('seeker_organizations')
        .update({ custom_nda_document_id: docRecord.id })
        .eq('id', payload.organization_id);

      if (linkError) throw new Error(linkError.message);

      return docRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_organizations'] });
      toast.success('Custom NDA uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload NDA: ${error.message}`);
    },
  });
}