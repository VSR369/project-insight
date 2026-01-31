import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

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
    staleTime: 300000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (level: ExpertiseLevelInsert) => {
      const levelWithAudit = await withCreatedBy(level);
      const { data, error } = await supabase
        .from("expertise_levels")
        .insert(levelWithAudit)
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
      handleMutationError(error, { operation: 'create_expertise_level' });
    },
  });
}

export function useUpdateExpertiseLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpertiseLevelUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("expertise_levels")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_expertise_level' });
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
      handleMutationError(error, { operation: 'deactivate_expertise_level' });
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
      handleMutationError(error, { operation: 'restore_expertise_level' });
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
      handleMutationError(error, { operation: 'delete_expertise_level' });
    },
  });
}
