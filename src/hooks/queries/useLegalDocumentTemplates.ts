import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface LegalDocumentTemplate {
  template_id: string;
  document_type: string;
  document_name: string;
  tier: string;
  description: string | null;
  template_content: string | null;
  default_template_url: string | null;
  is_active: boolean;
  trigger_phase: number | null;
  required_for_maturity: unknown;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface LegalDocumentTemplateInsert {
  document_type: string;
  document_name: string;
  tier: string;
  description?: string | null;
  template_content?: string | null;
  trigger_phase?: number | null;
  is_active?: boolean;
}

const QUERY_KEY = "legal_document_templates";
const TABLE = "legal_document_templates" as "legal_document_templates";
const COLUMNS = "template_id, document_type, document_name, tier, description, template_content, default_template_url, is_active, trigger_phase, required_for_maturity, created_at, updated_at";

export function useLegalDocumentTemplates(includeInactive = false) {
  return useQuery({
    queryKey: [QUERY_KEY, { includeInactive }],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from(TABLE) as any)
        .select(COLUMNS)
        .order("tier", { ascending: true })
        .order("document_name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as LegalDocumentTemplate[];
    },
    staleTime: 300_000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateLegalDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: LegalDocumentTemplateInsert) => {
      const d = await withCreatedBy(item);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any)
        .insert(d).select(COLUMNS).single();
      if (error) throw new Error(error.message);
      return data as LegalDocumentTemplate;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Legal template created"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_legal_template" }),
  });
}

export function useUpdateLegalDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ template_id, ...updates }: Partial<LegalDocumentTemplateInsert> & { template_id: string; default_template_url?: string }) => {
      const d = await withUpdatedBy(updates);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(TABLE) as any)
        .update(d).eq("template_id", template_id).select(COLUMNS).single();
      if (error) throw new Error(error.message);
      return data as LegalDocumentTemplate;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Legal template updated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_legal_template" }),
  });
}

export function useDeleteLegalDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any)
        .update({ is_active: false }).eq("template_id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Legal template deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_legal_template" }),
  });
}

export function useRestoreLegalDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE) as any)
        .update({ is_active: true }).eq("template_id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success("Legal template restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_legal_template" }),
  });
}
