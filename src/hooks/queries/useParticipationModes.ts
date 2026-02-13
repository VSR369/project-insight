import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type ParticipationMode = Tables<"participation_modes">;
export type ParticipationModeInsert = TablesInsert<"participation_modes">;
export type ParticipationModeUpdate = TablesUpdate<"participation_modes">;

export function useParticipationModes(includeInactive = false) {
  return useQuery({
    queryKey: ["participation_modes", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("participation_modes")
        .select("id, code, name, description, requires_org_info, display_order, is_active, created_at, updated_at, created_by, updated_by")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as ParticipationMode[];
    },
    staleTime: 300000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: ParticipationModeInsert) => {
      const modeWithAudit = await withCreatedBy(mode);
      const { data, error } = await supabase
        .from("participation_modes")
        .insert(modeWithAudit)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as ParticipationMode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation_modes"] });
      toast.success("Participation mode created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_participation_mode' });
    },
  });
}

export function useUpdateParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ParticipationModeUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("participation_modes")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as ParticipationMode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation_modes"] });
      toast.success("Participation mode updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_participation_mode' });
    },
  });
}

export function useDeleteParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("participation_modes")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation_modes"] });
      toast.success("Participation mode deactivated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_participation_mode' });
    },
  });
}

export function useRestoreParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("participation_modes")
        .update({ is_active: true })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation_modes"] });
      toast.success("Participation mode restored successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_participation_mode' });
    },
  });
}

export function useHardDeleteParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("participation_modes")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation_modes"] });
      toast.success("Participation mode permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_participation_mode' });
    },
  });
}
