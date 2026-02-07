/**
 * Unified Pulse Feed Hook
 * Combines pulse_content and pulse_cards for the main feed
 * PERFORMANCE: Uses visibility-aware polling to pause when tab is hidden
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PULSE_QUERY_KEYS, PULSE_POLLING_INTERVALS } from '@/constants/pulse.constants';
import { useVisibilityPollingInterval } from '@/lib/useVisibilityPolling';

// ===========================================
// Types
// ===========================================

export interface FeedContentItem {
  id: string;
  provider_id: string;
  content_type: string;
  content_status: string;
  created_at: string;
  caption?: string | null;
  title?: string | null;
  headline?: string | null;
  key_insight?: string | null;
  body_text?: string | null;
  media_urls?: string[] | null;
  cover_image_url?: string | null;
  duration_seconds?: number | null;
  fire_count: number;
  comment_count: number;
  gold_count: number;
  save_count: number;
  provider?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  industry_segment?: {
    id: string;
    name: string;
  } | null;
  tags?: Array<{ id: string; name: string }>;
}

export interface FeedCardItem {
  id: string;
  topic_id: string;
  seed_creator_id: string;
  status: string;
  view_count: number;
  share_count: number;
  build_count: number;
  // Engagement counts (XP integration)
  fire_count: number;
  gold_count: number;
  save_count: number;
  comment_count: number;
  created_at: string;
  compiled_narrative: string | null;
  compiled_at: string | null;
  topic?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  } | null;
  creator?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  featured_layer?: {
    id: string;
    content_text: string;
    media_url: string | null;
    media_type: string | null;
    votes_up: number;
    votes_down: number;
  } | null;
}

export interface UnifiedFeedItem {
  id: string;
  type: 'content' | 'card';
  created_at: string;
  content?: FeedContentItem;
  card?: FeedCardItem;
}

export interface UnifiedFeedFilters {
  limit?: number;
  offset?: number;
}

// ===========================================
// Unified Feed Query
// ===========================================

export function useUnifiedPulseFeed(filters: UnifiedFeedFilters = {}) {
  const { limit = 20, offset = 0 } = filters;
  
  // PERFORMANCE: Pause polling when tab is hidden
  const refetchInterval = useVisibilityPollingInterval(PULSE_POLLING_INTERVALS.FEED_MS);

  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.feed, 'unified', filters],
    queryFn: async () => {
      // Fetch pulse_content
      const { data: contentData, error: contentError } = await supabase
        .from('pulse_content')
        .select(`
          id, provider_id, content_type, content_status, created_at,
          caption, title, headline, key_insight, body_text,
          media_urls, cover_image_url, duration_seconds,
          fire_count, comment_count, gold_count, save_count,
          provider:solution_providers!pulse_content_provider_id_fkey(id, first_name, last_name),
          industry_segment:industry_segments!pulse_content_industry_segment_id_fkey(id, name),
          tags:pulse_content_tags(tag:pulse_tags(id, name))
        `)
        .eq('content_status', 'published')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (contentError) throw new Error(contentError.message);

      // Fetch pulse_cards with featured layer, compiled narrative, and engagement counts
      const { data: cardsData, error: cardsError } = await supabase
        .from('pulse_cards')
        .select(`
          id, topic_id, seed_creator_id, status, view_count, share_count, build_count,
          fire_count, gold_count, save_count, comment_count,
          created_at, compiled_narrative, compiled_at,
          topic:pulse_card_topics(id, name, slug, icon, color),
          creator:solution_providers!seed_creator_id(id, first_name, last_name),
          featured_layer:pulse_card_layers!current_featured_layer_id(
            id, content_text, media_url, media_type, votes_up, votes_down
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cardsError) throw new Error(cardsError.message);

      // Transform content items
      const contentItems: UnifiedFeedItem[] = (contentData || []).map((c) => ({
        id: c.id,
        type: 'content' as const,
        created_at: c.created_at,
        content: {
          ...c,
          tags: c.tags?.map((t: { tag: { id: string; name: string } }) => t.tag) ?? [],
        } as FeedContentItem,
      }));

      // Transform card items
      const cardItems: UnifiedFeedItem[] = (cardsData || []).map((c) => ({
        id: c.id,
        type: 'card' as const,
        created_at: c.created_at,
        card: c as FeedCardItem,
      }));

      // Merge and sort by created_at descending
      const unified = [...contentItems, ...cardItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply pagination (after merge)
      return unified.slice(offset, offset + limit);
    },
    refetchInterval,
    staleTime: 10 * 1000,
  });
}
