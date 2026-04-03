import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";
import type { LegalDocTemplate, VersionStatus } from "@/types/legal.types";

const QUERY_KEY = "legal_document_templates";
const TABLE = "legal_document_templates" as const;
const COLUMNS = "template_id, document_code, document_type, document_name, tier, version, version_status, description, summary, content, content_json, template_content, sections, applies_to_roles, applies_to_model, applies_to_mode, is_mandatory, is_active, effective_date, parent_template_id, original_file_url, original_file_name, default_template_url, trigger_phase, created_at, updated_at, created_by, updated_by";

export function useLegalDocumentTemplates(includeInactive = false, statusFilter?: VersionStatus[]) {
  return useQuery({
    queryKey: [QUERY_KEY, { includeInactive, statusFilter }],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from(TABLE) as any)
        .select(COLUMNS)
        .order("document_code", { ascending: true })
        .order("version", { ascending: false });
      if (!includeInactive) query = query.eq("is_active", true);
      if (statusFilter?.length) query = query.in("version_status", statusFilter);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as LegalDocTemplate[];
    },
    staleTime: 300_000,
  });
}

export function useLegalDocTemplateById(templateId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, templateId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any)
        .select(COLUMNS)
        .eq("template_id", templateId)
        .single();
      if (error) throw new Error(error.message);
      return data as LegalDocTemplate;
    },
    enabled: !!templateId,
    staleTime: 60_000,
  });
}

export function useSaveLegalDocDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ template_id, ...updates }: Partial<LegalDocTemplate> & { template_id: string }) => {
      const d = await withUpdatedBy({ ...updates, updated_at: new Date().toISOString() });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any)
        .update(d).eq("template_id", template_id).select(COLUMNS).single();
      if (error) throw new Error(error.message);
      return data as LegalDocTemplate;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Draft saved"); },
    onError: (e: Error) => handleMutationError(e, { operation: "save_legal_doc_draft" }),
  });
}

export function usePublishLegalDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ template_id, document_code }: { template_id: string; document_code: string }) => {
      const d = await withUpdatedBy({
        version_status: 'ACTIVE' as VersionStatus,
        effective_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      });
      // Archive previous active version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from(TABLE) as any)
        .update({ version_status: 'ARCHIVED' })
        .eq("document_code", document_code)
        .eq("version_status", "ACTIVE")
        .neq("template_id", template_id);
      // Activate current
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any)
        .update(d).eq("template_id", template_id).select(COLUMNS).single();
      if (error) throw new Error(error.message);
      return data as LegalDocTemplate;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Document published"); },
    onError: (e: Error) => handleMutationError(e, { operation: "publish_legal_doc" }),
  });
}

export function useCreateLegalDocTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<LegalDocTemplate>) => {
      const d = await withCreatedBy(item);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any)
        .insert(d).select(COLUMNS).single();
      if (error) throw new Error(error.message);
      return data as LegalDocTemplate;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Template created"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_legal_doc_template" }),
  });
}

// Re-export type for backward compat
export type { LegalDocTemplate as LegalDocumentTemplate };
export type LegalDocumentTemplateInsert = Partial<LegalDocTemplate>;
export const useUpdateLegalDocumentTemplate = useSaveLegalDocDraft;
export const useDeleteLegalDocumentTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any)
        .update({ is_active: false }).eq("template_id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Template deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_legal_template" }),
  });
};
export const useRestoreLegalDocumentTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any)
        .update({ is_active: true }).eq("template_id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Template restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_legal_template" }),
  });
};
export const useCreateLegalDocumentTemplate = useCreateLegalDocTemplate;
