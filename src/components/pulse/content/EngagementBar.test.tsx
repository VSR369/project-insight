/**
 * EngagementBar Component Tests
 * Tests for button states, own-content disabled, click handlers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EngagementBar } from "./EngagementBar";
import React from "react";

// Mock the hooks
vi.mock("@/hooks/queries/usePulseEngagements", () => ({
  useUserEngagements: vi.fn(() => ({
    data: { fire: false, gold: false, save: false, bookmark: false },
  })),
  useToggleEngagement: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useUserEngagements, useToggleEngagement } from "@/hooks/queries/usePulseEngagements";
import { toast } from "sonner";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("EngagementBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUserEngagements as any).mockReturnValue({
      data: { fire: false, gold: false, save: false, bookmark: false },
    });
    (useToggleEngagement as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders all engagement buttons", () => {
    const { container } = render(
      <EngagementBar
        contentId="content-1"
        providerId="provider-1"
        currentUserProviderId="provider-2"
        fireCount={10}
        commentCount={5}
        goldCount={2}
        saveCount={3}
      />,
      { wrapper: createWrapper() }
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5); // Fire, Comment, Gold, Save, Bookmark, Share
  });

  it("displays formatted counts", () => {
    const { container } = render(
      <EngagementBar
        contentId="content-1"
        providerId="provider-1"
        currentUserProviderId="provider-2"
        fireCount={1500}
        commentCount={5}
        goldCount={2}
        saveCount={3}
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("1.5K");
  });

  it("shows error toast when trying to engage with own content", () => {
    const { container } = render(
      <EngagementBar
        contentId="content-1"
        providerId="provider-1"
        currentUserProviderId="provider-1" // Same as content owner
        fireCount={10}
        commentCount={5}
        goldCount={2}
        saveCount={3}
      />,
      { wrapper: createWrapper() }
    );

    // Find and click fire button
    const fireButton = container.querySelector('button[aria-label*="fire"]');
    fireButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(toast.error).toHaveBeenCalledWith("You can't engage with your own content");
  });

  it("allows bookmarking own content", () => {
    const mockMutate = vi.fn();
    (useToggleEngagement as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    const { container } = render(
      <EngagementBar
        contentId="content-1"
        providerId="provider-1"
        currentUserProviderId="provider-1" // Same as content owner
        fireCount={10}
        commentCount={5}
        goldCount={2}
        saveCount={3}
      />,
      { wrapper: createWrapper() }
    );

    // Find and click bookmark button
    const bookmarkButton = container.querySelector('button[aria-label*="ookmark"]');
    bookmarkButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ engagementType: "bookmark" })
    );
  });

  it("shows active state for engaged buttons", () => {
    (useUserEngagements as any).mockReturnValue({
      data: { fire: true, gold: false, save: false, bookmark: true },
    });

    const { container } = render(
      <EngagementBar
        contentId="content-1"
        providerId="provider-1"
        currentUserProviderId="provider-2"
        fireCount={10}
        commentCount={5}
        goldCount={2}
        saveCount={3}
      />,
      { wrapper: createWrapper() }
    );

    const fireButton = container.querySelector('button[aria-pressed="true"]');
    expect(fireButton).toBeTruthy();
  });

  it("calls onCommentClick when comment button is clicked", () => {
    const onCommentClick = vi.fn();

    const { container } = render(
      <EngagementBar
        contentId="content-1"
        providerId="provider-1"
        currentUserProviderId="provider-2"
        fireCount={10}
        commentCount={5}
        goldCount={2}
        saveCount={3}
        onCommentClick={onCommentClick}
      />,
      { wrapper: createWrapper() }
    );

    const commentButton = container.querySelector('button[aria-label*="omment"]');
    commentButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onCommentClick).toHaveBeenCalled();
  });
});
