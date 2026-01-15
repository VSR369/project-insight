import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type ExpertiseLevel = Tables<"expertise_levels">;
export type ExpertiseLevelInsert = TablesInsert<"expertise_levels">;
export type ExpertiseLevelUpdate = TablesUpdate<"expertise_levels">;

export function useExpertiseLevels(includeInactive = false) {
  return useQuery({
    queryKey: ["expertise_levels", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("expertise_levels")
        .select("*")
        .order("level_number", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as ExpertiseLevel[];
    },
  });
}

export function useCreateExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (level: ExpertiseLevelInsert) => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .insert(level)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as ExpertiseLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expertise_levels"] });
      toast.success("Expertise level created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expertise level: ${error.message}`);
    },
  });
}

export function useUpdateExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpertiseLevelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as ExpertiseLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expertise_levels"] });
      toast.success("Expertise level updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update expertise level: ${error.message}`);
    },
  });
}

export function useDeleteExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expertise_levels")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expertise_levels"] });
      toast.success("Expertise level deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate expertise level: ${error.message}`);
    },
  });
}

export function useRestoreExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expertise_levels")
        .update({ is_active: true })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expertise_levels"] });
      queryClient.refetchQueries({ queryKey: ["expertise_levels"] });
      toast.success("Expertise level restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore expertise level: ${error.message}`);
    },
  });
}

export function useHardDeleteExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expertise_levels")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expertise_levels"] });
      toast.success("Expertise level permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expertise level: ${error.message}`);
    },
  });
}
