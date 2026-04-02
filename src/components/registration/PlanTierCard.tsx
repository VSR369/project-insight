/**
 * PlanTierCard — renders a single subscription tier card.
 * Extracted from PlanSelectionForm.tsx for decomposition.
 */

import { Check, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TIER_CONFIG, getEffectivePrice, getBasePrice, type PricingRow } from './planSelectionHelpers';

interface TierFeature {
  id: string;
  tier_id: string;
  feature_name: string;
  access_type: string;
  usage_limit: string | null;
}

interface BaseFeeRow {
  tier_id: string;
  engagement_model_id: string | null;
  currency_code: string;
  consulting_base_fee: number;
  management_base_fee: number;
  md_engagement_models?: { code: string } | null;
}

interface PlatformFeeRow {
  tier_id: string;
  engagement_model_id: string | null;
  currency_code: string;
  platform_fee_pct: number;
  md_engagement_models?: { code: string } | null;
}

interface SelectedCycle {
  id: string;
  name: string;
  discount_percentage: number;
}

export interface PlanTierCardProps {
  tier: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    max_challenges: number | null;
    max_users: number | null;
  };
  isSelected: boolean;
  onSelect: (tierId: string) => void;
  pricingArray: PricingRow[];
  cycleDiscount: number;
  subsidizedPct: number;
  currencySymbol: string;
  selectedCycle: SelectedCycle | undefined;
  features: TierFeature[];
  isInternalDept: boolean;
  baseFees: BaseFeeRow[];
  platformFees: PlatformFeeRow[];
  usingFallbackFees: boolean;
  membershipFeeDiscountPct: number;
}

