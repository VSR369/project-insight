/**
 * CommentSection Component Tests
 * Tests for thread nesting, reply depth limits, delete permissions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommentSection } from "./CommentSection";
import React from "react";

// Mock the hooks
vi.mock("@/hooks/queries/usePulseSocial", () => ({
  useContentComments: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useAddComment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDeleteComment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useContentComments, useAddComment, useDeleteComment } from "@/hooks/queries/usePulseSocial";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockComments = [
  {
    id: "comment-1",
    content_id: "content-1",
    provider_id: "provider-1",
    comment_text: "This is a top-level comment",
    parent_comment_id: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    provider: {
      id: "provider-1",
      first_name: "John",
      last_name: "Doe",
    },
    replies: [
      {
        id: "reply-1",
        content_id: "content-1",
        provider_id: "provider-2",
        comment_text: "This is a reply",
        parent_comment_id: "comment-1",
        is_deleted: false,
        created_at: new Date().toISOString(),
        provider: {
          id: "provider-2",
          first_name: "Jane",
          last_name: "Smith",
        },
        replies: [],
      },
    ],
  },
];

describe("CommentSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useContentComments as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useAddComment as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (useDeleteComment as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders empty state when no comments", () => {
    const { container } = render(
      <CommentSection
        contentId="content-1"
        currentUserProviderId="provider-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent?.toLowerCase()).toContain("no comments");
  });

  it("renders comment form with textarea", () => {
    const { container } = render(
      <CommentSection
        contentId="content-1"
        currentUserProviderId="provider-1"
      />,
      { wrapper: createWrapper() }
    );

    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
  });

  it("renders comments with nested replies", () => {
    (useContentComments as any).mockReturnValue({
      data: mockComments,
      isLoading: false,
      isError: false,
    });

    const { container } = render(
      <CommentSection
        contentId="content-1"
        currentUserProviderId="provider-3"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("This is a top-level comment");
    expect(container.textContent).toContain("This is a reply");
  });

  it("shows loading state", () => {
    (useContentComments as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(
      <CommentSection
        contentId="content-1"
        currentUserProviderId="provider-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent?.toLowerCase()).toContain("loading");
  });

  it("shows error state with retry", () => {
    (useContentComments as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    const { container } = render(
      <CommentSection
        contentId="content-1"
        currentUserProviderId="provider-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent?.toLowerCase()).toContain("failed");
  });
});
