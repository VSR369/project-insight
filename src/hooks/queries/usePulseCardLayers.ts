/**
 * PulsePages - Card Layer Hooks
 * Layer operations for building on cards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/auditFields';
import { PULSE_CARDS_POLLING, CARD_LIMITS } from '@/constants/pulseCards.constants';
import type { CreateLayerInput } from '@/lib/validations/pulseCard';

// ===========================================
// Types
// ===========================================

export interface PulseCardLayer {
  id: string;
  card_id: string;
  creator_id: string;
  content_text: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  parent_layer_id: string | null;
  layer_order: number;
  votes_up: number;
  votes_down: number;
  vote_score: number;
  is_featured: boolean;
  featured_at: string | null;
  status: 'active' | 'flagged' | 'archived';
  created_at: string;
  updated_at: string | null;
  voting_ends_at: string | null;
  // Joined data
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// ===========================================
// Query: Fetch layers for a card
// ===========================================

export function usePulseCardLayers(cardId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-card-layers', cardId],
    queryFn: async () => {
      if (!cardId) throw new Error('Card ID required');

      const { data, error } = await supabase
        .from('pulse_card_layers')
        .select(`
          *,
          creator:solution_providers!creator_id(id, first_name, last_name)
        `)
        .eq('card_id', cardId)
        .eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('vote_score', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data as PulseCardLayer[];
    },
    enabled: !!cardId,
    refetchInterval: PULSE_CARDS_POLLING.DETAIL_MS,
  });
}

// ===========================================
// Query: Fetch featured layer for a card
// ===========================================

export function useFeaturedLayer(cardId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-card-featured-layer', cardId],
    queryFn: async () => {
      if (!cardId) throw new Error('Card ID required');

      const { data, error } = await supabase
        .from('pulse_card_layers')
        .select(`
          *,
          creator:solution_providers!creator_id(id, first_name, last_name)
        `)
        .eq('card_id', cardId)
        .eq('is_featured', true)
        .single();

      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      return data as PulseCardLayer | null;
    },
    enabled: !!cardId,
  });
}

// ===========================================
// Mutation: Create a new layer (build on card)
// ===========================================

interface CreateLayerParams extends CreateLayerInput {
  creator_id: string;
}

export function useCreatePulseCardLayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateLayerParams) => {
      const userId = await getCurrentUserId();

      // Get current highest layer order
      const { data: existingLayers } = await supabase
        .from('pulse_card_layers')
        .select('layer_order')
        .eq('card_id', params.card_id)
        .order('layer_order', { ascending: false })
        .limit(1);

      const nextOrder = existingLayers && existingLayers.length > 0 
        ? existingLayers[0].layer_order + 1 
        : 1;

      const layerData = {
        card_id: params.card_id,
        creator_id: params.creator_id,
        content_text: params.content_text,
        media_url: params.media_url || null,
        media_type: params.media_type || null,
        parent_layer_id: params.parent_layer_id || null,
        layer_order: nextOrder,
        is_featured: false,
        voting_ends_at: new Date(Date.now() + CARD_LIMITS.VOTING_WINDOW_HOURS * 60 * 60 * 1000).toISOString(),
        created_by: userId,
      };

      const { data, error } = await supabase
        .from('pulse_card_layers')
        .insert(layerData)
        .select(`
          *,
          creator:solution_providers!creator_id(id, first_name, last_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCardLayer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pulse-card-layers', data.card_id] });
      queryClient.invalidateQueries({ queryKey: ['pulse-cards'] });
      toast.success('Build added successfully!');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_pulse_card_layer' });
    },
  });
}

// ===========================================
// Mutation: Update featured layer (after voting)
// ===========================================

export function useUpdateFeaturedLayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, layerId }: { cardId: string; layerId: string }) => {
      const userId = await getCurrentUserId();

      // Unfeature current featured layer
      await supabase
        .from('pulse_card_layers')
        .update({ is_featured: false, updated_by: userId })
        .eq('card_id', cardId)
        .eq('is_featured', true);

      // Feature new layer
      const { error: layerError } = await supabase
        .from('pulse_card_layers')
        .update({
          is_featured: true,
          featured_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', layerId);

      if (layerError) throw new Error(layerError.message);

      // Update card's current featured layer
      const { error: cardError } = await supabase
        .from('pulse_cards')
        .update({
          current_featured_layer_id: layerId,
          updated_by: userId,
        })
        .eq('id', cardId);

      if (cardError) throw new Error(cardError.message);

      // Award reputation to layer creator
      const { data: layer } = await supabase
        .from('pulse_card_layers')
        .select('creator_id')
        .eq('id', layerId)
        .single();

      if (layer) {
        await supabase.rpc('pulse_cards_award_reputation', {
          p_provider_id: layer.creator_id,
          p_action_type: 'layer_pinned',
          p_points: 20,
          p_reason: 'Your layer was featured',
          p_reference_type: 'layer',
          p_reference_id: layerId,
        });
      }

      return { cardId, layerId };
    },
    onSuccess: ({ cardId }) => {
      queryClient.invalidateQueries({ queryKey: ['pulse-card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['pulse-card-layers', cardId] });
      toast.success('Featured layer updated!');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_featured_layer' });
    },
  });
}
