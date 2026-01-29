/**
 * PulseDashboardWidget Component Tests
 * Tests for loading, inactive user, active user with stats states
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PulseDashboardWidget } from "./PulseDashboardWidget";
import React from "react";

// Mock the hooks
vi.mock("@/hooks/queries/usePulseStats", () => ({
  useProviderStats: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
}));

// Mock useProvider hook
vi.mock("@/hooks/useProvider", () => ({
  useProvider: vi.fn(() => ({
    provider: { id: "provider-1" },
  })),
}));

import { useProviderStats } from "@/hooks/queries/usePulseStats";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
};

describe("PulseDashboardWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the widget header", () => {
    (useProviderStats as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<PulseDashboardWidget />, {
      wrapper: createWrapper(),
    });

    expect(container.textContent).toContain("Industry Pulse");
  });

  it("renders inactive user state with CTA", () => {
    (useProviderStats as any).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    const { container } = render(<PulseDashboardWidget />, {
      wrapper: createWrapper(),
    });

    expect(container.textContent?.toLowerCase()).toContain("get started");
  });

  it("renders active user with stats", () => {
    (useProviderStats as any).mockReturnValue({
      data: {
        provider_id: "provider-1",
        total_xp: 1500,
        current_level: 5,
        current_streak: 7,
        gold_token_balance: 25,
        levelProgress: { current: 100, required: 200, progress: 50 },
        streakMultiplier: 1.5,
      },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<PulseDashboardWidget />, {
      wrapper: createWrapper(),
    });

    expect(container.textContent).toContain("Level 5");
  });

  it("links to pulse feed", () => {
    (useProviderStats as any).mockReturnValue({
      data: {
        provider_id: "provider-1",
        total_xp: 100,
        current_level: 2,
        current_streak: 1,
        gold_token_balance: 10,
        levelProgress: { current: 50, required: 100, progress: 50 },
        streakMultiplier: 1.0,
      },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<PulseDashboardWidget />, {
      wrapper: createWrapper(),
    });

    const feedLink = container.querySelector('a[href="/pulse/feed"]');
    expect(feedLink).toBeTruthy();
  });
});
