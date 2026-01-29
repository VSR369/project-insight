/**
 * Pulse Content Hooks Tests
 * Tests for usePulseContent, usePulseFeed, useMyPulseContent, and mutation hooks
 */
import { describe, it, expect, vi, beforeEach, waitFor } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  usePulseFeed, 
  usePulseContentDetail, 
  useMyPulseContent,
  useCreatePulseContent,
  useUpdatePulseContent,
  usePublishPulseContent,
  useDeletePulseContent,
  useArchivePulseContent
} from "@/hooks/queries/usePulseContent";
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
    info: vi.fn(),
  },
}));

// Mock audit fields
vi.mock("@/lib/auditFields", () => ({
  withCreatedBy: vi.fn((data) => Promise.resolve({ ...data, created_by: "test-user-id" })),
  withUpdatedBy: vi.fn((data) => Promise.resolve({ ...data, updated_by: "test-user-id" })),
}));

// Mock error handler
vi.mock("@/lib/errorHandler", () => ({
  handleMutationError: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("usePulseFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches published content from the feed", async () => {
    const mockContent = [
      {
        id: "content-1",
        content_type: "post",
        caption: "Test post",
        content_status: "published",
        provider: { id: "provider-1", first_name: "John", last_name: "Doe" },
        tags: [{ tag: { id: "tag-1", name: "tech" } }],
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockRange = vi.fn().mockResolvedValue({ data: mockContent, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockOrder.mockReturnValue({ range: mockRange });

    const { result } = renderHook(() => usePulseFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith("pulse_content");
    expect(result.current.data).toEqual(mockContent);
  });

  it("filters feed by content type", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockRange = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockOrder.mockReturnValue({ range: mockRange });

    const { result } = renderHook(
      () => usePulseFeed({ contentType: "spark" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Content type filter should be applied
    expect(mockEq).toHaveBeenCalled();
  });

  it("handles empty feed state gracefully", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockRange = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockOrder.mockReturnValue({ range: mockRange });

    const { result } = renderHook(() => usePulseFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it("handles fetch errors correctly", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockRange = vi.fn().mockResolvedValue({ 
      data: null, 
      error: { message: "Database error" } 
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockOrder.mockReturnValue({ range: mockRange });

    const { result } = renderHook(() => usePulseFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Database error");
  });
});

describe("usePulseContentDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single content by ID", async () => {
    const mockContent = {
      id: "content-1",
      content_type: "article",
      title: "Test Article",
      body_text: "Content body",
      provider: { id: "provider-1", first_name: "Jane", last_name: "Smith" },
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockContent, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });

    const { result } = renderHook(
      () => usePulseContentDetail("content-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockContent);
  });

  it("returns null when contentId is undefined", async () => {
    const { result } = renderHook(
      () => usePulseContentDetail(undefined),
      { wrapper: createWrapper() }
    );

    // Query should not be enabled
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useMyPulseContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches user's own content", async () => {
    const mockContent = [
      { id: "content-1", content_status: "draft", caption: "Draft" },
      { id: "content-2", content_status: "published", caption: "Published" },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockContent, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });

    const { result } = renderHook(
      () => useMyPulseContent("provider-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockContent);
  });

  it("returns empty array when providerId is undefined", async () => {
    const { result } = renderHook(
      () => useMyPulseContent(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("filters by status when provided", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });

    const { result } = renderHook(
      () => useMyPulseContent("provider-1", "draft"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have called eq with status filter
    expect(mockEq).toHaveBeenCalled();
  });
});

describe("Content Mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useCreatePulseContent applies audit fields on create", async () => {
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "new-content", content_status: "draft" },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    });

    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    const { result } = renderHook(() => useCreatePulseContent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      provider_id: "provider-1",
      content_type: "post",
      caption: "Test",
    } as any);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have audit fields added via withCreatedBy mock
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: "test-user-id" })
    );
  });

  it("useUpdatePulseContent applies audit fields on update", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "content-1", caption: "Updated" },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    const { result } = renderHook(() => useUpdatePulseContent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "content-1",
      caption: "Updated caption",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updated_by: "test-user-id" })
    );
  });

  it("usePublishPulseContent changes status to published", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "content-1", content_status: "published" },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    const { result } = renderHook(() => usePublishPulseContent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("content-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ content_status: "published" })
    );
  });

  it("useDeletePulseContent performs soft delete", async () => {
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

    const { result } = renderHook(() => useDeletePulseContent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("content-1");

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

  it("useArchivePulseContent changes status to archived", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "content-1", content_status: "archived" },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });

    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    const { result } = renderHook(() => useArchivePulseContent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("content-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ content_status: "archived" })
    );
  });
});
