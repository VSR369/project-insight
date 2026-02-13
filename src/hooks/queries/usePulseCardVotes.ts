/**
 * PulsePages - Voting Hooks
 * Layer voting operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { getVoteWeight } from '@/constants/pulseCards.constants';
import type { VoteType } from '@/constants/pulseCards.constants';

// ===========================================
// Types
// ===========================================

export interface PulseCardVote {
  id: string;
  layer_id: string;
  voter_id: string;
  vote_type: VoteType;
  vote_weight: number;
  created_at: string;
}

// ===========================================
// Query: Get user's vote for a layer
// ===========================================

export function useUserVote(layerId: string | undefined, voterId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-card-vote', layerId, voterId],
    queryFn: async () => {
      if (!layerId || !voterId) return null;

      const { data, error } = await supabase
        .from('pulse_card_votes')
        .select('id, layer_id, voter_id, vote_type, vote_weight, created_at')
        .eq('layer_id', layerId)
        .eq('voter_id', voterId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as PulseCardVote | null;
    },
    enabled: !!layerId && !!voterId,
  });
}

// ===========================================
// Query: Get all votes for a layer
// ===========================================

export function useLayerVotes(layerId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-card-layer-votes', layerId],
    queryFn: async () => {
      if (!layerId) return [];

      const { data, error } = await supabase
        .from('pulse_card_votes')
        .select('id, layer_id, voter_id, vote_type, vote_weight, created_at')
        .eq('layer_id', layerId);

      if (error) throw new Error(error.message);
      return data as PulseCardVote[];
    },
    enabled: !!layerId,
  });
}

// ===========================================
// Mutation: Cast or update vote
// ===========================================

interface CastVoteParams {
  layerId: string;
  voterId: string;
  voteType: VoteType;
  voterReputation: number;
  cardId: string; // For cache invalidation
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CastVoteParams) => {
      const voteWeight = getVoteWeight(params.voterReputation);

      // Check if vote exists
      const { data: existingVote } = await supabase
        .from('pulse_card_votes')
        .select('id, layer_id, voter_id, vote_type, vote_weight, created_at')
        .eq('layer_id', params.layerId)
        .eq('voter_id', params.voterId)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === params.voteType) {
          // Same vote type - remove vote (toggle off)
          const { error } = await supabase
            .from('pulse_card_votes')
            .delete()
            .eq('id', existingVote.id);

          if (error) throw new Error(error.message);
          return { action: 'removed', vote: null };
        } else {
          // Different vote type - update vote
          const { data, error } = await supabase
            .from('pulse_card_votes')
            .update({
              vote_type: params.voteType,
              vote_weight: voteWeight,
            })
            .eq('id', existingVote.id)
            .select()
            .single();

          if (error) throw new Error(error.message);
          return { action: 'updated', vote: data as PulseCardVote };
        }
      } else {
        // New vote
        const { data, error } = await supabase
          .from('pulse_card_votes')
          .insert({
            layer_id: params.layerId,
            voter_id: params.voterId,
            vote_type: params.voteType,
            vote_weight: voteWeight,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return { action: 'created', vote: data as PulseCardVote };
      }
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ['pulse-card-vote', params.layerId, params.voterId] });
      queryClient.invalidateQueries({ queryKey: ['pulse-card-layer-votes', params.layerId] });
      queryClient.invalidateQueries({ queryKey: ['pulse-card-layers', params.cardId] });

      if (result.action === 'removed') {
        toast.success('Vote removed');
      } else if (result.action === 'updated') {
        toast.success('Vote updated');
      } else {
        toast.success(params.voteType === 'up' ? 'Upvoted!' : 'Downvoted');
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cast_vote' });
    },
  });
}