export function PlanTierCard({
  tier, isSelected, onSelect, pricingArray, cycleDiscount, subsidizedPct,
  currencySymbol, selectedCycle, features, isInternalDept,
  baseFees, platformFees, usingFallbackFees, membershipFeeDiscountPct,
}: PlanTierCardProps) {
  const config = TIER_CONFIG[tier.code] ?? TIER_CONFIG.basic;
  const price = getEffectivePrice(tier.id, pricingArray, cycleDiscount, subsidizedPct);
  const basePrice = getBasePrice(tier.id, pricingArray);
  const hasAnyDiscount = (cycleDiscount > 0 || subsidizedPct > 0) && basePrice !== null && price !== null;

  const tierBaseFees = baseFees.filter(bf => bf.tier_id === tier.id);
  const tierPlatformFees = platformFees.filter(pf => pf.tier_id === tier.id);

  return (
    <div className={cn(
      'relative flex flex-col rounded-xl border-2 p-0 transition-all overflow-hidden',
      isSelected ? `${config.borderClass} shadow-lg ring-2 ring-primary/20` : 'border-border hover:shadow-md',
    )}>
      {config.popular && (
        <div className="bg-primary text-primary-foreground text-center text-xs font-semibold py-1.5">Most Popular</div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <Badge className={cn('w-fit mb-3 text-xs', config.badgeClass)}>{tier.name}</Badge>

        {/* Price */}
        <div className="mb-1">
          {price !== null ? (
            <>
              <span className="text-3xl font-bold text-foreground">{currencySymbol}{Math.round(price).toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </>
          ) : (
            <span className="text-xl font-bold text-muted-foreground">Contact us</span>
          )}
        </div>

        {/* Price Breakdown */}
        {hasAnyDiscount && (
          <div className="space-y-0.5 mb-2">
            <p className="text-xs text-muted-foreground line-through">{currencySymbol}{Math.round(basePrice!).toLocaleString()}/mo base</p>
            {cycleDiscount > 0 && selectedCycle && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">-{cycleDiscount}% {selectedCycle.name} billing</p>
            )}
            {subsidizedPct > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">-{subsidizedPct}% subsidized discount</p>}
            <p className="text-xs font-semibold text-foreground">= {currencySymbol}{Math.round(price!).toLocaleString()}/mo effective</p>
          </div>
        )}

        {/* Per-Challenge Fee Breakdown */}
        {!isInternalDept && tierBaseFees.length > 0 && (
          <PerChallengeFees
            tierBaseFees={tierBaseFees}
            tierPlatformFees={tierPlatformFees}
            currencySymbol={usingFallbackFees ? '$' : currencySymbol}
            fallbackLabel={usingFallbackFees ? ' (USD)' : ''}
            discountPct={membershipFeeDiscountPct}
          />
        )}

        {tier.description && <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>}
        <Separator className="mb-4" />

        {/* Features */}
        <div className="space-y-2.5 flex-1">
          {tier.max_challenges && (
            <div className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /><span className="text-foreground">Up to {tier.max_challenges} challenges/month</span></div>
          )}
          {tier.max_users && (
            <div className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /><span className="text-foreground">Up to {tier.max_users} users</span></div>
          )}
          {features.map((f) => (
            <div key={f.id} className="flex items-start gap-2 text-sm">
              {f.access_type === 'included' ? <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
              <span className={cn(f.access_type === 'included' ? 'text-foreground' : 'text-muted-foreground/60')}>
                {f.feature_name}{f.usage_limit ? ` (${f.usage_limit})` : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 mb-4" />

        <Button type="button" variant={isSelected ? 'default' : config.btnVariant} className={cn('w-full', !isSelected && config.btnClass)} onClick={() => onSelect(tier.id)}>
          {isSelected ? (<><Check className="h-4 w-4 mr-1" />Selected</>) : `Select ${tier.name}`}
        </Button>
      </div>
    </div>
  );
}

/* ─── Per-Challenge Fees Sub-component ─── */

function PerChallengeFees({
  tierBaseFees, tierPlatformFees, currencySymbol, fallbackLabel, discountPct,
}: {
  tierBaseFees: BaseFeeRow[];
  tierPlatformFees: PlatformFeeRow[];
  currencySymbol: string;
  fallbackLabel: string;
  discountPct: number;
}) {
  const marketplaceFee = tierBaseFees.find(bf => bf.md_engagement_models?.code === 'marketplace');
  const marketplacePlatform = tierPlatformFees.find(pf => pf.md_engagement_models?.code === 'marketplace');
  const aggregatorPlatform = tierPlatformFees.find(pf => pf.md_engagement_models?.code === 'aggregator');

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 mb-2">
      <p className="text-xs font-semibold text-foreground mb-2">Per-Challenge Fees{fallbackLabel}</p>
      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="w-full h-7 p-0.5">
          <TabsTrigger value="marketplace" className="flex-1 text-[11px] h-6 px-2">Marketplace</TabsTrigger>
          <TabsTrigger value="aggregator" className="flex-1 text-[11px] h-6 px-2">Aggregator</TabsTrigger>
        </TabsList>
        <TabsContent value="marketplace" className="mt-2 space-y-1">
          {marketplaceFee ? (() => {
            const total = marketplaceFee.consulting_base_fee + marketplaceFee.management_base_fee;
            const discounted = discountPct > 0 ? Math.round(total * (1 - discountPct / 100) * 100) / 100 : total;
            return (
              <>
                <div className="text-xs text-muted-foreground">
                  Consulting: {currencySymbol}{marketplaceFee.consulting_base_fee.toLocaleString()} + Mgmt: {currencySymbol}{marketplaceFee.management_base_fee.toLocaleString()}
                </div>
                <div className="flex items-baseline gap-1.5">
                  {discountPct > 0 ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through">{currencySymbol}{total.toLocaleString()}/challenge</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{currencySymbol}{discounted.toLocaleString()}/challenge</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{discountPct}% off</span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{currencySymbol}{total.toLocaleString()}/challenge</span>
                  )}
                </div>
                {marketplacePlatform && <p className="text-[11px] text-muted-foreground">+ {marketplacePlatform.platform_fee_pct}% platform fee on award</p>}
              </>
            );
          })() : <p className="text-xs text-muted-foreground">Not available</p>}
        </TabsContent>
        <TabsContent value="aggregator" className="mt-2 space-y-1">
          <p className="text-sm font-bold text-foreground">No per-challenge fees</p>
          <p className="text-[11px] text-muted-foreground">Platform-mediated — no consulting or management fees</p>
          {aggregatorPlatform && <p className="text-[11px] text-muted-foreground">+ {aggregatorPlatform.platform_fee_pct}% platform fee on award</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
