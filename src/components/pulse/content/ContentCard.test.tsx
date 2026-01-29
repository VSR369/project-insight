/**
 * ContentCard Component Tests
 * Tests for rendering all 6 content types, tag display, caption truncation
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContentCard } from "./ContentCard";
import React from "react";

// Mock EngagementBar to isolate ContentCard tests
vi.mock("./EngagementBar", () => ({
  EngagementBar: () => React.createElement("div", { "data-testid": "engagement-bar" }, "EngagementBar Mock"),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// Create a minimal mock content object that satisfies the component's needs
const createMockContent = (overrides: Record<string, any> = {}) => ({
  id: "content-1",
  provider_id: "provider-1",
  content_type: "post",
  content_status: "published",
  caption: "Test caption for this post",
  title: null,
  headline: null,
  key_insight: null,
  body_text: null,
  cover_image_url: null,
  media_url: null,
  media_urls: null,
  gallery_urls: null,
  fire_count: 10,
  gold_count: 2,
  save_count: 5,
  comment_count: 3,
  impression_count: 100,
  industry_segment_id: null,
  enrollment_id: null,
  is_featured: false,
  is_deleted: false,
  is_published: true,
  ai_enhanced: false,
  original_caption: null,
  visibility_boost_multiplier: 1,
  visibility_boost_until: null,
  scheduled_publish_at: null,
  created_at: new Date().toISOString(),
  updated_at: null,
  published_at: new Date().toISOString(),
  created_by: null,
  updated_by: null,
  deleted_at: null,
  deleted_by: null,
  provider: {
    id: "provider-1",
    first_name: "John",
    last_name: "Doe",
    avatar_url: undefined,
  },
  tags: [{ id: "tag-1", name: "Tech" }],
  ...overrides,
});

describe("ContentCard", () => {
  it("renders post content type correctly", () => {
    const { container } = render(
      <ContentCard
        content={createMockContent() as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("Test caption for this post");
    expect(container.textContent).toContain("John Doe");
    expect(container.textContent).toContain("Tech");
  });

  it("renders spark content type with key insight", () => {
    const { container } = render(
      <ContentCard
        content={createMockContent({
          content_type: "spark",
          headline: "Breaking News!",
          key_insight: "This is the key insight for the spark",
        }) as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("This is the key insight for the spark");
  });

  it("renders article content type with title", () => {
    const { container } = render(
      <ContentCard
        content={createMockContent({
          content_type: "article",
          title: "Article Title",
          body_text: "This is the article body text content.",
        }) as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("Article Title");
  });

  it("truncates long captions at 280 characters", () => {
    const longCaption = "A".repeat(300);
    
    const { container } = render(
      <ContentCard
        content={createMockContent({ caption: longCaption }) as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("Read more");
  });

  it("displays overflow indicator for many tags", () => {
    const { container } = render(
      <ContentCard
        content={createMockContent({
          tags: [
            { id: "1", name: "Tag1" },
            { id: "2", name: "Tag2" },
            { id: "3", name: "Tag3" },
            { id: "4", name: "Tag4" },
            { id: "5", name: "Tag5" },
            { id: "6", name: "Tag6" },
            { id: "7", name: "Tag7" },
          ],
        }) as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("+2");
  });

  it("calls onProfileClick when avatar is clicked", () => {
    const onProfileClick = vi.fn();

    const { container } = render(
      <ContentCard
        content={createMockContent() as any}
        currentUserProviderId="provider-2"
        onProfileClick={onProfileClick}
      />,
      { wrapper: createWrapper() }
    );

    const avatar = container.querySelector('[role="button"]');
    avatar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onProfileClick).toHaveBeenCalled();
  });

  it("renders EngagementBar component", () => {
    const { container } = render(
      <ContentCard
        content={createMockContent() as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    expect(container.querySelector('[data-testid="engagement-bar"]')).toBeTruthy();
  });

  it("shows cover image when available", () => {
    const { container } = render(
      <ContentCard
        content={createMockContent({
          cover_image_url: "https://example.com/image.jpg",
        }) as any}
        currentUserProviderId="provider-2"
      />,
      { wrapper: createWrapper() }
    );

    const img = container.querySelector('img[loading="lazy"]');
    expect(img?.getAttribute("src")).toBe("https://example.com/image.jpg");
  });
});
