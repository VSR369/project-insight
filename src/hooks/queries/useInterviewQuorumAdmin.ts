import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type InterviewQuorumRequirement = Tables<"interview_quorum_requirements">;
export type InterviewQuorumRequirementInsert = TablesInsert<"interview_quorum_requirements">;
export type InterviewQuorumRequirementUpdate = TablesUpdate<"interview_quorum_requirements">;

/**
 * Fetch all active quorum configurations (both global and industry-specific)
 */
export function useAllQuorumConfigs() {
  return useQuery({
    queryKey: ["interview-quorum-requirements", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_quorum_requirements")
        .select("*")
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return data as InterviewQuorumRequirement[];
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Fetch all global quorum configurations (industry_segment_id = null)
 */
export function useInterviewQuorumConfigs() {
  return useQuery({
    queryKey: ["interview-quorum-requirements", "global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_quorum_requirements")
        .select("*")
        .is("industry_segment_id", null)
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return data as InterviewQuorumRequirement[];
    },
    staleTime: 60000,
  });
}

/**
 * Fetch a single quorum config by expertise level
 */
export function useInterviewQuorumByLevel(expertiseLevelId: string | null) {
  return useQuery({
    queryKey: ["interview-quorum-requirements", "level", expertiseLevelId],
    queryFn: async () => {
      if (!expertiseLevelId) return null;

      const { data, error } = await supabase
        .from("interview_quorum_requirements")
        .select("*")
        .eq("expertise_level_id", expertiseLevelId)
        .is("industry_segment_id", null)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as InterviewQuorumRequirement | null;
    },
    enabled: !!expertiseLevelId,
    staleTime: 60000,
  });
}

export interface QuorumUpdatePayload {
  expertise_level_id: string;
  industry_segment_id: string | null;
  required_quorum_count: number;
  configId?: string | null; // existing row ID if updating
}

/**
 * Save multiple quorum configurations at once using insert/update pattern
 * This handles both new configs and updates to existing ones
 */
export function useSaveQuorumConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configs: QuorumUpdatePayload[]) => {
      // Separate inserts from updates
      const updates = configs.filter((c) => c.configId);
      const inserts = configs.filter((c) => !c.configId);

      // Process updates
      for (const config of updates) {
        const updateData = await withUpdatedBy({
          required_quorum_count: config.required_quorum_count,
        });

        const { error } = await supabase
          .from("interview_quorum_requirements")
          .update(updateData)
          .eq("id", config.configId!);

        if (error) throw new Error(`Update failed: ${error.message}`);
      }

      // Process inserts in batch if any
      if (inserts.length > 0) {
        const insertData = await Promise.all(
          inserts.map(async (config) => {
            return await withCreatedBy({
              expertise_level_id: config.expertise_level_id,
              industry_segment_id: config.industry_segment_id,
              required_quorum_count: config.required_quorum_count,
              is_active: true,
            });
          })
        );

        const { error } = await supabase
          .from("interview_quorum_requirements")
          .insert(insertData);

        if (error) throw new Error(`Insert failed: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-quorum-requirements"] });
      toast.success("Configuration saved successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_quorum_config' });
    },
  });
}

/**
 * @deprecated Use useSaveQuorumConfigs instead
 * Legacy: Upsert multiple quorum configurations at once
 */
export function useUpsertQuorumConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configs: { expertise_level_id: string; required_quorum_count: number }[]) => {
      // Process each config with audit fields
      const upsertData = await Promise.all(
        configs.map(async (config) => {
          const base = {
            expertise_level_id: config.expertise_level_id,
            industry_segment_id: null as string | null,
            required_quorum_count: config.required_quorum_count,
            is_active: true,
          };
          return await withUpdatedBy(base);
        })
      );

      // Upsert all configs
      const { error } = await supabase
        .from("interview_quorum_requirements")
        .upsert(upsertData, {
          onConflict: "expertise_level_id,industry_segment_id",
          ignoreDuplicates: false,
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-quorum-requirements"] });
      toast.success("Configuration saved successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'upsert_quorum_config' });
    },
  });
}

/**
 * Create a single quorum config
 */
export function useCreateQuorumConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: InterviewQuorumRequirementInsert) => {
      const configWithAudit = await withCreatedBy(config);
      const { data, error } = await supabase
        .from("interview_quorum_requirements")
        .insert(configWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as InterviewQuorumRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-quorum-requirements"] });
      toast.success("Quorum configuration created");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_quorum_config' });
    },
  });
}

/**
 * Update a single quorum config
 */
export function useUpdateQuorumConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InterviewQuorumRequirementUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("interview_quorum_requirements")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as InterviewQuorumRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-quorum-requirements"] });
      toast.success("Quorum configuration updated");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_quorum_config' });
    },
  });
}
