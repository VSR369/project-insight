/**
 * challengeContextAssembler — Builds a full challenge snapshot
 * for AI review calls. Reads from the Zustand store + challenge metadata.
 *
 * Computes todaysDate fresh on every call (never cached).
 */

import type { SectionKey } from '@/types/sections';
import type { RateCard } from '@/hooks/queries/useRateCards';
import { lookupRateCard } from '@/lib/lookupRateCard';
import { SECTION_FORMAT_CONFIG } from '@/lib/cogniblend/curationSectionFormats';

/* ── Solution type enum ── */

export type SolutionType = 'strategy_design' | 'process_operations' | 'technology_architecture' | 'product_innovation';

export const SOLUTION_TYPE_LABELS: Record<SolutionType, string> = {
  strategy_design: 'Future & Business Blueprint',
  process_operations: 'Business & Operational Excellence',
  technology_architecture: 'Digital & Technology Blueprint',
  product_innovation: 'Product & Service Innovation',
};

export const VALID_SOLUTION_TYPES: SolutionType[] = [
  'strategy_design',
  'process_operations',
  'technology_architecture',
  'product_innovation',
];

/* ── Challenge context interface ── */

export interface ChallengeContext {
  challengeId: string;
  challengeTitle: string;
  solutionType: SolutionType | null;
  seekerSegment: string | null;
  todaysDate: string;

  /** All section contents (key → serialized content or null) */
  sections: Partial<Record<SectionKey, string | null>>;

  /** Structured extracts */
  maturityLevel: string | null;
  complexityLevel: string | null;
  complexityDimensions: Record<string, number> | null;
  estimatedEffortHours: { min: number; max: number } | null;
  phases: { name: string; durationDays: number; startDate: string; endDate: string }[] | null;
  evaluationWeights: { criterion: string; weight: number }[] | null;
  totalPrizePool: number | null;
  prizeTiers: { tierName: string; percentage: number; amount: number }[] | null;

  /** Rate card for this challenge's segment × maturity */
  rateCard: {
    effortRateFloor: number;
    rewardFloorAmount: number;
    rewardCeiling: number | null;
    big4BenchmarkMultiplier: number;
    nonMonetaryWeight: number;
  } | null;

  /** Master data for validation */
  masterData: {
    validDomainTags: string[];
    validMaturityLevels: string[];
    validComplexityLevels: string[];
    validEligibilityTypes: string[];
    validIPModels: string[];
    validVisibilityOptions: string[];
  };
}

/* ── Section data extraction helpers ── */

function serializeSectionData(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === 'string') return data || null;
  if (Array.isArray(data)) return data.length > 0 ? JSON.stringify(data) : null;
  if (typeof data === 'object') return JSON.stringify(data);
  return String(data);
}

function extractPhases(sectionData: unknown): ChallengeContext['phases'] {
  if (!sectionData || typeof sectionData !== 'object') return null;
  const data = sectionData as Record<string, unknown>;
  const rows = (data.rows ?? data.phases) as any[] | undefined;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.map((r: any) => ({
    name: r.phase_name ?? r.name ?? '',
    durationDays: Number(r.duration_days ?? r.durationDays ?? 0),
    startDate: r.start_date ?? r.startDate ?? '',
    endDate: r.end_date ?? r.endDate ?? '',
  }));
}

function extractEvalWeights(sectionData: unknown): ChallengeContext['evaluationWeights'] {
  if (!sectionData || typeof sectionData !== 'object') return null;
  const data = sectionData as Record<string, unknown>;
  const rows = (data.rows ?? data.criteria) as any[] | undefined;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.map((r: any) => ({
    criterion: r.parameter ?? r.criterion ?? r.name ?? '',
    weight: Number(r.weight_percent ?? r.weight ?? 0),
  }));
}

function extractComplexity(sectionData: unknown): {
  level: string | null;
  dimensions: Record<string, number> | null;
  effortRange: { min: number; max: number } | null;
} {
  if (!sectionData || typeof sectionData !== 'object') {
    return { level: null, dimensions: null, effortRange: null };
  }
  const data = sectionData as Record<string, unknown>;
  const level = (data.level ?? data.complexity_level ?? null) as string | null;
  const params = data.parameters ?? data.params;
  let dimensions: Record<string, number> | null = null;
  if (params && typeof params === 'object') {
    dimensions = {};
    for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
      dimensions[k] = Number(v) || 0;
    }
  }
  const effortMin = Number(data.effort_min ?? data.effortMin ?? 0);
  const effortMax = Number(data.effort_max ?? data.effortMax ?? 0);
  const effortRange = (effortMin > 0 || effortMax > 0) ? { min: effortMin, max: effortMax } : null;
  return { level, dimensions, effortRange };
}

