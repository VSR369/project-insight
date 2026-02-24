/**
 * Plan Selection Form (REG-004)
 * 
 * Step 4: Tier comparison, pricing, billing cycle, engagement model.
 * Business Rules: BR-REG-011, BR-REG-013, BR-REG-014, BR-REG-015
 * 
 * Fixes applied:
 * Fix 2: Dynamic currency symbol from localeInfo
 * Fix 3: 3-option billing cycle selector (segmented buttons)
 * Fix 4: Sync billing cycle ID with selectedCycleId
 * Fix 5: Refactored getEffectivePrice using DB discount_percentage
 * Fix 6: Stacked price breakdown on tier cards
 * Fix 7: Dynamic membership discount note
 * Fix 8: Enterprise card text updates
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Star, Crown, Zap, MessageSquare, Lightbulb, ArrowLeft, ArrowRight, Loader2, Sparkles, Building,
} from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  useSubscriptionTiers,
  useTierFeatures,
  useTierPricingForCountry,
  useAllTierPricing,
  useBillingCycles,
  useEngagementModels,
  useTierEngagementAccess,
  useShadowPricing,
  useSubmitEnterpriseContact,
} from '@/hooks/queries/usePlanSelectionData';
import { useMembershipTiers } from '@/hooks/queries/useMembershipTiers';
import { calculateMembershipDiscount } from '@/services/membershipService';
import {
  planSelectionSchema,
  type PlanSelectionFormValues,
} from '@/lib/validations/planSelection';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MembershipTierSelector } from './MembershipTierSelector';

// Tier visual config
const TIER_CONFIG: Record<string, {
  icon: React.ReactNode;
  borderClass: string;
  badgeClass: string;
  btnVariant: 'default' | 'outline';
  btnClass: string;
  popular?: boolean;
}> = {
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

export function PlanSelectionForm() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    () => ''
  );

  // ══════════════════════════════════════
  // SECTION 2: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep4Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 3: Form hook
  // ══════════════════════════════════════
  const form = useForm<PlanSelectionFormValues>({
    resolver: zodResolver(planSelectionSchema),
    defaultValues: {
      tier_id: state.step4?.tier_id ?? '',
      billing_cycle_id: state.step4?.billing_cycle_id ?? '',
      engagement_model_id: state.step4?.engagement_model_id ?? '',
      membership_tier_id: state.step4?.membership_tier_id ?? '',
    },
  });

  const watchedTierId = form.watch('tier_id');
  const watchedMembershipTierId = form.watch('membership_tier_id');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { data: tierFeatures } = useTierFeatures();
  const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
  const { data: allTierPricing } = useAllTierPricing();
  const { data: billingCycles } = useBillingCycles();
  const { data: engagementModels } = useEngagementModels();
  const { data: tierEngagement } = useTierEngagementAccess();
  const { data: shadowPricing } = useShadowPricing();
  const { data: membershipTiers } = useMembershipTiers();
  const submitEnterprise = useSubmitEnterpriseContact();

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  // Initialize selectedCycleId from saved state or default to monthly
  useEffect(() => {
    if (!billingCycles || billingCycles.length === 0) return;

    // If we have saved step4 data, use that cycle
    if (state.step4?.billing_cycle_id) {
      const saved = billingCycles.find(c => c.id === state.step4!.billing_cycle_id);
      if (saved) {
        setSelectedCycleId(saved.id);
        return;
      }
    }

    // Default to monthly
    const monthly = billingCycles.find(c => c.code === 'monthly' || c.months === 1);
    if (monthly) {
      setSelectedCycleId(monthly.id);
      form.setValue('billing_cycle_id', monthly.id);
    }
  }, [billingCycles, state.step4?.billing_cycle_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════
  // SECTION 6: Derived values
  // ══════════════════════════════════════
  const selectedTier = tiers?.find((t) => t.id === watchedTierId);
  const isEnterpriseTier = selectedTier?.is_enterprise ?? false;
  const isBasicTier = selectedTier?.code === 'basic';
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;
  const subsidizedPct = state.orgTypeFlags?.subsidized_discount_pct ?? 0;

  // Fix 2: Dynamic currency symbol — fallback to USD when no country
  const hasCountryPricing = Array.isArray(pricing) && pricing.length > 0;
  const currencySymbol = hasCountryPricing
    ? (state.localeInfo?.currency_symbol || '$')
    : '$';

  // Fix A: Build pricingArray with fallback to allTierPricing (USD) when country is missing
  const pricingArray = (() => {
    if (hasCountryPricing) return pricing!;
    if (!Array.isArray(allTierPricing) || allTierPricing.length === 0) return [];
    // Deduplicate by tier_id, prefer USD rows
    const byTier = new Map<string, typeof allTierPricing[number]>();
    for (const row of allTierPricing) {
      const existing = byTier.get(row.tier_id);
      if (!existing || row.currency_code === 'USD') {
        byTier.set(row.tier_id, row);
      }
    }
    // Map to same shape using monthly_price_usd as local_price
    return Array.from(byTier.values()).map(row => ({
      ...row,
      local_price: row.monthly_price_usd,
      currency_code: 'USD',
    }));
  })();

  // Selected billing cycle and its discount
  const selectedCycle = billingCycles?.find(c => c.id === selectedCycleId);
  const cycleDiscount = selectedCycle?.discount_percentage ?? 0;

  // Fix 7: Membership discount computation
  const selectedMembershipTier = membershipTiers?.find(m => m.id === watchedMembershipTierId);
  const membershipResult = calculateMembershipDiscount(
    selectedMembershipTier?.code ?? null,
    isInternalDept,
  );

  /** Fix 5: Returns null when no pricing row exists (e.g. Enterprise). */
  const getEffectivePrice = (tierId: string): number | null => {
    const tp = pricingArray.find((p) => p.tier_id === tierId);
    if (!tp) return null;
    const base = tp.local_price ?? tp.monthly_price_usd ?? 0;
    // Apply billing cycle discount first, then subsidized discount
    let price = base * (1 - cycleDiscount / 100);
    if (subsidizedPct > 0) price = price * (1 - subsidizedPct / 100);
    return price;
  };

  /** Full base price before any discount. Returns null if no pricing row. */
  const getBasePrice = (tierId: string): number | null => {
    const tp = pricingArray.find((p) => p.tier_id === tierId);
    if (!tp) return null;
    return tp.local_price ?? tp.monthly_price_usd ?? 0;
  };

  // Engagement models available for this tier
  const availableEngagementModels = tierEngagement
    ?.filter((te) => te.tier_id === watchedTierId && te.access_type === 'included')
    .map((te) => engagementModels?.find((em) => em.id === te.engagement_model_id))
    .filter(Boolean) ?? [];

  // Group features by tier
  const getFeaturesForTier = (tierId: string) =>
    tierFeatures?.filter((f) => f.tier_id === tierId) ?? [];

  // Shadow pricing for internal departments
  const tierShadow = shadowPricing?.find((sp) => sp.tier_id === watchedTierId);

  // ══════════════════════════════════════
  // SECTION 7: Event handlers
  // ══════════════════════════════════════

  // Fix 4: Cycle change handler syncs state + form
  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    form.setValue('billing_cycle_id', cycleId, { shouldDirty: true });
  };

  // Fix 4: handleSelectTier uses selectedCycleId
  const handleSelectTier = (tierId: string) => {
    form.setValue('tier_id', tierId);
    if (selectedCycleId) {
      form.setValue('billing_cycle_id', selectedCycleId);
    }
  };

  const handleEnterpriseContact = async () => {
    if (!state.organizationId || !state.tenantId || !state.step2) return;

    try {
      await submitEnterprise.mutateAsync({
        organization_id: state.organizationId,
        tenant_id: state.tenantId,
        contact_name: state.step2.full_name,
        contact_email: state.step2.email,
        contact_phone: state.step2.phone,
        company_size: state.step1?.company_size_range,
        message: 'Enterprise tier inquiry from registration wizard',
      });
    } catch {
      // Error handled by mutation's onError callback
    }
  };

  const handleSubmit = async (data: PlanSelectionFormValues) => {
    if (isEnterpriseTier) {
      toast.info('Our enterprise team will contact you shortly.');
      return;
    }

    try {
      setStep4Data({
        tier_id: data.tier_id,
        billing_cycle_id: data.billing_cycle_id,
        engagement_model_id: data.engagement_model_id || undefined,
        membership_tier_id: data.membership_tier_id || undefined,
        estimated_challenges_per_month: 0,
      });

      setStep(5);
      navigate('/registration/billing');
    } catch {
      // Error handled by mutation's onError callback
    }
  };

  const isReturning = !!state.organizationId && !!state.step4;
  const { isDirty } = form.formState;
  const showContinueOnly = isReturning && !isDirty;

  const handleContinueOnly = () => {
    setStep(5);
    navigate('/registration/billing');
  };

  // ══════════════════════════════════════
  // SECTION 8: Conditional return (loading) — AFTER all hooks
  // ══════════════════════════════════════
  if (tiersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const nonEnterpriseTiers = tiers?.filter((t) => !t.is_enterprise) ?? [];
  const enterpriseTier = tiers?.find((t) => t.is_enterprise);

  // ══════════════════════════════════════
  // SECTION 9: Render
  // ══════════════════════════════════════
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Org Context Banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm">
          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium">
            Registering: {state.step1?.legal_entity_name || 'Your Organization'}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            Currency: {state.localeInfo?.currency_code || 'USD'}
          </span>
        </div>

        {/* Engagement Models Info Banner */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-sm">
                    Understanding Engagement Models & Tier Rules
                  </h3>
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">NEW</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Each tier provides access to different engagement models. The Marketplace model connects you with
                  vetted solution providers, while the Aggregator model provides curated expert panels.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Marketplace Model</Badge>
                  <Badge variant="outline" className="text-xs">Aggregator Model</Badge>
                  <Badge variant="outline" className="text-xs">Tier Comparison</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Page Header with Billing Cycle Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Choose Your Plan</h2>
            <p className="text-sm text-muted-foreground">
              Select the subscription tier that best fits your organization's needs.
            </p>
          </div>

          {/* Fix 3: Segmented Billing Cycle Selector */}
          {billingCycles && billingCycles.length > 0 && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              {billingCycles.map((cycle) => {
                const isActive = selectedCycleId === cycle.id;
                return (
                  <button
                    key={cycle.id}
                    type="button"
                    onClick={() => handleCycleChange(cycle.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {cycle.name}
                    {cycle.discount_percentage > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0">
                        -{cycle.discount_percentage}%
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hidden form fields for validation */}
        <FormField
          control={form.control}
          name="tier_id"
          render={() => (
            <FormItem className="hidden">
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billing_cycle_id"
          render={() => (
            <FormItem className="hidden">
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Membership Tier Selection — shown before tier cards so users see benefits first */}
        {!isInternalDept && membershipTiers && membershipTiers.length > 0 && (
          <MembershipTierSelector
            tiers={membershipTiers}
            selectedTierId={form.watch('membership_tier_id') || undefined}
            onSelect={(id) => form.setValue('membership_tier_id', id ?? '', { shouldDirty: true })}
            currencySymbol={currencySymbol}
          />
        )}

        {/* Tier Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {nonEnterpriseTiers.map((tier) => {
            const config = TIER_CONFIG[tier.code] ?? TIER_CONFIG.basic;
            const price = getEffectivePrice(tier.id);
            const basePrice = getBasePrice(tier.id);
            const features = getFeaturesForTier(tier.id);
            const isSelected = watchedTierId === tier.id;
            const hasAnyDiscount = (cycleDiscount > 0 || subsidizedPct > 0) && basePrice !== null && price !== null;

            return (
              <div
                key={tier.id}
                className={cn(
                  'relative flex flex-col rounded-xl border-2 p-0 transition-all overflow-hidden',
                  isSelected
                    ? `${config.borderClass} shadow-lg ring-2 ring-primary/20`
                    : 'border-border hover:shadow-md',
                )}
              >
                {/* Popular badge */}
                {config.popular && (
                  <div className="bg-primary text-primary-foreground text-center text-xs font-semibold py-1.5">
                    Most Popular
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  {/* Tier badge */}
                  <Badge className={cn('w-fit mb-3 text-xs', config.badgeClass)}>
                    {tier.name}
                  </Badge>

                  {/* Fix 2 + Fix 6: Price with dynamic symbol and breakdown */}
                  <div className="mb-1">
                    {price !== null ? (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          {currencySymbol}{Math.round(price).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">Contact us</span>
                    )}
                  </div>

                  {/* Fix 6: Stacked Price Breakdown */}
                  {hasAnyDiscount && (
                    <div className="space-y-0.5 mb-2">
                      <p className="text-xs text-muted-foreground line-through">
                        {currencySymbol}{Math.round(basePrice!).toLocaleString()}/mo base
                      </p>
                      {cycleDiscount > 0 && selectedCycle && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          -{cycleDiscount}% {selectedCycle.name} billing
                        </p>
                      )}
                      {subsidizedPct > 0 && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          -{subsidizedPct}% subsidized discount
                        </p>
                      )}
                      <p className="text-xs font-semibold text-foreground">
                        = {currencySymbol}{Math.round(price!).toLocaleString()}/mo effective
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {tier.description && (
                    <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  )}

                  <Separator className="mb-4" />

                  {/* Features list */}
                  <div className="space-y-2.5 flex-1">
                    {tier.max_challenges && (
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">Up to {tier.max_challenges} challenges/month</span>
                      </div>
                    )}
                    {tier.max_users && (
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">Up to {tier.max_users} users</span>
                      </div>
                    )}
                    {features.map((f) => (
                      <div key={f.id} className="flex items-start gap-2 text-sm">
                        {f.access_type === 'included' ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                        <span className={cn(
                          f.access_type === 'included' ? 'text-foreground' : 'text-muted-foreground/60',
                        )}>
                          {f.feature_name}
                          {f.usage_limit ? ` (${f.usage_limit})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Fix 7: Dynamic membership discount note */}
                  <p className="text-xs text-muted-foreground mt-4 mb-4">
                    + per-challenge fees apply
                    {membershipResult.isEligible && membershipResult.feeDiscountPct > 0 && selectedMembershipTier && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {' '}({membershipResult.feeDiscountPct}% off with {selectedMembershipTier.name} Membership)
                      </span>
                    )}
                  </p>

                  {/* CTA Button */}
                  <Button
                    type="button"
                    variant={isSelected ? 'default' : config.btnVariant}
                    className={cn('w-full', !isSelected && config.btnClass)}
                    onClick={() => handleSelectTier(tier.id)}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Selected
                      </>
                    ) : (
                      `Select ${tier.name}`
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Fix 8: Enterprise Card — inline in same grid */}
          {enterpriseTier && (() => {
            const config = TIER_CONFIG.enterprise;
            const isSelected = watchedTierId === enterpriseTier.id;

            return (
              <div
                className={cn(
                  'relative flex flex-col rounded-xl border-2 p-0 transition-all overflow-hidden',
                  isSelected
                    ? `${config.borderClass} shadow-lg ring-2 ring-violet-500/20`
                    : 'border-border hover:shadow-md border-dashed',
                )}
              >
                <div className="p-5 flex flex-col flex-1">
                  <Badge className={cn('w-fit mb-3 text-xs', config.badgeClass)}>
                    {enterpriseTier.name}
                  </Badge>

                  {/* Fix 8: Enterprise pricing text */}
                  <div className="mb-1">
                    <span className="text-2xl font-bold text-foreground">Custom Pricing</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Negotiated per Enterprise Agreement
                  </p>

                  {enterpriseTier.description && (
                    <p className="text-sm text-muted-foreground mb-4">{enterpriseTier.description}</p>
                  )}

                  <Separator className="mb-4" />

                  <div className="space-y-2.5 flex-1">
                    {[
                      'Unlimited challenges & users',
                      'Dedicated account manager',
                      'Custom SLA & onboarding',
                      'SSO & advanced security',
                      'White-label reports',
                      'Full API access & webhooks',
                    ].map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fix 8: Updated footer text */}
                  <p className="text-xs text-muted-foreground mt-4 mb-4">
                    Custom contract — pricing negotiated per agreement
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className={cn('w-full', config.btnClass)}
                    onClick={handleEnterpriseContact}
                    disabled={submitEnterprise.isPending}
                  >
                    {submitEnterprise.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Contact Sales
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Engagement Model (Basic tier only) */}
        {isBasicTier && availableEngagementModels.length > 0 && (
          <FormField
            control={form.control}
            name="engagement_model_id"
            render={({ field }) => (
              <FormItem>
                <label className="text-sm font-medium text-foreground">Engagement Model</label>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select engagement model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableEngagementModels.map((model) => (
                      <SelectItem key={model!.id} value={model!.id}>
                        {model!.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Membership section moved above tier cards */}

        {/* Shadow billing note for internal depts */}
        {isInternalDept && watchedTierId && tierShadow && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Internal department: No actual billing. Shadow charge of {tierShadow.currency_code}{' '}
              {tierShadow.shadow_charge_per_challenge}/challenge for tracking purposes.
            </p>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/registration/compliance')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden lg:inline">Step 4 of 5</span>
            {showContinueOnly ? (
              <Button type="button" onClick={handleContinueOnly}>
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={!watchedTierId || isEnterpriseTier}>
                Save & Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
