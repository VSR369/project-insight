/**
 * CRUD hooks for rbac_admin_contact — platform admin contact details
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface AdminContact {
  id: string;
  name: string;
  email: string;
  phone_intl: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export function useAdminContact() {
  return useQuery({
    queryKey: ["admin-contact"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rbac_admin_contact")
        .select("id, name, email, phone_intl, updated_at, updated_by")
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as AdminContact | null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpsertAdminContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; email: string; phone_intl?: string }) => {
      const d = await withUpdatedBy({ ...input, updated_at: new Date().toISOString() });
      if (input.id) {
        const { data, error } = await supabase
          .from("rbac_admin_contact")
          .update(d)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
      const { data, error } = await supabase
        .from("rbac_admin_contact")
        .insert(d)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact"] });
      toast.success("Admin contact updated successfully");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "upsert_admin_contact" }),
  });
}
