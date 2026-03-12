/**
 * useSoaProfile — Read/update the current SOA's own profile from seeking_org_admins
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface SoaProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  admin_tier: string;
  updated_at: string | null;
}

export function useSoaProfile(organizationId?: string) {
  return useQuery({
    queryKey: ["soa-profile", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("seeking_org_admins")
        .select("id, full_name, email, phone, title, admin_tier, updated_at")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as SoaProfile | null;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

export function useUpdateSoaProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      full_name: string;
      phone?: string;
      title?: string;
    }) => {
      const { id, ...fields } = input;
      const withAudit = await withUpdatedBy({
        ...fields,
        updated_at: new Date().toISOString(),
      });
      const { data, error } = await supabase
        .from("seeking_org_admins")
        .update(withAudit)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soa-profile"] });
      qc.invalidateQueries({ queryKey: ["seeker-admin-current"] });
      toast.success("Profile updated successfully");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "update_soa_profile" }),
  });
}
