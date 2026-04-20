/**
 * lcLegalHelpers — Pure constants, types, and helpers for the LC workspace.
 * Trimmed for the unified Pass 3 workflow.
 */

export const IP_MODEL_LABELS: Record<string, string> = {
  'IP-EA': 'Exclusive Assignment — Full IP transfer to seeker',
  'IP-NEL': 'Non-Exclusive License — Solution Provider retains rights, seeker gets license',
  'IP-EL': 'Exclusive License — Seeker gets exclusive usage rights',
  'IP-JO': 'Joint Ownership — Shared IP between Solution Provider and seeker',
  'IP-NONE': 'No Transfer — Solution Provider retains all IP rights',
};

export interface AttachedDoc {
  id: string;
  document_type: string;
  tier: string;
  document_name: string | null;
  status: string | null;
  lc_status: string | null;
  lc_review_notes: string | null;
  attached_by: string | null;
  created_at: string;
  source_origin?: string | null;
  ai_review_status?: string | null;
}

export interface RewardTier {
  label?: string;
  name?: string;
  amount?: number;
  value?: number;
}

export interface RewardMilestone {
  name?: string;
  label?: string;
  trigger?: string;
  pct?: number;
  percentage?: number;
  percent?: number;
}

export interface ParsedReward {
  currency?: string;
  paymentMode?: string;
  numRewarded?: number;
  milestones?: RewardMilestone[];
  tiers?: RewardTier[];
  totalPool?: number;
}

export function renderJsonList(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return renderJsonList(obj.items);
    if (Array.isArray(obj.criteria)) return renderJsonList(obj.criteria);
    if (Array.isArray(obj.types)) return renderJsonList(obj.types);
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (Array.isArray(obj[k])) return renderJsonList(obj[k]);
    }
  }
  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return (
          (o.label as string) ??
          (o.name as string) ??
          (o.description as string) ??
          (o.title as string) ??
          (o.type as string) ??
          JSON.stringify(item)
        );
      }
      return String(item);
    });
  }
  if (typeof val === 'string') return [val];
  return [JSON.stringify(val)];
}

export interface EvalCriterion {
  name: string;
  weight: number;
  description?: string;
}

export function renderEvalCriteria(val: unknown): EvalCriterion[] {
  if (!val) return [];
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.criteria)) return renderEvalCriteria(obj.criteria);
    if (Array.isArray(obj.items)) return renderEvalCriteria(obj.items);
  }
  if (!Array.isArray(val)) return [];
  return val.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      name: (o.name as string) ?? (o.criterion as string) ?? '',
      weight: (o.weight as number) ?? (o.percentage as number) ?? 0,
      description: (o.description as string) ?? '',
    };
  });
}

export function parseRewardStructure(val: unknown): ParsedReward | null {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, unknown>;
  return {
    currency: (obj.currency ?? obj.currency_code) as string | undefined,
    paymentMode: (obj.payment_mode ?? obj.paymentMode) as string | undefined,
    numRewarded: (obj.num_rewarded ?? obj.numRewarded) as number | undefined,
    milestones: Array.isArray(obj.payment_milestones)
      ? (obj.payment_milestones as RewardMilestone[])
      : undefined,
    tiers: Array.isArray(obj.tiers) ? (obj.tiers as RewardTier[]) : undefined,
    totalPool: (obj.total_pool ?? obj.totalPool) as number | undefined,
  };
}
