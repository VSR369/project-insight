import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type Country = Tables<"countries">;
export type CountryInsert = TablesInsert<"countries">;
export type CountryUpdate = TablesUpdate<"countries">;

export function useCountries(includeInactive = false) {
  return useQuery({
    queryKey: ["countries", { includeInactive }],
    queryFn: async () => {
      // PERFORMANCE: Select only required columns instead of *
      let query = supabase
        .from("countries")
        .select("id, code, name, phone_code, display_order, is_active")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as Country[];
    },
    staleTime: 300000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCountry(id: string | null) {
  return useQuery({
    queryKey: ["countries", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Country;
    },
    enabled: !!id,
  });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (country: CountryInsert) => {
      const countryWithAudit = await withCreatedBy(country);
      const { data, error } = await supabase
        .from("countries")
        .insert(countryWithAudit)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Country;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_country' });
    },
  });
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CountryUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("countries")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Country;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_country' });
    },
  });
}

export function useDeleteCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("countries")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country deactivated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_country' });
    },
  });
}

export function useRestoreCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("countries")
        .update({ is_active: true })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      queryClient.refetchQueries({ queryKey: ["countries"] });
      toast.success("Country restored successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_country' });
    },
  });
}

export function useHardDeleteCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("countries")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_country' });
    },
  });
}

export function useUpdateDisplayOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      const promises = updates.map(({ id, display_order }) =>
        supabase.from("countries").update({ display_order }).eq("id", id)
      );

      const results = await Promise.all(promises);
      const error = results.find((r) => r.error)?.error;

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Display order updated");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_display_order' });
    },
  });
}
