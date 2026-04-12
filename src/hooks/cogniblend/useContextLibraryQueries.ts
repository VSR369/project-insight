/**
 * useContextLibraryQueries — Read-only query hooks for Context Library data.
 * Split from useContextLibrary.ts for R1 compliance.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD, CACHE_FREQUENT } from '@/config/queryCache';
import { CONTEXT_KEYS } from './contextLibraryKeys';

/* ── Types ── */

export interface ContextSource {
  id: string;
  challenge_id: string;
  section_key: string;
  source_type: string;
  source_url: string | null;
  display_name: string | null;
  file_name: string | null;
  url_title: string | null;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  extracted_text: string | null;
  extracted_summary: string | null;
  extracted_key_data: Record<string, unknown> | null;
  extraction_status: string | null;
  extraction_error: string | null;
  extraction_method?: string | null;
  shared_with_solver: boolean;
  discovery_source: string;
  discovery_status: string;
  resource_type: string | null;
  relevance_explanation: string | null;
  confidence_score: number | null;
  suggested_sections: string[] | null;
  access_status: string | null;
  created_at: string | null;
}

export interface ContextDigest {
  id: string;
  challenge_id: string;
  digest_text: string;
  key_facts: Record<string, unknown> | null;
  source_count: number;
  generated_at: string;
  curator_edited: boolean;
  curator_edited_at: string | null;
  original_digest_text: string | null;
}

/* ── Column lists ── */

const SOURCE_COLUMNS = 'id, challenge_id, section_key, source_type, source_url, display_name, file_name, url_title, description, mime_type, file_size, storage_path, extracted_text, extracted_summary, extracted_key_data, extraction_status, extraction_error, shared_with_solver, discovery_source, discovery_status, resource_type, relevance_explanation, confidence_score, suggested_sections, access_status, created_at';

const DIGEST_COLUMNS = 'id, challenge_id, digest_text, key_facts, source_count, generated_at, curator_edited, curator_edited_at, original_digest_text';

/* ── Queries ── */

export function useContextSources(challengeId: string | null) {
  return useQuery({
    queryKey: CONTEXT_KEYS.sources(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select(SOURCE_COLUMNS)
        .eq('challenge_id', challengeId)
        .in('discovery_status', ['accepted', 'suggested'])
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ContextSource[];
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

export function useContextDigest(challengeId: string | null) {
  return useQuery({
    queryKey: CONTEXT_KEYS.digest(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenge_context_digest')
        .select(DIGEST_COLUMNS)
        .eq('challenge_id', challengeId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as ContextDigest | null;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

export function useContextSourceCount(challengeId: string | null) {
  return useQuery({
    queryKey: CONTEXT_KEYS.sourceCount(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return 0;
      const { count, error } = await supabase
        .from('challenge_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('discovery_status', 'accepted');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

export function usePendingSuggestionCount(challengeId: string | null) {
  return useQuery({
    queryKey: CONTEXT_KEYS.pendingCount(challengeId ?? ''),
    queryFn: async () => {
      if (!challengeId) return 0;
      const { count, error } = await supabase
        .from('challenge_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('discovery_status', 'suggested');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

export function useIntakeStatus(challengeId: string | null) {
  return useQuery({
    queryKey: ['context-intake-status', challengeId ?? ''],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select('context_intake_status')
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return (data as Record<string, unknown>)?.context_intake_status as string | null;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}
