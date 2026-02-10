import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type BlockedDomain = Tables<"md_blocked_email_domains">;
export type BlockedDomainInsert = TablesInsert<"md_blocked_email_domains">;
export type BlockedDomainUpdate = TablesUpdate<"md_blocked_email_domains">;

export function useBlockedDomains(includeInactive = false) {
  return useQuery({
    queryKey: ["blocked_domains", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_blocked_email_domains")
        .select("id, domain, reason, is_active, created_at")
        .order("domain", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as BlockedDomain[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateBlockedDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: BlockedDomainInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_blocked_email_domains").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked_domains"] }); toast.success("Blocked domain added successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_blocked_domain" }),
  });
}

export function useUpdateBlockedDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: BlockedDomainUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_blocked_email_domains").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked_domains"] }); toast.success("Blocked domain updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_blocked_domain" }),
  });
}

export function useDeleteBlockedDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_blocked_email_domains").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked_domains"] }); toast.success("Blocked domain deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_blocked_domain" }),
  });
}

export function useRestoreBlockedDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_blocked_email_domains").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked_domains"] }); toast.success("Blocked domain restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_blocked_domain" }),
  });
}

export function useHardDeleteBlockedDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_blocked_email_domains").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked_domains"] }); toast.success("Blocked domain permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_blocked_domain" }),
  });
}
