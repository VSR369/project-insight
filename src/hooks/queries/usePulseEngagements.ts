/**
 * Industry Pulse Engagement Hooks
 * Fire, Gold, Save, Bookmark operations with optimistic updates
 * Per Project Knowledge standards
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError, logWarning } from "@/lib/errorHandler";
import { toast } from "sonner";
import { PULSE_QUERY_KEYS } from "@/constants/pulse.constants";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { PulseEngagementType } from "@/constants/pulse.constants";

// =====================================================
// TYPES
// =====================================================

export type PulseEngagement = Tables<"pulse_engagements">;
export type PulseEngagementInsert = TablesInsert<"pulse_engagements">;

export interface UserEngagementStatus {
  fire: boolean;
  gold: boolean;
  save: boolean;
  bookmark: boolean;
}

// =====================================================
// GET USER'S ENGAGEMENTS FOR CONTENT
// =====================================================

export function useUserEngagements(contentId: string | undefined, providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.userEngagements, contentId, providerId],
    queryFn: async (): Promise<UserEngagementStatus> => {
      if (!contentId || !providerId) {
        return { fire: false, gold: false, save: false, bookmark: false };
      }

      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("engagement_type")
        .eq("content_id", contentId)
        .eq("provider_id", providerId)
        .eq("is_deleted", false);

      if (error) {
        logWarning("Failed to fetch user engagements", { operation: "fetch_user_engagements" });
        return { fire: false, gold: false, save: false, bookmark: false };
      }

      const engagementTypes = new Set(data?.map(e => e.engagement_type) || []);

      return {
        fire: engagementTypes.has("fire"),
        gold: engagementTypes.has("gold"),
        save: engagementTypes.has("save"),
        bookmark: engagementTypes.has("bookmark"),
      };
    },
    enabled: !!contentId && !!providerId,
    staleTime: 10 * 1000,
  });
}

// =====================================================
// TOGGLE ENGAGEMENT (Fire, Gold, Save, Bookmark)
// =====================================================

interface ToggleEngagementParams {
  contentId: string;
  providerId: string;
  engagementType: PulseEngagementType;
}

export function useToggleEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, providerId, engagementType }: ToggleEngagementParams) => {
      // Check if engagement already exists
      const { data: existing, error: fetchError } = await supabase
        .from("pulse_engagements")
        .select("id, is_deleted")
        .eq("content_id", contentId)
        .eq("provider_id", providerId)
        .eq("engagement_type", engagementType)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);

      if (existing) {
        // Toggle the is_deleted status
        const { error: updateError } = await supabase
          .from("pulse_engagements")
          .update({
            is_deleted: !existing.is_deleted,
            deleted_at: existing.is_deleted ? null : new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) throw new Error(updateError.message);
        return { added: existing.is_deleted, engagementType };
      } else {
        // Create new engagement
        const { error: insertError } = await supabase
          .from("pulse_engagements")
          .insert({
            content_id: contentId,
            provider_id: providerId,
            engagement_type: engagementType,
          });

        if (insertError) throw new Error(insertError.message);
        return { added: true, engagementType };
      }
    },
    onMutate: async ({ contentId, providerId, engagementType }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: [PULSE_QUERY_KEYS.userEngagements, contentId, providerId],
      });

      // Snapshot previous value
      const previousStatus = queryClient.getQueryData<UserEngagementStatus>([
        PULSE_QUERY_KEYS.userEngagements,
        contentId,
        providerId,
      ]);

      // Optimistically update
      if (previousStatus) {
        queryClient.setQueryData<UserEngagementStatus>(
          [PULSE_QUERY_KEYS.userEngagements, contentId, providerId],
          {
            ...previousStatus,
            [engagementType]: !previousStatus[engagementType],
          }
        );
      }

      return { previousStatus, contentId, providerId };
    },
    onError: (error: Error, { contentId, providerId }, context) => {
      // Rollback on error
      if (context?.previousStatus) {
        queryClient.setQueryData(
          [PULSE_QUERY_KEYS.userEngagements, contentId, providerId],
          context.previousStatus
        );
      }
      handleMutationError(error, { operation: "toggle_engagement" });
    },
    onSuccess: (result, { contentId }) => {
      // Invalidate content detail to update counts
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.contentDetail, contentId],
      });

      // Show feedback for non-bookmark engagements
      if (result.engagementType !== "bookmark") {
        const action = result.added ? "Added" : "Removed";
        const label = result.engagementType === "fire" ? "🔥" :
                      result.engagementType === "gold" ? "🥇" : "💾";
        const xpAmount = result.engagementType === "fire" ? 2 : result.engagementType === "gold" ? 15 : 5;
        const xpInfo = result.added ? ` (Creator gets +${xpAmount} XP)` : "";
        toast.success(`${action} ${label}${xpInfo}`);
      }
    },
  });
}

// =====================================================
// CONVENIENCE HOOKS FOR SPECIFIC ENGAGEMENT TYPES
// =====================================================

export function useToggleFire() {
  const toggleEngagement = useToggleEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "fire" }),
    mutateAsync: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "fire" }),
  };
}

export function useToggleGold() {
  const toggleEngagement = useToggleEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "gold" }),
    mutateAsync: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "gold" }),
  };
}

export function useToggleSave() {
  const toggleEngagement = useToggleEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "save" }),
    mutateAsync: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "save" }),
  };
}

export function useToggleBookmark() {
  const toggleEngagement = useToggleEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "bookmark" }),
    mutateAsync: (params: Omit<ToggleEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "bookmark" }),
  };
}

// =====================================================
// GET BOOKMARKED CONTENT (for profile)
// =====================================================

export function useBookmarkedContent(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.engagements, "bookmarks", providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_engagements")
        .select(`
          id,
          created_at,
          content:pulse_content!pulse_engagements_content_id_fkey(
            id,
            content_type,
            title,
            caption,
            headline,
            cover_image_url,
            fire_count,
            provider:solution_providers!pulse_content_provider_id_fkey(id, first_name, last_name)
          )
        `)
        .eq("provider_id", providerId)
        .eq("engagement_type", "bookmark")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 30 * 1000,
  });
}

// =====================================================
// GET SAVED CONTENT (for profile)
// =====================================================

export function useSavedContent(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.engagements, "saves", providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_engagements")
        .select(`
          id,
          created_at,
          content:pulse_content!pulse_engagements_content_id_fkey(
            id,
            content_type,
            title,
            caption,
            headline,
            cover_image_url,
            fire_count,
            provider:solution_providers!pulse_content_provider_id_fkey(id, first_name, last_name)
          )
        `)
        .eq("provider_id", providerId)
        .eq("engagement_type", "save")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 30 * 1000,
  });
}
