import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Country = Tables<"countries">;
export type CountryInsert = TablesInsert<"countries">;
export type CountryUpdate = TablesUpdate<"countries">;

export function useCountries(includeInactive = false) {
  return useQuery({
    queryKey: ["countries", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("countries")
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

      return data as Country[];
    },
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
      const { data, error } = await supabase
        .from("countries")
        .insert(country)
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
      toast.error(`Failed to create country: ${error.message}`);
    },
  });
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CountryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("countries")
        .update(updates)
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
      toast.error(`Failed to update country: ${error.message}`);
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
      toast.error(`Failed to deactivate country: ${error.message}`);
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
      toast.success("Country restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore country: ${error.message}`);
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
      toast.error(`Failed to update display order: ${error.message}`);
    },
  });
}
