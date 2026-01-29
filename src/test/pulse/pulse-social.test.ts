/**
 * Pulse Social Hooks Tests
 * Tests for comments CRUD, follow/unfollow, notifications
 */
import { describe, it, expect, vi, beforeEach, waitFor } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  useContentComments,
  useAddComment,
  useDeleteComment,
  useIsFollowing,
  useToggleFollow,
  useFollowers,
  useFollowing,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead
} from "@/hooks/queries/usePulseSocial";
import React from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

describe("useContentComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches comments with nested replies", async () => {
    const mockComments = [
      {
        id: "comment-1",
        comment_text: "Test comment",
        provider: { id: "provider-1", first_name: "John", last_name: "Doe" },
      },
    ];

    const mockReplies = [
      {
        id: "reply-1",
        comment_text: "Reply to comment",
        parent_comment_id: "comment-1",
        provider: { id: "provider-2", first_name: "Jane", last_name: "Smith" },
      },
    ];

    // First call for top-level comments
    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Top-level comments query
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  order: () => Promise.resolve({ data: mockComments, error: null }),
                }),
              }),
            }),
          }),
        };
      } else {
        // Replies query
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockReplies, error: null }),
              }),
            }),
          }),
        };
      }
    });

    const { result } = renderHook(
      () => useContentComments("content-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].replies).toBeDefined();
  });

  it("returns empty array when contentId is undefined", async () => {
    const { result } = renderHook(
      () => useContentComments(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useAddComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a new comment", async () => {
    const mockComment = {
      id: "new-comment",
      comment_text: "New comment",
      content_id: "content-1",
    };

    (supabase.from as any).mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockComment, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAddComment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      content_id: "content-1",
      provider_id: "provider-1",
      comment_text: "New comment",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockComment);
  });

  it("adds a reply to existing comment", async () => {
    const mockReply = {
      id: "new-reply",
      comment_text: "Reply text",
      content_id: "content-1",
      parent_comment_id: "comment-1",
    };

    (supabase.from as any).mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockReply, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAddComment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      content_id: "content-1",
      provider_id: "provider-1",
      comment_text: "Reply text",
      parent_comment_id: "comment-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.parent_comment_id).toBe("comment-1");
  });
});

describe("useDeleteComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performs soft delete on comment", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "test-user-id" } },
    });

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      commentId: "comment-1",
      contentId: "content-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_deleted: true,
        deleted_by: "test-user-id",
      })
    );
  });
});

describe("useIsFollowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when following", async () => {
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: "connection-1" }, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useIsFollowing("follower-1", "following-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
  });

  it("returns false when not following", async () => {
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
      () => useIsFollowing("follower-1", "following-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it("returns false when same user (can't follow self)", async () => {
    const { result } = renderHook(
      () => useIsFollowing("provider-1", "provider-1"),
      { wrapper: createWrapper() }
    );

    // Query should not be enabled for self-follow check
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useToggleFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates follow when not following", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      insert: mockInsert,
    });

    const { result } = renderHook(() => useToggleFollow(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      followerId: "follower-1",
      followingId: "following-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      followed: true,
      followingId: "following-1",
    });
    expect(mockInsert).toHaveBeenCalled();
  });

  it("deletes follow when already following", async () => {
    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: "connection-1" }, error: null }),
          }),
        }),
      }),
      delete: mockDelete,
    });

    mockDelete.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useToggleFollow(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      followerId: "follower-1",
      followingId: "following-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      followed: false,
      followingId: "following-1",
    });
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("useFollowers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches followers list", async () => {
    const mockFollowers = [
      { id: "conn-1", follower: { id: "p1", first_name: "John", last_name: "Doe" } },
      { id: "conn-2", follower: { id: "p2", first_name: "Jane", last_name: "Smith" } },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFollowers, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useFollowers("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });
});

describe("useFollowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches following list", async () => {
    const mockFollowing = [
      { id: "conn-1", following: { id: "p1", first_name: "Alice", last_name: "Brown" } },
    ];

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFollowing, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useFollowing("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
  });
});

describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useUnreadNotificationCount returns count", async () => {
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ count: 5, error: null }),
        }),
      }),
    });

    const { result } = renderHook(
      () => useUnreadNotificationCount("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(5);
  });

  it("useMarkNotificationRead marks single notification", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("notification-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_read: true })
    );
  });

  it("useMarkAllNotificationsRead marks all for provider", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockResolve = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      update: mockUpdate,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockResolve });

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("provider-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_read: true })
    );
  });
});
