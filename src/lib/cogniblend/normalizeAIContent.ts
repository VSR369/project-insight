/**
 * normalizeAIContent — Pure normalizer functions for AI-generated content.
 * Extracted from useCurationAcceptRefinement.ts.
 * No hooks, no React dependencies — pure data transforms.
 */

import { toast } from 'sonner';
import type { RewardStructureDisplayHandle } from '@/components/cogniblend/curation/RewardStructureDisplay';

/** Strip markdown code fences from AI output */
export function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

/** Attempt to parse JSON, with repair for trailing commas */
export function parseJsonSafe(raw: string): any | null {
  try { return JSON.parse(raw); } catch {
    const repaired = raw.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
    try { return JSON.parse(repaired); } catch { return null; }
  }
}

/** Extract leading JSON from a string that may have trailing text */
export function extractJson(raw: string): string {
  let cleaned = raw;
  const jsonStartIndex = cleaned.search(/[\[{]/);
  if (jsonStartIndex > 0) cleaned = cleaned.substring(jsonStartIndex);
  const jsonEndBracket = cleaned.lastIndexOf(']');
  const jsonEndBrace = cleaned.lastIndexOf('}');
  const jsonEnd = Math.max(jsonEndBracket, jsonEndBrace);
  if (jsonEnd > 0 && jsonEnd < cleaned.length - 1) cleaned = cleaned.substring(0, jsonEnd + 1);
  return cleaned;
}

export function normalizeRewardStructure(
  dbField: string, value: any,
  rewardStructureRef: React.RefObject<RewardStructureDisplayHandle | null>,
): any | null {
  if (dbField !== 'reward_structure' || !value || typeof value !== 'object') return value;

  let v = value;
  if (Array.isArray(v)) {
    const tiers: Record<string, number> = {};
    const tierNames = ['platinum', 'gold', 'silver', 'honorable_mention'];
    (v as any[]).forEach((row: any, i: number) => {
      const key = (row.tier || row.prize_tier || row.tier_name || tierNames[i] || `tier_${i}`)
        .toLowerCase().replace(/\s+/g, '_');
      const rawAmount = row.amount ?? row.prize ?? row.value ?? 0;
      tiers[key] = typeof rawAmount === 'string'
        ? Number(rawAmount.replace(/[$,]/g, ''))
        : Number(rawAmount) || 0;
    });
    const currency = (v as any[])[0]?.currency || 'USD';
    v = { type: 'monetary', monetary: { tiers, currency } };
  }
  if (v?.monetary?.tiers && Array.isArray(v.monetary.tiers)) {
    const tierRecord: Record<string, number> = {};
    const defaultNames = ['platinum', 'gold', 'silver', 'honorable_mention'];
    (v.monetary.tiers as any[]).forEach((t: any, i: number) => {
      const name = (t.tier_name || t.name || t.tier || defaultNames[i] || `tier_${i}`)
        .toLowerCase().replace(/\s+/g, '_');
      const amount = typeof t.amount === 'string'
        ? Number(t.amount.replace(/[$,\s]/g, '')) || 0
        : Number(t.amount ?? t.prize ?? t.value ?? 0) || 0;
      tierRecord[name] = amount;
    });
    v = { ...v, monetary: { ...v.monetary, tiers: tierRecord } };
  }
  rewardStructureRef.current?.applyAIReviewResult(v);
  return null;
}

export function normalizeEvalCriteria(dbField: string, value: any): any {
  if (dbField !== 'evaluation_criteria' || !value || typeof value !== 'object') return value;
  const rawArr = Array.isArray(value) ? value : Array.isArray(value?.criteria) ? value.criteria : null;
  if (!rawArr) return value;
  return {
    criteria: rawArr.map((c: any) => ({
      criterion_name: c.criterion_name ?? c.name ?? c.criterion ?? c.parameter ?? c.title ?? '',
      weight_percentage: Number(c.weight_percentage ?? c.weight ?? c.percentage ?? c.weight_percent ?? 0),
      description: c.description ?? c.details ?? c.scoring_type ?? '',
      scoring_method: c.scoring_method ?? c.scoring_type ?? '',
      evaluator_role: c.evaluator_role ?? c.evaluator ?? '',
    })),
  };
}

export function normalizeSuccessMetrics(dbField: string, value: any): any {
  if (dbField !== 'success_metrics_kpis' || !value || typeof value !== 'object') return value;
  const rawArr = Array.isArray(value) ? value : (value?.items ?? null);
  if (!rawArr || !Array.isArray(rawArr)) return value;
  return rawArr.map((row: any) => ({
    kpi: row.kpi ?? row.metric ?? row.name ?? row.KPI ?? '',
    baseline: row.baseline ?? row.Baseline ?? '',
    target: row.target ?? row.Target ?? '',
    measurement_method: row.measurement_method ?? row.method ?? row.Method ?? '',
    timeframe: row.timeframe ?? row.Timeframe ?? row.timeline ?? '',
  }));
}

export function normalizeDataResources(dbField: string, value: any): any {
  if (dbField !== 'data_resources_provided' || !value || typeof value !== 'object') return value;
  const rawArr = Array.isArray(value) ? value : (value?.items ?? null);
  if (!rawArr || !Array.isArray(rawArr)) return value;
  return rawArr.map((row: any) => ({
    resource: row.resource ?? row.name ?? row.resource_name ?? '',
    type: row.type ?? row.data_type ?? row.resource_type ?? '',
    format: row.format ?? '',
    size: row.size ?? '',
    access_method: row.access_method ?? row.access ?? '',
    restrictions: row.restrictions ?? row.restriction ?? '',
  }));
}

export function normalizeDomainTags(dbField: string, value: any): any | null {
  if (dbField !== 'domain_tags' || !Array.isArray(value)) return value;
  const filtered = value.filter((t: any) => typeof t === 'string' && t.trim().length > 0);
  if (filtered.length === 0) {
    toast.error('AI suggested no valid domain tags. Please add tags manually.');
    return null;
  }
  return filtered;
}
