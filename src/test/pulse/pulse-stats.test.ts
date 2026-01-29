/**
 * Pulse Stats & Gamification Hooks Tests
 * Tests for XP calculation, level progress, streak multipliers, leaderboards
 */
import { describe, it, expect, vi, beforeEach, waitFor } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  useProviderStats,
  useProviderSkills,
  useTodayStandup,
  useCompleteStandup,
  useTodayLootBox,
  useGlobalLeaderboard,
  useWeeklyLeaderboard,
  useIndustryLeaderboard,
  usePulseTags,
  useTrendingTags
} from "@/hooks/queries/usePulseStats";
import { xpToNextLevel, getStreakMultiplier } from "@/constants/pulse.constants";
import React from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock error handler
vi.mock("@/lib/errorHandler", () => ({
  handleMutationError: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("XP Calculation Functions", () => {
  it("calculates level progress correctly for 0 XP", () => {
    const progress = xpToNextLevel(0);
    expect(progress.current).toBe(0);
    expect(progress.required).toBeGreaterThan(0);
    expect(progress.progress).toBe(0);
  });

  it("calculates level progress for mid-level XP", () => {
    const progress = xpToNextLevel(500);
    expect(progress.current).toBeLessThanOrEqual(progress.required);
    expect(progress.progress).toBeGreaterThanOrEqual(0);
    expect(progress.progress).toBeLessThanOrEqual(100);
  });

  it("calculates level progress for high XP", () => {
    const progress = xpToNextLevel(10000);
    expect(progress.current).toBeLessThanOrEqual(progress.required);
  });
});

describe("Streak Multiplier Functions", () => {
  it("returns 1.0x for 0 streak", () => {
    expect(getStreakMultiplier(0)).toBe(1.0);
  });

  it("returns 1.0x for small streak", () => {
    expect(getStreakMultiplier(3)).toBe(1.0);
  });

  it("returns higher multiplier for longer streaks", () => {
    const mult7 = getStreakMultiplier(7);
    const mult14 = getStreakMultiplier(14);
    const mult30 = getStreakMultiplier(30);

    expect(mult7).toBeGreaterThanOrEqual(1.0);
    expect(mult14).toBeGreaterThanOrEqual(mult7);
    expect(mult30).toBeGreaterThanOrEqual(mult14);
  });

  it("caps multiplier at 3.0x", () => {
    expect(getStreakMultiplier(100)).toBeLessThanOrEqual(3.0);
  });
});

describe("useProviderStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and enriches provider stats", async () => {
    const mockStats = {
      provider_id: "provider-1",
      total_xp: 1000,
      current_level: 5,
      current_streak: 7,
      gold_token_balance: 25,
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: mockStats, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useProviderStats("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveProperty("levelProgress");
    expect(result.current.data).toHaveProperty("streakMultiplier");
    expect(result.current.data?.total_xp).toBe(1000);
  });

  it("returns null when stats don't exist", async () => {
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useProviderStats("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it("returns null when providerId is undefined", async () => {
    const { result } = renderHook(
      () => useProviderStats(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useProviderSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches provider skills with industry info", async () => {
    const mockSkills = [
      {
        id: "skill-1",
        current_xp: 500,
        current_level: 3,
        is_verified: true,
        industry_segment: { id: "ind-1", name: "Technology" },
        expertise_level: { id: "exp-1", name: "Senior" },
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockSkills, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useProviderSkills("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].industry_segment?.name).toBe("Technology");
  });
});

describe("useTodayStandup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches today's standup status", async () => {
    const mockStandup = {
      id: "standup-1",
      completed_at: "2024-01-15T10:00:00Z",
      xp_awarded: 10,
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockStandup, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useTodayStandup("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.xp_awarded).toBe(10);
  });

  it("returns null when no standup today", async () => {
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useTodayStandup("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe("useCompleteStandup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes standup and awards XP", async () => {
    const mockResult = {
      id: "standup-1",
      provider_id: "provider-1",
      completed_at: new Date().toISOString(),
      xp_awarded: 10,
    };

    (supabase.from as any).mockReturnValue({
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockResult, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useCompleteStandup(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      providerId: "provider-1",
      updatesViewed: 5,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.xp_awarded).toBe(10);
  });
});

describe("useTodayLootBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches today's loot box", async () => {
    const mockLootBox = {
      id: "lootbox-1",
      opened_at: null,
      rewards: null,
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockLootBox, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useTodayLootBox("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.opened_at).toBeNull();
  });
});

describe("useGlobalLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches global leaderboard with ranks", async () => {
    const mockStats = [
      { provider_id: "p1", total_xp: 5000, current_level: 10, provider: { first_name: "Alice", last_name: "Brown" } },
      { provider_id: "p2", total_xp: 3000, current_level: 7, provider: { first_name: "Bob", last_name: "Smith" } },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: mockStats, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useGlobalLeaderboard(10),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].rank).toBe(1);
    expect(result.current.data?.[1].rank).toBe(2);
    expect(result.current.data?.[0].total_xp).toBeGreaterThan(result.current.data?.[1].total_xp);
  });
});

describe("useWeeklyLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates XP change from start of week", async () => {
    const mockSnapshots = [
      { provider_id: "p1", total_xp_at_date: 4000 },
    ];

    const mockCurrentStats = [
      { provider_id: "p1", total_xp: 5000, current_level: 10, provider: { first_name: "Alice", last_name: "Brown" } },
    ];

    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Snapshots query
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mockSnapshots, error: null }),
            }),
          }),
        };
      } else {
        // Current stats query
        return {
          select: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: mockCurrentStats, error: null }),
            }),
          }),
        };
      }
    });

    const { result } = renderHook(
      () => useWeeklyLeaderboard(10),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // XP change should be 5000 - 4000 = 1000
    expect(result.current.data?.[0].xp_change).toBe(1000);
  });
});

describe("useIndustryLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches leaderboard for specific industry", async () => {
    const mockSkills = [
      { provider_id: "p1", current_xp: 2000, current_level: 5, provider: { first_name: "Charlie", last_name: "Davis" } },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: mockSkills, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useIndustryLeaderboard("industry-1", 10),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].rank).toBe(1);
  });

  it("returns empty array when industrySegmentId is undefined", async () => {
    const { result } = renderHook(
      () => useIndustryLeaderboard(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePulseTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches active tags", async () => {
    const mockTags = [
      { id: "tag-1", name: "technology", usage_count: 100 },
      { id: "tag-2", name: "business", usage_count: 50 },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockTags, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => usePulseTags(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });
});

describe("useTrendingTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches top trending tags by usage", async () => {
    const mockTags = [
      { id: "tag-1", name: "ai", usage_count: 500 },
      { id: "tag-2", name: "startup", usage_count: 300 },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: mockTags, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useTrendingTags(5),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].usage_count).toBeGreaterThan(result.current.data?.[1].usage_count);
  });
});

describe("Edge Cases", () => {
  it("handles user with 0 XP correctly", async () => {
    const mockStats = {
      provider_id: "provider-1",
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: mockStats, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useProviderStats("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.current_level).toBe(1);
    expect(result.current.data?.levelProgress.current).toBe(0);
    expect(result.current.data?.levelProgress.progress).toBe(0);
  });

  it("handles streak breaks (0 streak) correctly", async () => {
    const mockStats = {
      provider_id: "provider-1",
      total_xp: 1000,
      current_level: 5,
      current_streak: 0, // Streak broken
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: mockStats, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useProviderStats("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.streakMultiplier).toBe(1.0);
  });
});
