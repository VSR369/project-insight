import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy } from "@/lib/auditFields";

export type LevelSpecialityMap = Tables<"level_speciality_map">;
export type LevelSpecialityMapInsert = TablesInsert<"level_speciality_map">;

// Fetch all mappings for a specific speciality
export function useLevelSpecialityMappings(specialityId?: string) {
  return useQuery({
    queryKey: ["level_speciality_map", specialityId],
    queryFn: async () => {
      if (!specialityId) return [];

      const { data, error } = await supabase
        .from("level_speciality_map")
        .select("*, expertise_levels(*)")
        .eq("speciality_id", specialityId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!specialityId,
  });
}

// Fetch all mappings for a specific expertise level
export function useMappingsByLevel(expertiseLevelId?: string) {
  return useQuery({
    queryKey: ["level_speciality_map_by_level", expertiseLevelId],
    queryFn: async () => {
      if (!expertiseLevelId) return [];

      const { data, error } = await supabase
        .from("level_speciality_map")
        .select("*, specialities(*)")
        .eq("expertise_level_id", expertiseLevelId);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!expertiseLevelId,
  });
}

// Create a new mapping
export function useCreateLevelSpecialityMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapping: LevelSpecialityMapInsert) => {
      const mappingWithAudit = await withCreatedBy(mapping);
      const { data, error } = await supabase
        .from("level_speciality_map")
        .insert(mappingWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as LevelSpecialityMap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["level_speciality_map"] });
      toast.success("Expertise level linked successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This expertise level is already linked to this speciality");
      } else {
        toast.error(`Failed to link expertise level: ${error.message}`);
      }
    },
  });
}

// Delete a mapping
export function useDeleteLevelSpecialityMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("level_speciality_map")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["level_speciality_map"] });
      toast.success("Expertise level unlinked successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink expertise level: ${error.message}`);
    },
  });
}

// Bulk update mappings for a speciality
export function useBulkUpdateMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      specialityId,
      expertiseLevelIds,
    }: {
      specialityId: string;
      expertiseLevelIds: string[];
    }) => {
      // First, delete all existing mappings for this speciality
      const { error: deleteError } = await supabase
        .from("level_speciality_map")
        .delete()
        .eq("speciality_id", specialityId);

      if (deleteError) throw new Error(deleteError.message);

      // Then, insert the new mappings
      if (expertiseLevelIds.length > 0) {
        const mappings = expertiseLevelIds.map((levelId) => ({
          speciality_id: specialityId,
          expertise_level_id: levelId,
        }));

        const { error: insertError } = await supabase
          .from("level_speciality_map")
          .insert(mappings);

        if (insertError) throw new Error(insertError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["level_speciality_map"] });
      toast.success("Expertise level mappings updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mappings: ${error.message}`);
    },
  });
}
