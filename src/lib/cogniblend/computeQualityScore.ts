/**
 * computeQualityScore — Aggregates curator edit records into quality metrics.
 *
 * Calculates accuracy/assist/rewrite rates, assigns grade A-D,
 * and upserts into curation_quality_metrics table.
 */

import { supabase } from '@/integrations/supabase/client';
import type { SectionEditRecord } from '@/hooks/cogniblend/useCuratorEditTracking';

export type QualityGrade = 'A' | 'B' | 'C' | 'D';

export interface QualityScoreResult {
  aiAccuracyPercent: number;
  aiAssistRatePercent: number;
  aiRewriteRatePercent: number;
  grade: QualityGrade;
  totalSectionsReviewed: number;
  sectionsAcceptedUnchanged: number;
  sectionsAcceptedWithEdits: number;
  sectionsRejectedRewritten: number;
  avgEditDistancePercent: number;
  avgTimeSpentSeconds: number;
}

export function computeQualityScore(records: SectionEditRecord[]): QualityScoreResult {
  const reviewed = records.filter((r) => r.curatorAction !== 'skipped');
  const total = reviewed.length;

  if (total === 0) {
    return {
      aiAccuracyPercent: 0,
      aiAssistRatePercent: 0,
      aiRewriteRatePercent: 0,
      grade: 'D',
      totalSectionsReviewed: 0,
      sectionsAcceptedUnchanged: 0,
      sectionsAcceptedWithEdits: 0,
      sectionsRejectedRewritten: 0,
      avgEditDistancePercent: 0,
      avgTimeSpentSeconds: 0,
    };
  }

  const unchanged = reviewed.filter((r) => r.curatorAction === 'accepted_unchanged').length;
  const withEdits = reviewed.filter((r) => r.curatorAction === 'accepted_with_edits').length;
  const rewritten = reviewed.filter((r) => r.curatorAction === 'rejected_rewritten').length;

  const accuracyPct = Math.round((unchanged / total) * 100);
  const assistPct = Math.round(((unchanged + withEdits) / total) * 100);
  const rewritePct = Math.round((rewritten / total) * 100);

  const avgEditDist = reviewed.reduce((s, r) => s + r.editDistancePercent, 0) / total;
  const avgTime = reviewed.reduce((s, r) => s + r.timeSpentSeconds, 0) / total;

  let grade: QualityGrade;
  if (assistPct >= 85) grade = 'A';
  else if (assistPct >= 70) grade = 'B';
  else if (assistPct >= 50) grade = 'C';
  else grade = 'D';

  return {
    aiAccuracyPercent: accuracyPct,
    aiAssistRatePercent: assistPct,
    aiRewriteRatePercent: rewritePct,
    grade,
    totalSectionsReviewed: total,
    sectionsAcceptedUnchanged: unchanged,
    sectionsAcceptedWithEdits: withEdits,
    sectionsRejectedRewritten: rewritten,
    avgEditDistancePercent: Math.round(avgEditDist * 100) / 100,
    avgTimeSpentSeconds: Math.round(avgTime * 100) / 100,
  };
}

/**
 * Persist quality score to curation_quality_metrics (upsert by challenge_id).
 */
export async function persistQualityScore(
  challengeId: string,
  result: QualityScoreResult,
  metadata?: {
    governanceMode?: string;
    maturityLevel?: string;
    domainTags?: string[];
    sectionBreakdown?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from('curation_quality_metrics' as any).upsert(
    {
      challenge_id: challengeId,
      ai_accuracy_percent: result.aiAccuracyPercent,
      ai_assist_rate_percent: result.aiAssistRatePercent,
      ai_rewrite_rate_percent: result.aiRewriteRatePercent,
      grade: result.grade,
      total_sections_reviewed: result.totalSectionsReviewed,
      sections_accepted_unchanged: result.sectionsAcceptedUnchanged,
      sections_accepted_with_edits: result.sectionsAcceptedWithEdits,
      sections_rejected_rewritten: result.sectionsRejectedRewritten,
      avg_edit_distance_percent: result.avgEditDistancePercent,
      avg_time_spent_seconds: result.avgTimeSpentSeconds,
      governance_mode: metadata?.governanceMode ?? null,
      maturity_level: metadata?.maturityLevel ?? null,
      domain_tags: metadata?.domainTags ?? [],
      section_breakdown: metadata?.sectionBreakdown ?? {},
      computed_at: new Date().toISOString(),
    } as any,
    { onConflict: 'challenge_id' },
  );

  if (error) {
    console.warn('[computeQualityScore] Failed to persist:', error.message);
  }
}
