import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type ParticipationMode = Tables<"participation_modes">;
export type ParticipationModeInsert = TablesInsert<"participation_modes">;
export type ParticipationModeUpdate = TablesUpdate<"participation_modes">;

export function useParticipationModes(includeInactive = false) {
  return useQuery({
    queryKey: ["participation_modes", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("participation_modes")
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

      return data as ParticipationMode[];
    },
  });
}

export function useCreateParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: ParticipationModeInsert) => {
      const { data, error } = await supabase
        .from("participation_modes")
        .insert(mode)
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
      toast.error(`Failed to create participation mode: ${error.message}`);
    },
  });
}

export function useUpdateParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ParticipationModeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("participation_modes")
        .update(updates)
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
      toast.error(`Failed to update participation mode: ${error.message}`);
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
      toast.error(`Failed to deactivate participation mode: ${error.message}`);
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
      toast.error(`Failed to restore participation mode: ${error.message}`);
    },
  });
}
