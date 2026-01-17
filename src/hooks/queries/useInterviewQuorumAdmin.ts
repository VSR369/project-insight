import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";

export type InterviewQuorumRequirement = Tables<"interview_quorum_requirements">;
export type InterviewQuorumRequirementInsert = TablesInsert<"interview_quorum_requirements">;
export type InterviewQuorumRequirementUpdate = TablesUpdate<"interview_quorum_requirements">;

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
    staleTime: 60000, // 1 minute
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

interface QuorumUpdatePayload {
  expertise_level_id: string;
  required_quorum_count: number;
}

/**
 * Upsert multiple quorum configurations at once
 */
export function useUpsertQuorumConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configs: QuorumUpdatePayload[]) => {
      // Process each config with audit fields
      const upsertData = await Promise.all(
        configs.map(async (config) => {
          const base = {
            expertise_level_id: config.expertise_level_id,
            industry_segment_id: null as string | null, // Global config
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
      toast.error(`Failed to save configuration: ${error.message}`);
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
      toast.error(`Failed to create configuration: ${error.message}`);
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
      toast.error(`Failed to update configuration: ${error.message}`);
    },
  });
}