function extractRewardData(sectionData: unknown): {
  totalPool: number | null;
  tiers: ChallengeContext['prizeTiers'];
} {
  if (!sectionData || typeof sectionData !== 'object') {
    return { totalPool: null, tiers: null };
  }
  const data = sectionData as Record<string, unknown>;
  const totalPool = Number(data.totalPool ?? data.total_pool ?? 0) || null;
  const monetary = data.monetary as Record<string, unknown> | undefined;
  if (!monetary) return { totalPool, tiers: null };

  const tiers: NonNullable<ChallengeContext['prizeTiers']> = [];
  for (const [tierName, tierData] of Object.entries(monetary)) {
    if (tierData && typeof tierData === 'object') {
      const t = tierData as Record<string, unknown>;
      if (t.enabled !== false && Number(t.amount) > 0) {
        tiers.push({
          tierName,
          percentage: Number(t.percentage ?? 0),
          amount: Number(t.amount ?? 0),
        });
      }
    }
  }
  return { totalPool, tiers: tiers.length > 0 ? tiers : null };
}

/* ── Main assembler ── */

export interface BuildChallengeContextOptions {
  challengeId: string;
  challengeTitle: string;
  solutionType?: SolutionType | null;
  seekerSegment?: string | null;
  organizationTypeId?: string | null;
  maturityLevelFromChallenge?: string | null;

  /** All section data from the Zustand store */
  storeSections: Partial<Record<SectionKey, { data: unknown }>>;

  /** Rate cards for lookup */
  rateCards?: RateCard[];

  /** Master data arrays for validation */
  masterData?: Partial<ChallengeContext['masterData']>;
}

export function buildChallengeContext(opts: BuildChallengeContextOptions): ChallengeContext {
  const todaysDate = new Date().toISOString().split('T')[0];

  // Serialize all section content
  const sections: Partial<Record<SectionKey, string | null>> = {};
  const allKeys = Object.keys(SECTION_FORMAT_CONFIG) as SectionKey[];
  for (const key of allKeys) {
    const entry = opts.storeSections[key];
    sections[key] = entry ? serializeSectionData(entry.data) : null;
  }

  // Extract structured data
  const complexityEntry = opts.storeSections.complexity;
  const complexityData = extractComplexity(complexityEntry?.data);
  const phaseEntry = opts.storeSections.phase_schedule;
  const evalEntry = opts.storeSections.evaluation_criteria;
  const rewardEntry = opts.storeSections.reward_structure;
  const rewardData = extractRewardData(rewardEntry?.data);

  // Maturity level from store or challenge metadata
  const maturityFromStore = opts.storeSections.maturity_level?.data;
  const maturityLevel = (typeof maturityFromStore === 'string' ? maturityFromStore : null)
    ?? opts.maturityLevelFromChallenge ?? null;

  // Rate card lookup
  let rateCard: ChallengeContext['rateCard'] = null;
  if (opts.rateCards && opts.organizationTypeId && maturityLevel) {
    const found = lookupRateCard(opts.rateCards, opts.organizationTypeId, maturityLevel);
    if (found) {
      rateCard = {
        effortRateFloor: found.effort_rate_floor,
        rewardFloorAmount: found.reward_floor_amount,
        rewardCeiling: found.reward_ceiling,
        big4BenchmarkMultiplier: found.big4_benchmark_multiplier,
        nonMonetaryWeight: found.non_monetary_weight,
      };
    }
  }

  return {
    challengeId: opts.challengeId,
    challengeTitle: opts.challengeTitle,
    solutionType: opts.solutionType ?? null,
    seekerSegment: opts.seekerSegment ?? null,
    todaysDate,
    sections,
    maturityLevel,
    complexityLevel: complexityData.level,
    complexityDimensions: complexityData.dimensions,
    estimatedEffortHours: complexityData.effortRange,
    phases: extractPhases(phaseEntry?.data),
    evaluationWeights: extractEvalWeights(evalEntry?.data),
    totalPrizePool: rewardData.totalPool,
    prizeTiers: rewardData.tiers,
    rateCard,
    masterData: {
      validDomainTags: opts.masterData?.validDomainTags ?? [],
      validMaturityLevels: opts.masterData?.validMaturityLevels ?? ['BLUEPRINT', 'POC', 'PROTOTYPE', 'PILOT', 'PRODUCTION'],
      validComplexityLevels: opts.masterData?.validComplexityLevels ?? ['L1', 'L2', 'L3', 'L4', 'L5'],
      validEligibilityTypes: opts.masterData?.validEligibilityTypes ?? [],
      validIPModels: opts.masterData?.validIPModels ?? ['IP-EA', 'IP-NEL', 'IP-EL', 'IP-JO', 'IP-SR'],
      validVisibilityOptions: opts.masterData?.validVisibilityOptions ?? ['anonymous', 'named', 'verified'],
    },
  };
}
