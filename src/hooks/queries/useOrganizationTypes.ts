import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type OrganizationType = Tables<"organization_types">;
export type OrganizationTypeInsert = TablesInsert<"organization_types">;
export type OrganizationTypeUpdate = TablesUpdate<"organization_types">;

export function useOrganizationTypes(includeInactive = false) {
  return useQuery({
    queryKey: ["organization_types", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("organization_types")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as OrganizationType[];
    },
    staleTime: 300000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateOrganizationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orgType: OrganizationTypeInsert) => {
      const orgTypeWithAudit = await withCreatedBy(orgType);
      const { data, error } = await supabase
        .from("organization_types")
        .insert(orgTypeWithAudit)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as OrganizationType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_types"] });
      toast.success("Organization type created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_organization_type' });
    },
  });
}

export function useUpdateOrganizationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OrganizationTypeUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("organization_types")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as OrganizationType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_types"] });
      toast.success("Organization type updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_organization_type' });
    },
  });
}

export function useDeleteOrganizationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_types")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_types"] });
      toast.success("Organization type deactivated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_organization_type' });
    },
  });
}

export function useRestoreOrganizationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_types")
        .update({ is_active: true })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_types"] });
      queryClient.refetchQueries({ queryKey: ["organization_types"] });
      toast.success("Organization type restored successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_organization_type' });
    },
  });
}

export function useHardDeleteOrganizationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_types")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_types"] });
      toast.success("Organization type permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_organization_type' });
    },
  });
}
