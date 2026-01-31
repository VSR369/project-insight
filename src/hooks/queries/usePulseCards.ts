/**
 * PulsePages - Card CRUD Hooks
 * Following project standards with audit fields, error handling, and polling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from '@/lib/auditFields';
import { PULSE_CARDS_POLLING } from '@/constants/pulseCards.constants';
import type { CreateCardInput } from '@/lib/validations/pulseCard';

// ===========================================
// Types
// ===========================================

export interface PulseCard {
  id: string;
  topic_id: string;
  seed_creator_id: string;
  current_featured_layer_id: string | null;
  status: 'active' | 'flagged' | 'archived';
  view_count: number;
  share_count: number;
  build_count: number;
  // Engagement counts (XP integration)
  fire_count: number;
  gold_count: number;
  save_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  // Compilation fields
  compiled_narrative: string | null;
  compiled_at: string | null;
  compilation_stale: boolean;
  // Joined data
  topic?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  featured_layer?: {
    id: string;
    content_text: string;
    media_url: string | null;
    media_type: string | null;
    votes_up: number;
    votes_down: number;
  };
}

export interface CardFilters {
  topicId?: string;
  creatorId?: string;
  status?: 'active' | 'flagged' | 'archived';
  limit?: number;
}

// ===========================================
// Query: Fetch cards with filters
// ===========================================

export function usePulseCards(filters: CardFilters = {}) {
  return useQuery({
    queryKey: ['pulse-cards', filters],
    queryFn: async () => {
      let query = supabase
        .from('pulse_cards')
        .select(`
          *,
          topic:pulse_card_topics(id, name, slug, icon, color),
          creator:solution_providers!seed_creator_id(id, first_name, last_name)
        `)
        .eq('status', filters.status || 'active')
        .order('created_at', { ascending: false });

      if (filters.topicId) {
        query = query.eq('topic_id', filters.topicId);
      }

      if (filters.creatorId) {
        query = query.eq('seed_creator_id', filters.creatorId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data as PulseCard[];
    },
    refetchInterval: PULSE_CARDS_POLLING.FEED_MS,
  });
}

// ===========================================
// Query: Fetch single card with layers
// ===========================================

export function usePulseCard(cardId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-card', cardId],
    queryFn: async () => {
      if (!cardId) throw new Error('Card ID required');

      const { data, error } = await supabase
        .from('pulse_cards')
        .select(`
          *,
          topic:pulse_card_topics(id, name, slug, icon, color),
          creator:solution_providers!seed_creator_id(id, first_name, last_name)
        `)
        .eq('id', cardId)
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCard;
    },
    enabled: !!cardId,
    refetchInterval: PULSE_CARDS_POLLING.DETAIL_MS,
  });
}

// ===========================================
// Mutation: Create a new card
// ===========================================

interface CreateCardParams extends CreateCardInput {
  seed_creator_id: string;
}

export function useCreatePulseCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCardParams) => {
      const userId = await getCurrentUserId();
      
      // Create the card
      const cardData = {
        topic_id: params.topic_id,
        seed_creator_id: params.seed_creator_id,
        status: 'active' as const,
        created_by: userId,
      };

      const { data: card, error: cardError } = await supabase
        .from('pulse_cards')
        .insert(cardData)
        .select()
        .single();

      if (cardError) throw new Error(cardError.message);

      // Create the seed layer (first layer)
      const layerData = {
        card_id: card.id,
        creator_id: params.seed_creator_id,
        content_text: params.content_text,
        media_url: params.media_url || null,
        media_type: params.media_type || null,
        layer_order: 0,
        is_featured: true,
        featured_at: new Date().toISOString(),
        voting_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_by: userId,
      };

      const { data: layer, error: layerError } = await supabase
        .from('pulse_card_layers')
        .insert(layerData)
        .select()
        .single();

      if (layerError) throw new Error(layerError.message);

      // Update card with featured layer
      await supabase
        .from('pulse_cards')
        .update({ current_featured_layer_id: layer.id })
        .eq('id', card.id);

      return { card, layer };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-cards'] });
      toast.success('Card created successfully!');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_pulse_card' });
    },
  });
}

// ===========================================
// Mutation: Increment view count
// ===========================================

export function useIncrementCardView() {
  return useMutation({
    mutationFn: async (cardId: string) => {
      // Get current view count and increment
      const { data: card } = await supabase
        .from('pulse_cards')
        .select('view_count')
        .eq('id', cardId)
        .single();

      if (card) {
        await supabase
          .from('pulse_cards')
          .update({ view_count: (card.view_count || 0) + 1 })
          .eq('id', cardId);
      }
    },
    // Silent - no toast for view tracking
  });
}

// ===========================================
// Mutation: Share card (increment share count)
// ===========================================

export function useShareCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, providerId }: { cardId: string; providerId: string }) => {
      // Increment share count
      const { data: card } = await supabase
        .from('pulse_cards')
        .select('share_count, seed_creator_id')
        .eq('id', cardId)
        .single();

      if (card) {
        await supabase
          .from('pulse_cards')
          .update({ share_count: (card.share_count || 0) + 1 })
          .eq('id', cardId);

        // Award reputation to card creator
        if (card.seed_creator_id !== providerId) {
          await supabase.rpc('pulse_cards_award_reputation', {
            p_provider_id: card.seed_creator_id,
            p_action_type: 'card_shared',
            p_points: 2,
            p_reason: 'Your card was shared',
            p_reference_type: 'card',
            p_reference_id: cardId,
          });
        }
      }

      return cardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-cards'] });
      toast.success('Card shared!');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'share_pulse_card' });
    },
  });
}

// ===========================================
// Mutation: Archive card (soft delete)
// ===========================================

export function useArchiveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const userId = await getCurrentUserId();
      
      const { error } = await supabase
        .from('pulse_cards')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: userId,
          updated_by: userId,
        })
        .eq('id', cardId);

      if (error) throw new Error(error.message);
      return cardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-cards'] });
      toast.success('Card archived');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'archive_pulse_card' });
    },
  });
}
