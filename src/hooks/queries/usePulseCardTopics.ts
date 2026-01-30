/**
 * PulsePages - Topic Hooks
 * Topic management for organizing cards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy } from '@/lib/auditFields';
import type { CreateTopicInput } from '@/lib/validations/pulseCard';

// ===========================================
// Types
// ===========================================

export interface PulseCardTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  industry_segment_id: string | null;
  display_order: number;
  is_active: boolean;
  card_count: number;
  created_at: string;
  updated_at: string | null;
  // Joined data
  industry_segment?: {
    id: string;
    name: string;
  } | null;
}

// ===========================================
// Query: Fetch all active topics (admin use)
// ===========================================

export function usePulseCardTopics(includeInactive: boolean = false) {
  return useQuery({
    queryKey: ['pulse-card-topics', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('pulse_card_topics')
        .select(`
          *,
          industry_segment:industry_segments(id, name)
        `)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data as PulseCardTopic[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - topics don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ===========================================
// Query: Fetch topics for provider's enrolled industries
// ===========================================

export function usePulseCardTopicsForProvider(industrySegmentIds: string[]) {
  return useQuery({
    queryKey: ['pulse-card-topics-for-provider', industrySegmentIds],
    queryFn: async () => {
      // Build filter for: General topics (NULL) OR matching industries
      let query = supabase
        .from('pulse_card_topics')
        .select(`
          *,
          industry_segment:industry_segments(id, name)
        `)
        .eq('is_active', true);

      // If provider has enrolled industries, filter to those + general
      // If no enrollments, show only general topics
      if (industrySegmentIds.length > 0) {
        // Filter: industry_segment_id IS NULL OR in enrolled list
        query = query.or(
          `industry_segment_id.is.null,industry_segment_id.in.(${industrySegmentIds.join(',')})`
        );
      } else {
        // No enrollments - only show general topics
        query = query.is('industry_segment_id', null);
      }

      query = query
        .order('industry_segment_id', { ascending: true, nullsFirst: true })
        .order('display_order', { ascending: true });

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data as PulseCardTopic[];
    },
    enabled: true, // Always enabled, even with empty array
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ===========================================
// Query: Fetch single topic by slug
// ===========================================

export function usePulseCardTopicBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['pulse-card-topic', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug required');

      const { data, error } = await supabase
        .from('pulse_card_topics')
        .select(`
          *,
          industry_segment:industry_segments(id, name)
        `)
        .eq('slug', slug)
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCardTopic;
    },
    enabled: !!slug,
  });
}

// ===========================================
// Mutation: Create topic (admin only)
// ===========================================

export function useCreatePulseCardTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTopicInput) => {
      const topicData = {
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        icon: input.icon || null,
        color: input.color || null,
        industry_segment_id: input.industry_segment_id || null,
        is_active: true,
        card_count: 0,
      };

      const topicWithAudit = await withCreatedBy(topicData);

      const { data, error } = await supabase
        .from('pulse_card_topics')
        .insert(topicWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCardTopic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-card-topics'] });
      queryClient.invalidateQueries({ queryKey: ['pulse-card-topics-for-provider'] });
      toast.success('Topic created successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_pulse_card_topic' });
    },
  });
}

// ===========================================
// Mutation: Update topic (admin only)
// ===========================================

export function useUpdatePulseCardTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateTopicInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('pulse_card_topics')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCardTopic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-card-topics'] });
      queryClient.invalidateQueries({ queryKey: ['pulse-card-topics-for-provider'] });
      toast.success('Topic updated');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_pulse_card_topic' });
    },
  });
}

// ===========================================
// Mutation: Deactivate topic (admin only)
// ===========================================

export function useDeactivatePulseCardTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pulse_card_topics')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-card-topics'] });
      queryClient.invalidateQueries({ queryKey: ['pulse-card-topics-for-provider'] });
      toast.success('Topic deactivated');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_pulse_card_topic' });
    },
  });
}
