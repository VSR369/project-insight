/**
 * Industry Pulse Stats & Gamification Hooks
 * Provider stats, streaks, loot boxes, leaderboards, skills
 * Per Project Knowledge standards
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { toast } from "sonner";
import { PULSE_QUERY_KEYS, xpToNextLevel, getStreakMultiplier } from "@/constants/pulse.constants";
import type { Tables } from "@/integrations/supabase/types";

// =====================================================
// TYPES
// =====================================================

export type PulseProviderStats = Tables<"pulse_provider_stats">;
export type PulseSkill = Tables<"pulse_skills">;
export type PulseDailyStandup = Tables<"pulse_daily_standups">;
export type PulseLootBox = Tables<"pulse_loot_boxes">;
export type PulseXpSnapshot = Tables<"pulse_xp_snapshots">;

export interface ProviderStatsWithProgress extends PulseProviderStats {
  levelProgress: {
    current: number;
    required: number;
    progress: number;
  };
  streakMultiplier: number;
}

export interface LeaderboardEntry {
  provider_id: string;
  provider_name: string;
  total_xp: number;
  current_level: number;
  rank: number;
  xp_change?: number; // For weekly/monthly leaderboards
}

// =====================================================
// PROVIDER STATS
// =====================================================

export function useProviderStats(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.providerStats, providerId],
    queryFn: async (): Promise<ProviderStatsWithProgress | null> => {
      if (!providerId) return null;

      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("*")
        .eq("provider_id", providerId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        ...data,
        levelProgress: xpToNextLevel(Number(data.total_xp)),
        streakMultiplier: getStreakMultiplier(data.current_streak),
      };
    },
    enabled: !!providerId,
    staleTime: 30 * 1000,
  });
}

// =====================================================
// SKILLS
// =====================================================

export function useProviderSkills(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.skills, providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_skills")
        .select(`
          *,
          industry_segment:industry_segments!pulse_skills_industry_segment_id_fkey(id, name, code),
          expertise_level:expertise_levels!pulse_skills_expertise_level_id_fkey(id, name, level_number)
        `)
        .eq("provider_id", providerId)
        .order("current_xp", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 60 * 1000,
  });
}

// =====================================================
// DAILY STANDUP
// =====================================================

export function useTodayStandup(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.dailyStandup, providerId, "today"],
    queryFn: async () => {
      if (!providerId) return null;

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .select("*")
        .eq("provider_id", providerId)
        .eq("standup_date", today)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 60 * 1000,
  });
}

export function useCompleteStandup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      updatesViewed,
    }: {
      providerId: string;
      updatesViewed: number;
    }) => {
      const today = new Date().toISOString().split("T")[0];

      // Upsert standup record
      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .upsert(
          {
            provider_id: providerId,
            standup_date: today,
            completed_at: new Date().toISOString(),
            updates_viewed: updatesViewed,
            xp_awarded: 10, // Base XP for completing standup
            visibility_boost_earned: true,
          },
          { onConflict: "provider_id,standup_date" }
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.dailyStandup, data.provider_id],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.providerStats, data.provider_id],
      });
      toast.success("Daily standup completed! +10 XP and visibility boost active");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "complete_standup" });
    },
  });
}

// =====================================================
// LOOT BOX
// =====================================================

export function useTodayLootBox(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.lootBox, providerId, "today"],
    queryFn: async () => {
      if (!providerId) return null;

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("pulse_loot_boxes")
        .select("*")
        .eq("provider_id", providerId)
        .eq("claim_date", today)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 60 * 1000,
  });
}

export function useOpenLootBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lootBoxId: string) => {
      // Generate random rewards based on streak multiplier
      const { data: lootBox, error: fetchError } = await supabase
        .from("pulse_loot_boxes")
        .select("*, provider:pulse_provider_stats!pulse_loot_boxes_provider_id_fkey(current_streak)")
        .eq("id", lootBoxId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const streak = (lootBox as any).provider?.current_streak || 0;
      const multiplier = getStreakMultiplier(streak);

      // Generate rewards
      const baseXp = Math.floor(Math.random() * 50) + 10; // 10-60 base XP
      const xpReward = Math.floor(baseXp * multiplier);
      const goldTokens = Math.random() < 0.1 * multiplier ? 1 : 0; // 10% chance per multiplier

      const rewards = {
        xp: xpReward,
        gold_tokens: goldTokens,
        visibility_boost_tokens: 0,
      };

      const { data, error } = await supabase
        .from("pulse_loot_boxes")
        .update({
          opened_at: new Date().toISOString(),
          rewards,
        })
        .eq("id", lootBoxId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { lootBox: data, rewards };
    },
    onSuccess: ({ lootBox, rewards }) => {
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.lootBox, lootBox.provider_id],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.providerStats, lootBox.provider_id],
      });

      const rewardMessages = [];
      if (rewards.xp > 0) rewardMessages.push(`+${rewards.xp} XP`);
      if (rewards.gold_tokens > 0) rewardMessages.push(`+${rewards.gold_tokens} Gold Token!`);

      toast.success(`🎁 Loot Box: ${rewardMessages.join(", ")}`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "open_loot_box" });
    },
  });
}

// =====================================================
// LEADERBOARDS
// =====================================================

export function useGlobalLeaderboard(limit = 50) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.leaderboard, "global", limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select(`
          provider_id,
          total_xp,
          current_level,
          provider:solution_providers!pulse_provider_stats_provider_id_fkey(first_name, last_name)
        `)
        .order("total_xp", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      return (data || []).map((entry, index) => ({
        provider_id: entry.provider_id,
        provider_name: `${(entry as any).provider?.first_name || ""} ${(entry as any).provider?.last_name || ""}`.trim() || "Anonymous",
        total_xp: Number(entry.total_xp),
        current_level: entry.current_level,
        rank: index + 1,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWeeklyLeaderboard(limit = 50) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.leaderboard, "weekly", limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Get the start of the current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff)).toISOString().split("T")[0];

      // Get snapshots from start of week
      const { data: startSnapshots, error: startError } = await supabase
        .from("pulse_xp_snapshots")
        .select("provider_id, total_xp_at_date")
        .eq("snapshot_date", weekStart)
        .eq("snapshot_type", "daily");

      if (startError) throw new Error(startError.message);

      // Get current stats
      const { data: currentStats, error: currentError } = await supabase
        .from("pulse_provider_stats")
        .select(`
          provider_id,
          total_xp,
          current_level,
          provider:solution_providers!pulse_provider_stats_provider_id_fkey(first_name, last_name)
        `)
        .order("total_xp", { ascending: false })
        .limit(limit * 2); // Fetch more to account for filtering

      if (currentError) throw new Error(currentError.message);

      // Calculate XP gained this week
      const startXpMap = new Map(
        (startSnapshots || []).map((s) => [s.provider_id, Number(s.total_xp_at_date)])
      );

      const leaderboard = (currentStats || [])
        .map((entry) => {
          const startXp = startXpMap.get(entry.provider_id) || 0;
          const xpChange = Number(entry.total_xp) - startXp;

          return {
            provider_id: entry.provider_id,
            provider_name: `${(entry as any).provider?.first_name || ""} ${(entry as any).provider?.last_name || ""}`.trim() || "Anonymous",
            total_xp: Number(entry.total_xp),
            current_level: entry.current_level,
            xp_change: xpChange,
            rank: 0,
          };
        })
        .sort((a, b) => b.xp_change - a.xp_change)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      return leaderboard;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useIndustryLeaderboard(industrySegmentId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.leaderboard, "industry", industrySegmentId, limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!industrySegmentId) return [];

      const { data, error } = await supabase
        .from("pulse_skills")
        .select(`
          provider_id,
          current_xp,
          current_level,
          provider:solution_providers!pulse_skills_provider_id_fkey(first_name, last_name)
        `)
        .eq("industry_segment_id", industrySegmentId)
        .order("current_xp", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      return (data || []).map((entry, index) => ({
        provider_id: entry.provider_id,
        provider_name: `${(entry as any).provider?.first_name || ""} ${(entry as any).provider?.last_name || ""}`.trim() || "Anonymous",
        total_xp: Number(entry.current_xp),
        current_level: entry.current_level,
        rank: index + 1,
      }));
    },
    enabled: !!industrySegmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// TAGS
// =====================================================

export function usePulseTags() {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.tags],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pulse_tags")
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useTrendingTags(limit = 10) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.trendingTags, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pulse_tags")
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
