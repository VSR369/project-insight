/**
 * useDiagnosticsData — Combined hook for the AI Diagnostics page.
 * Fetches attachments, context digest, and section importance levels.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import type { SectionKey } from '@/types/sections';

/* ── Attachment stats ── */

interface AttachmentStats {
  acceptedLinks: number;
  acceptedDocs: number;
  excludedLinks: number;
  excludedDocs: number;
  totalSources: number;
  summaryGenerated: number;
  fullTextExtracted: number;
  partialText: number;
  keyDataExtracted: number;
  noKeyData: number;
}

export interface DigestInfo {
  exists: boolean;
  sourceCount: number;
  curatorEdited: boolean;
  curatorEditedAt: string | null;
  rawContextBlock: string | null;
  generatedAt: string | null;
}

export interface DiagnosticsData {
  attachmentStats: AttachmentStats;
  digest: DigestInfo;
  importanceLevels: Partial<Record<SectionKey, string>>;
  isLoading: boolean;
  isError: boolean;
}

export function useDiagnosticsData(challengeId: string | undefined): DiagnosticsData {
  const attachmentsQuery = useQuery({
    queryKey: ['diagnostics-attachments', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('source_type, discovery_status, extraction_status, extracted_summary, extracted_key_data, extraction_quality')
        .eq('challenge_id', challengeId);
      if (error) { handleQueryError(error, { operation: 'fetch_diagnostic_attachments' }); throw error; }
      return data ?? [];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  const digestQuery = useQuery({
    queryKey: ['diagnostics-digest', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenge_context_digest')
        .select('source_count, curator_edited, curator_edited_at, raw_context_block, generated_at')
        .eq('challenge_id', challengeId)
        .maybeSingle();
      if (error) { handleQueryError(error, { operation: 'fetch_diagnostic_digest' }); throw error; }
      return data;
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  const configQuery = useQuery({
    queryKey: ['diagnostics-importance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_review_section_config')
        .select('section_key, importance_level')
        .eq('role_context', 'curation')
        .eq('is_active', true);
      if (error) { handleQueryError(error, { operation: 'fetch_diagnostic_config' }); throw error; }
      const map: Partial<Record<SectionKey, string>> = {};
      for (const row of data ?? []) {
        map[row.section_key as SectionKey] = row.importance_level;
      }
      return map;
    },
    staleTime: 15 * 60_000,
  });

  const rows = attachmentsQuery.data ?? [];
  const accepted = rows.filter(r => r.discovery_status === 'accepted');
  const excluded = rows.filter(r => r.discovery_status === 'rejected' || r.discovery_status === 'excluded');

  const stats: AttachmentStats = {
    acceptedLinks: accepted.filter(r => r.source_type === 'url').length,
    acceptedDocs: accepted.filter(r => r.source_type === 'file').length,
    excludedLinks: excluded.filter(r => r.source_type === 'url').length,
    excludedDocs: excluded.filter(r => r.source_type === 'file').length,
    totalSources: rows.length,
    summaryGenerated: rows.filter(r => !!r.extracted_summary).length,
    fullTextExtracted: rows.filter(r => r.extraction_status === 'completed').length,
    partialText: rows.filter(r => r.extraction_status === 'partial').length,
    keyDataExtracted: rows.filter(r => !!r.extracted_key_data).length,
    noKeyData: rows.filter(r => !r.extracted_key_data).length,
  };

  const d = digestQuery.data;
  const digest: DigestInfo = {
    exists: !!d,
    sourceCount: d?.source_count ?? 0,
    curatorEdited: d?.curator_edited ?? false,
    curatorEditedAt: d?.curator_edited_at ?? null,
    rawContextBlock: d?.raw_context_block ?? null,
    generatedAt: d?.generated_at ?? null,
  };

  return {
    attachmentStats: stats,
    digest,
    importanceLevels: configQuery.data ?? {},
    isLoading: attachmentsQuery.isLoading || digestQuery.isLoading || configQuery.isLoading,
    isError: attachmentsQuery.isError || digestQuery.isError || configQuery.isError,
  };
}
