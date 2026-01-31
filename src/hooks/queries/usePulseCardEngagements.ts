/**
 * Pulse Card Engagement Hooks
 * Fire, Gold, Save, Bookmark operations for Pulse Cards
 * Mirrors usePulseEngagements.ts for content
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError, logWarning } from "@/lib/errorHandler";
import { toast } from "sonner";
import type { PulseEngagementType } from "@/constants/pulse.constants";

// =====================================================
// CONSTANTS
// =====================================================

export const PULSE_CARD_QUERY_KEYS = {
  cardEngagements: 'pulse-card-engagements',
  userCardEngagements: 'pulse-user-card-engagements',
} as const;

export const PULSE_CARD_XP_REWARDS = {
  CARD_CREATED: 75,
  LAYER_CREATED: 25,
  ENGAGEMENT_RECEIVED: {
    fire: 2,
    gold: 15,
    save: 5,
    bookmark: 0,
  },
} as const;

// =====================================================
// TYPES
// =====================================================

export interface CardUserEngagementStatus {
  fire: boolean;
  gold: boolean;
  save: boolean;
  bookmark: boolean;
}

// =====================================================
// GET USER'S ENGAGEMENTS FOR CARD
// =====================================================

export function useCardUserEngagements(cardId: string | undefined, providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_CARD_QUERY_KEYS.userCardEngagements, cardId, providerId],
    queryFn: async (): Promise<CardUserEngagementStatus> => {
      if (!cardId || !providerId) {
        return { fire: false, gold: false, save: false, bookmark: false };
      }

      const { data, error } = await supabase
        .from("pulse_card_engagements")
        .select("engagement_type")
        .eq("card_id", cardId)
        .eq("provider_id", providerId)
        .eq("is_deleted", false);

      if (error) {
        logWarning("Failed to fetch card engagements", { operation: "fetch_card_engagements" });
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
    enabled: !!cardId && !!providerId,
    staleTime: 10 * 1000,
  });
}

// =====================================================
// TOGGLE CARD ENGAGEMENT (Fire, Gold, Save, Bookmark)
// =====================================================

interface ToggleCardEngagementParams {
  cardId: string;
  providerId: string;
  engagementType: PulseEngagementType;
}

export function useToggleCardEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, providerId, engagementType }: ToggleCardEngagementParams) => {
      // Check if engagement already exists
      const { data: existing, error: fetchError } = await supabase
        .from("pulse_card_engagements")
        .select("id, is_deleted")
        .eq("card_id", cardId)
        .eq("provider_id", providerId)
        .eq("engagement_type", engagementType)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);

      if (existing) {
        // Toggle the is_deleted status
        const { error: updateError } = await supabase
          .from("pulse_card_engagements")
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
          .from("pulse_card_engagements")
          .insert({
            card_id: cardId,
            provider_id: providerId,
            engagement_type: engagementType,
          });

        if (insertError) throw new Error(insertError.message);
        return { added: true, engagementType };
      }
    },
    onMutate: async ({ cardId, providerId, engagementType }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: [PULSE_CARD_QUERY_KEYS.userCardEngagements, cardId, providerId],
      });

      // Snapshot previous value
      const previousStatus = queryClient.getQueryData<CardUserEngagementStatus>([
        PULSE_CARD_QUERY_KEYS.userCardEngagements,
        cardId,
        providerId,
      ]);

      // Optimistically update
      if (previousStatus) {
        queryClient.setQueryData<CardUserEngagementStatus>(
          [PULSE_CARD_QUERY_KEYS.userCardEngagements, cardId, providerId],
          {
            ...previousStatus,
            [engagementType]: !previousStatus[engagementType],
          }
        );
      }

      return { previousStatus, cardId, providerId };
    },
    onError: (error: Error, { cardId, providerId }, context) => {
      // Rollback on error
      if (context?.previousStatus) {
        queryClient.setQueryData(
          [PULSE_CARD_QUERY_KEYS.userCardEngagements, cardId, providerId],
          context.previousStatus
        );
      }
      handleMutationError(error, { operation: "toggle_card_engagement" });
    },
    onSuccess: (result, { cardId }) => {
      // Invalidate card detail to update counts
      queryClient.invalidateQueries({
        queryKey: ['pulse-card', cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ['pulse-cards'],
      });
      queryClient.invalidateQueries({
        queryKey: ['pulse-feed', 'unified'],
      });

      // Show feedback for non-bookmark engagements
      if (result.engagementType !== "bookmark") {
        const action = result.added ? "Added" : "Removed";
        const label = result.engagementType === "fire" ? "🔥" :
                      result.engagementType === "gold" ? "🥇" : "💾";
        const xpAmount = PULSE_CARD_XP_REWARDS.ENGAGEMENT_RECEIVED[result.engagementType];
        const xpInfo = result.added && xpAmount > 0 ? ` (Creator gets +${xpAmount} XP)` : "";
        toast.success(`${action} ${label}${xpInfo}`);
      }
    },
  });
}

// =====================================================
// CONVENIENCE HOOKS FOR SPECIFIC ENGAGEMENT TYPES
// =====================================================

export function useToggleCardFire() {
  const toggleEngagement = useToggleCardEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "fire" }),
    mutateAsync: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "fire" }),
  };
}

export function useToggleCardGold() {
  const toggleEngagement = useToggleCardEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "gold" }),
    mutateAsync: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "gold" }),
  };
}

export function useToggleCardSave() {
  const toggleEngagement = useToggleCardEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "save" }),
    mutateAsync: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "save" }),
  };
}

export function useToggleCardBookmark() {
  const toggleEngagement = useToggleCardEngagement();

  return {
    ...toggleEngagement,
    mutate: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutate({ ...params, engagementType: "bookmark" }),
    mutateAsync: (params: Omit<ToggleCardEngagementParams, "engagementType">) =>
      toggleEngagement.mutateAsync({ ...params, engagementType: "bookmark" }),
  };
}

// =====================================================
// GET BOOKMARKED CARDS (for profile)
// =====================================================

export function useBookmarkedCards(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_CARD_QUERY_KEYS.cardEngagements, "bookmarks", providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_card_engagements")
        .select(`
          id,
          created_at,
          card:pulse_cards!pulse_card_engagements_card_id_fkey(
            id,
            status,
            view_count,
            build_count,
            fire_count,
            gold_count,
            save_count,
            topic:pulse_card_topics(id, name, icon),
            creator:solution_providers!seed_creator_id(id, first_name, last_name)
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
// GET SAVED CARDS (for profile)
// =====================================================

export function useSavedCards(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_CARD_QUERY_KEYS.cardEngagements, "saves", providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_card_engagements")
        .select(`
          id,
          created_at,
          card:pulse_cards!pulse_card_engagements_card_id_fkey(
            id,
            status,
            view_count,
            build_count,
            fire_count,
            gold_count,
            save_count,
            topic:pulse_card_topics(id, name, icon),
            creator:solution_providers!seed_creator_id(id, first_name, last_name)
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
