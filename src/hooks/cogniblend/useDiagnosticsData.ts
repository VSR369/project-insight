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
  /** Sources filtered out before digest: pending/failed extraction */
  extractionNotReady: number;
  /** Sources filtered out before digest: low/seed quality */
  lowQualityFiltered: number;
  /** Sources with insufficient content (<200 chars text, <50 chars summary) */
  insufficientContent: number;
  /** Final count of sources usable for digest generation */
  usableForDigest: number;
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
  /** ai_review_level per section (principal / senior / standard) */
  reviewLevels: Partial<Record<SectionKey, string>>;
  isLoading: boolean;
  isError: boolean;
}

const MIN_TEXT_LENGTH = 200;
const MIN_SUMMARY_LENGTH = 50;

export function useDiagnosticsData(challengeId: string | undefined): DiagnosticsData {
  const attachmentsQuery = useQuery({
    queryKey: ['diagnostics-attachments', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('source_type, discovery_status, extraction_status, extracted_summary, extracted_key_data, extraction_quality, extracted_text')
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
        .select('section_key, importance_level, ai_review_level')
        .eq('role_context', 'curation')
        .eq('is_active', true);
      if (error) { handleQueryError(error, { operation: 'fetch_diagnostic_config' }); throw error; }
      const importanceMap: Partial<Record<SectionKey, string>> = {};
      const reviewLevelMap: Partial<Record<SectionKey, string>> = {};
      for (const row of data ?? []) {
        importanceMap[row.section_key as SectionKey] = row.importance_level;
        reviewLevelMap[row.section_key as SectionKey] = row.ai_review_level;
      }
      return { importanceMap, reviewLevelMap };
    },
    staleTime: 15 * 60_000,
  });

  const rows = attachmentsQuery.data ?? [];
  const accepted = rows.filter(r => r.discovery_status === 'accepted');
  const excluded = rows.filter(r => r.discovery_status === 'rejected' || r.discovery_status === 'excluded');

  // Filter breakdown matching edge function logic
  const extractionNotReady = accepted.filter(
    r => r.extraction_status !== 'completed' && r.extraction_status !== 'partial'
  ).length;

  const extractionReady = accepted.filter(
    r => r.extraction_status === 'completed' || r.extraction_status === 'partial'
  );

  const lowQualityFiltered = extractionReady.filter(
    r => r.extraction_quality === 'low' || r.extraction_quality === 'seed'
  ).length;

  const qualityPassed = extractionReady.filter(
    r => r.extraction_quality !== 'low' && r.extraction_quality !== 'seed'
  );

  const insufficientContent = qualityPassed.filter(r => {
    const textLen = (r.extracted_text ?? '').length;
    const summaryLen = (r.extracted_summary ?? '').length;
    return textLen < MIN_TEXT_LENGTH && summaryLen < MIN_SUMMARY_LENGTH;
  }).length;

  const usableForDigest = qualityPassed.length - insufficientContent;

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
    extractionNotReady,
    lowQualityFiltered,
    insufficientContent,
    usableForDigest,
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
    importanceLevels: configQuery.data?.importanceMap ?? {},
    reviewLevels: configQuery.data?.reviewLevelMap ?? {},
    isLoading: attachmentsQuery.isLoading || digestQuery.isLoading || configQuery.isLoading,
    isError: attachmentsQuery.isError || digestQuery.isError || configQuery.isError,
  };
}
