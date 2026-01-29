/**
 * Pulse Engagement Hooks Tests
 * Tests for fire, gold, save, bookmark toggles and user engagement status
 */
import { describe, it, expect, vi, beforeEach, waitFor } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  useUserEngagements,
  useToggleEngagement,
  useToggleFire,
  useToggleGold,
  useToggleSave,
  useToggleBookmark,
  useBookmarkedContent,
  useSavedContent
} from "@/hooks/queries/usePulseEngagements";
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
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock error handler
vi.mock("@/lib/errorHandler", () => ({
  handleMutationError: vi.fn(),
  logWarning: vi.fn(),
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

describe("useUserEngagements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all false when no engagements exist", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockResult = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq });
    // Last eq call returns the promise
    mockEq.mockImplementation(() => {
      return { eq: mockEq, then: mockResult().then.bind(mockResult()) };
    });

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useUserEngagements("content-1", "provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      fire: false,
      gold: false,
      save: false,
      bookmark: false,
    });
  });

  it("returns correct engagement status based on data", async () => {
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ 
              data: [
                { engagement_type: "fire" },
                { engagement_type: "bookmark" },
              ], 
              error: null 
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useUserEngagements("content-1", "provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      fire: true,
      gold: false,
      save: false,
      bookmark: true,
    });
  });

  it("returns default values when contentId is undefined", async () => {
    const { result } = renderHook(
      () => useUserEngagements(undefined, "provider-1"),
      { wrapper: createWrapper() }
    );

    // Query should not be enabled, fetch status idle
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns default values when providerId is undefined", async () => {
    const { result } = renderHook(
      () => useUserEngagements("content-1", undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useToggleEngagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new engagement when none exists", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
      insert: mockInsert,
    });

    const { result } = renderHook(() => useToggleEngagement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
      engagementType: "fire",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      added: true,
      engagementType: "fire",
    });
  });

  it("toggles existing engagement (soft delete/restore)", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ 
                data: { id: "engagement-1", is_deleted: false }, 
                error: null 
              }),
            }),
          }),
        }),
      }),
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useToggleEngagement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
      engagementType: "fire",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should toggle is_deleted from false to true
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_deleted: true })
    );
    expect(result.current.data).toEqual({
      added: false, // was deleted
      engagementType: "fire",
    });
  });

  it("restores soft-deleted engagement", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ 
                data: { id: "engagement-1", is_deleted: true }, 
                error: null 
              }),
            }),
          }),
        }),
      }),
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useToggleEngagement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
      engagementType: "fire",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should toggle is_deleted from true to false
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_deleted: false })
    );
    expect(result.current.data).toEqual({
      added: true, // was restored
      engagementType: "fire",
    });
  });
});

describe("Convenience hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("useToggleFire calls toggle with fire type", async () => {
    const { result } = renderHook(() => useToggleFire(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.engagementType).toBe("fire");
  });

  it("useToggleGold calls toggle with gold type", async () => {
    const { result } = renderHook(() => useToggleGold(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.engagementType).toBe("gold");
  });

  it("useToggleSave calls toggle with save type", async () => {
    const { result } = renderHook(() => useToggleSave(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.engagementType).toBe("save");
  });

  it("useToggleBookmark calls toggle with bookmark type", async () => {
    const { result } = renderHook(() => useToggleBookmark(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.engagementType).toBe("bookmark");
  });
});

describe("useBookmarkedContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches bookmarked content for provider", async () => {
    const mockBookmarks = [
      {
        id: "bookmark-1",
        created_at: "2024-01-01",
        content: { id: "content-1", title: "Test" },
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockBookmarks, error: null }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useBookmarkedContent("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBookmarks);
  });

  it("returns empty array when providerId is undefined", async () => {
    const { result } = renderHook(
      () => useBookmarkedContent(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useSavedContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches saved content for provider", async () => {
    const mockSaved = [
      {
        id: "save-1",
        created_at: "2024-01-01",
        content: { id: "content-1", title: "Saved Item" },
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockSaved, error: null }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useSavedContent("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSaved);
  });
});

describe("Optimistic updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically updates engagement status on mutation", async () => {
    // Set up query data first
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Seed the cache with initial engagement status
    queryClient.setQueryData(
      ["pulse:user-engagements", "content-1", "provider-1"],
      { fire: false, gold: false, save: false, bookmark: false }
    );

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useToggleEngagement(), { wrapper });

    result.current.mutate({
      contentId: "content-1",
      providerId: "provider-1",
      engagementType: "fire",
    });

    // Check optimistic update was applied
    await waitFor(() => {
      const cachedData = queryClient.getQueryData([
        "pulse:user-engagements",
        "content-1",
        "provider-1",
      ]);
      expect(cachedData).toEqual({
        fire: true, // Optimistically updated
        gold: false,
        save: false,
        bookmark: false,
      });
    });
  });
});
