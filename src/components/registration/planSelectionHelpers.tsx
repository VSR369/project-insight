/**
 * Plan Selection — visual config and pricing helpers.
 * Extracted from PlanSelectionForm.tsx for decomposition.
 */

import React from 'react';
import { Zap, Star, Sparkles, Crown } from 'lucide-react';

/* ─── Tier Visual Config ─────────────────────────────────── */

export interface TierVisualConfig {
  icon: React.ReactNode;
  borderClass: string;
  badgeClass: string;
  btnVariant: 'default' | 'outline';
  btnClass: string;
  popular?: boolean;
}

export const TIER_CONFIG: Record<string, TierVisualConfig> = {
  basic: {
    icon: <Zap className="h-5 w-5" />,
    borderClass: 'border-border',
    badgeClass: 'bg-muted text-muted-foreground',
    btnVariant: 'outline',
    btnClass: '',
  },
  standard: {
    icon: <Star className="h-5 w-5" />,
    borderClass: 'border-primary',
    badgeClass: 'bg-primary/10 text-primary',
    btnVariant: 'default',
    btnClass: '',
    popular: true,
  },
  premium: {
    icon: <Sparkles className="h-5 w-5" />,
    borderClass: 'border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    btnVariant: 'outline',
    btnClass: 'border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20',
  },
  enterprise: {
    icon: <Crown className="h-5 w-5" />,
    borderClass: 'border-violet-500',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    btnVariant: 'outline',
    btnClass: 'border-violet-500 text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20',
  },
};

/* ─── Pricing Helpers ────────────────────────────────────── */

export interface PricingRow {
  tier_id: string;
  local_price: number | null;
  monthly_price_usd: number | null;
  currency_code: string;
  [key: string]: unknown;
}

/**
 * Build pricing array with fallback to allTierPricing (USD) when country is missing.
 */
export function buildPricingArray(
  countryPricing: PricingRow[] | undefined,
  allTierPricing: PricingRow[] | undefined,
): PricingRow[] {
  const hasCountryPricing = Array.isArray(countryPricing) && countryPricing.length > 0;
  if (hasCountryPricing) return countryPricing!;
  if (!Array.isArray(allTierPricing) || allTierPricing.length === 0) return [];

  const byTier = new Map<string, PricingRow>();
  for (const row of allTierPricing) {
    const existing = byTier.get(row.tier_id);
    if (!existing || row.currency_code === 'USD') {
      byTier.set(row.tier_id, row);
    }
  }
  return Array.from(byTier.values()).map(row => ({
    ...row,
    local_price: row.monthly_price_usd,
    currency_code: 'USD',
  }));
}

/** Effective price after cycle & subsidized discounts. Returns null when no pricing row. */
export function getEffectivePrice(
  tierId: string,
  pricingArray: PricingRow[],
  cycleDiscount: number,
  subsidizedPct: number,
): number | null {
  const tp = pricingArray.find((p) => p.tier_id === tierId);
  if (!tp) return null;
  const base = tp.local_price ?? tp.monthly_price_usd ?? 0;
  let price = base * (1 - cycleDiscount / 100);
  if (subsidizedPct > 0) price = price * (1 - subsidizedPct / 100);
  return price;
}

/** Full base price before any discount. Returns null if no pricing row. */
export function getBasePrice(tierId: string, pricingArray: PricingRow[]): number | null {
  const tp = pricingArray.find((p) => p.tier_id === tierId);
  if (!tp) return null;
  return tp.local_price ?? tp.monthly_price_usd ?? 0;
}
