/**
 * PulsePages - Moderation Hooks
 * Flagging, Trust Council, and moderation actions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/auditFields';
import { FLAG_TYPES, MODERATION_ACTIONS } from '@/constants/pulseCards.constants';
import type { FlagInput } from '@/lib/validations/pulseCard';

// ===========================================
// Types
// ===========================================

export interface PulseCardFlag {
  id: string;
  target_type: 'card' | 'layer';
  target_id: string;
  reporter_id: string;
  flag_type: keyof typeof FLAG_TYPES;
  description: string | null;
  status: 'pending' | 'upheld' | 'rejected';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_reason: string | null;
  created_at: string;
  // Joined data
  reporter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface TrustCouncilMember {
  id: string;
  provider_id: string;
  week_start: string;
  week_end: string;
  is_active: boolean;
  created_at: string;
  // Joined data
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ModerationAction {
  id: string;
  flag_id: string | null;
  target_type: 'card' | 'layer';
  target_id: string;
  action_type: keyof typeof MODERATION_ACTIONS;
  council_votes: Record<string, 'upheld' | 'rejected'>;
  outcome: 'upheld' | 'rejected';
  reasoning: string;
  created_at: string;
  created_by: string | null;
}

// ===========================================
// Query: Get pending flags (for council members)
// ===========================================

export function usePendingFlags() {
  return useQuery({
    queryKey: ['pulse-cards-pending-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_card_flags')
        .select(`
          *,
          reporter:solution_providers!reporter_id(id, first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data as PulseCardFlag[];
    },
  });
}

// ===========================================
// Query: Get flags by user (for profile/history)
// ===========================================

export function useUserFlags(providerId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-cards-user-flags', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID required');

      const { data, error } = await supabase
        .from('pulse_card_flags')
        .select('id, target_type, target_id, reporter_id, flag_type, description, status, resolved_at, resolved_by, resolution_reason, created_at')
        .eq('reporter_id', providerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return data as PulseCardFlag[];
    },
    enabled: !!providerId,
  });
}

// ===========================================
// Query: Get active Trust Council members
// ===========================================

export function useTrustCouncil() {
  return useQuery({
    queryKey: ['pulse-cards-trust-council'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('pulse_trust_council')
        .select(`
          *,
          provider:solution_providers!provider_id(id, first_name, last_name)
        `)
        .eq('is_active', true)
        .lte('week_start', today)
        .gte('week_end', today);

      if (error) throw new Error(error.message);
      return data as TrustCouncilMember[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ===========================================
// Query: Check if user is on Trust Council
// ===========================================

export function useIsCouncilMember(providerId: string | undefined) {
  const { data: council } = useTrustCouncil();
  
  const isCouncilMember = providerId && council
    ? council.some(m => m.provider_id === providerId && m.is_active)
    : false;

  return { isCouncilMember };
}

// ===========================================
// Query: Get recent moderation actions (transparency)
// ===========================================

export function useModerationActions(limit = 20) {
  return useQuery({
    queryKey: ['pulse-cards-moderation-actions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_moderation_actions')
        .select('id, flag_id, target_type, target_id, action_type, council_votes, outcome, reasoning, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return data as ModerationAction[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ===========================================
// Mutation: Create a flag report
// ===========================================

interface CreateFlagParams extends FlagInput {
  reporter_id: string;
}

export function useCreateFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateFlagParams) => {
      // Check for duplicate flag
      const { data: existingFlag } = await supabase
        .from('pulse_card_flags')
        .select('id')
        .eq('target_type', params.target_type)
        .eq('target_id', params.target_id)
        .eq('reporter_id', params.reporter_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingFlag) {
        throw new Error('You have already flagged this content');
      }

      const { data, error } = await supabase
        .from('pulse_card_flags')
        .insert({
          target_type: params.target_type,
          target_id: params.target_id,
          reporter_id: params.reporter_id,
          flag_type: params.flag_type,
          description: params.description || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCardFlag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-cards-pending-flags'] });
      toast.success('Report submitted. Thank you for helping keep the community safe.');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_flag' });
    },
  });
}

// ===========================================
// Mutation: Resolve a flag (council member action)
// ===========================================

interface ResolveFlagParams {
  flagId: string;
  outcome: 'upheld' | 'rejected';
  reasoning: string;
  actionType?: keyof typeof MODERATION_ACTIONS;
}

export function useResolveFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResolveFlagParams) => {
      const userId = await getCurrentUserId();

      // Get the flag
      const { data: flag, error: flagError } = await supabase
        .from('pulse_card_flags')
        .select('id, target_type, target_id, reporter_id, flag_type, description, status, resolved_at, resolved_by, resolution_reason, created_at')
        .eq('id', params.flagId)
        .single();

      if (flagError) throw new Error(flagError.message);

      // Update flag status
      const { error: updateError } = await supabase
        .from('pulse_card_flags')
        .update({
          status: params.outcome,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          resolution_reason: params.reasoning,
        })
        .eq('id', params.flagId);

      if (updateError) throw new Error(updateError.message);

      // Create moderation action record
      const { error: actionError } = await supabase
        .from('pulse_moderation_actions')
        .insert({
          flag_id: params.flagId,
          target_type: flag.target_type,
          target_id: flag.target_id,
          action_type: params.actionType || (params.outcome === 'upheld' ? 'warning' : 'no_action'),
          council_votes: {},
          outcome: params.outcome,
          reasoning: params.reasoning,
          created_by: userId,
        });

      if (actionError) throw new Error(actionError.message);

      // If upheld, update target status
      if (params.outcome === 'upheld') {
        const targetTable = flag.target_type === 'card' ? 'pulse_cards' : 'pulse_card_layers';
        await supabase
          .from(targetTable)
          .update({ status: 'flagged' })
          .eq('id', flag.target_id);

        // Award reputation to reporter
        await supabase.rpc('pulse_cards_award_reputation', {
          p_provider_id: flag.reporter_id,
          p_action_type: 'flag_upheld',
          p_points: 10,
          p_reason: 'Your flag was upheld',
          p_reference_type: 'flag',
          p_reference_id: params.flagId,
        });
      } else {
        // Deduct reputation from reporter for rejected flag
        await supabase.rpc('pulse_cards_award_reputation', {
          p_provider_id: flag.reporter_id,
          p_action_type: 'flag_rejected',
          p_points: -5,
          p_reason: 'Your flag was rejected',
          p_reference_type: 'flag',
          p_reference_id: params.flagId,
        });
      }

      return { flagId: params.flagId, outcome: params.outcome };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pulse-cards-pending-flags'] });
      queryClient.invalidateQueries({ queryKey: ['pulse-cards-moderation-actions'] });
      queryClient.invalidateQueries({ queryKey: ['pulse-cards'] });
      toast.success(`Flag ${result.outcome === 'upheld' ? 'upheld' : 'rejected'} successfully`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'resolve_flag' });
    },
  });
}

// ===========================================
// Mutation: Archive content (moderation action)
// ===========================================

interface ArchiveContentParams {
  targetType: 'card' | 'layer';
  targetId: string;
  reason: string;
}

export function useArchiveContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ArchiveContentParams) => {
      const userId = await getCurrentUserId();
      const targetTable = params.targetType === 'card' ? 'pulse_cards' : 'pulse_card_layers';

      // Get content creator for reputation penalty
      const { data: content } = await supabase
        .from(targetTable)
        .select(params.targetType === 'card' ? 'seed_creator_id' : 'creator_id')
        .eq('id', params.targetId)
        .single();

      // Archive the content
      const updateData = params.targetType === 'card'
        ? { status: 'archived', archived_at: new Date().toISOString(), archived_by: userId }
        : { status: 'archived', updated_by: userId };

      const { error } = await supabase
        .from(targetTable)
        .update(updateData)
        .eq('id', params.targetId);

      if (error) throw new Error(error.message);

      // Penalize creator reputation
      const creatorId = params.targetType === 'card' 
        ? (content as any)?.seed_creator_id 
        : (content as any)?.creator_id;

      if (creatorId) {
        await supabase.rpc('pulse_cards_award_reputation', {
          p_provider_id: creatorId,
          p_action_type: 'content_archived',
          p_points: -50,
          p_reason: `Content archived: ${params.reason}`,
          p_reference_type: params.targetType,
          p_reference_id: params.targetId,
        });
      }

      // Log moderation action
      await supabase
        .from('pulse_moderation_actions')
        .insert({
          flag_id: null,
          target_type: params.targetType,
          target_id: params.targetId,
          action_type: 'archive',
          council_votes: {},
          outcome: 'upheld',
          reasoning: params.reason,
          created_by: userId,
        });

      return params.targetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-cards'] });
      queryClient.invalidateQueries({ queryKey: ['pulse-cards-moderation-actions'] });
      toast.success('Content archived');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'archive_content' });
    },
  });
}
