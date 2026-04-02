/**
 * Plan Selection Form (REG-004)
 * 
 * Step 4: Tier comparison, pricing, billing cycle, engagement model.
 * Orchestrates PlanTierCard, PlanEnterpriseCard, and pricing helpers.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building, Lightbulb } from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  useSubscriptionTiers, useTierFeatures, useTierPricingForCountry,
  useAllTierPricing, useBillingCycles, useEngagementModels,
  useTierEngagementAccess, useResolvedShadowPricing,
  useSubmitEnterpriseContact, useBaseFeesByCountry,
  usePlatformFeesByCountry, useAllBaseFees, useAllPlatformFees,
} from '@/hooks/queries/usePlanSelectionData';
import { useMembershipTiers } from '@/hooks/queries/useMembershipTiers';
import { calculateMembershipDiscount } from '@/services/membershipService';
import { planSelectionSchema, type PlanSelectionFormValues } from '@/lib/validations/planSelection';

import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MembershipTierSelector } from './MembershipTierSelector';
import { PlanTierCard } from './PlanTierCard';
import { PlanEnterpriseCard } from './PlanEnterpriseCard';
import { buildPricingArray } from './planSelectionHelpers';

export function PlanSelectionForm() {
  // ══ State ══
  const [selectedCycleId, setSelectedCycleId] = useState('');

  // ══ Context / Navigation ══
  const { state, setStep4Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══ Form ══
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

  // ══ Queries ══
  const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { data: tierFeatures } = useTierFeatures();
  const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
  const { data: allTierPricing } = useAllTierPricing();
  const { data: billingCycles } = useBillingCycles();
  const { data: engagementModels } = useEngagementModels();
  const { data: tierEngagement } = useTierEngagementAccess();
  const { data: shadowPricing } = useResolvedShadowPricing(state.organizationId);
  const { data: membershipTiers } = useMembershipTiers();
  const { data: baseFeesByCountry } = useBaseFeesByCountry(state.step1?.hq_country_id);
  const { data: platformFeesByCountry } = usePlatformFeesByCountry(state.step1?.hq_country_id);
  const { data: allBaseFees } = useAllBaseFees();
  const { data: allPlatformFees } = useAllPlatformFees();
  const submitEnterprise = useSubmitEnterpriseContact();

  // ══ Effects ══
  useEffect(() => {
    if (!billingCycles || billingCycles.length === 0) return;
    if (state.step4?.billing_cycle_id) {
      const saved = billingCycles.find(c => c.id === state.step4!.billing_cycle_id);
      if (saved) { setSelectedCycleId(saved.id); return; }
    }
    const monthly = billingCycles.find(c => c.code === 'monthly' || c.months === 1);
    if (monthly) { setSelectedCycleId(monthly.id); form.setValue('billing_cycle_id', monthly.id); }
  }, [billingCycles, state.step4?.billing_cycle_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══ Derived ══
  const selectedTier = tiers?.find((t) => t.id === watchedTierId);
  const isEnterpriseTier = selectedTier?.is_enterprise ?? false;
  const isBasicTier = selectedTier?.code === 'basic';
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;
  const subsidizedPct = state.orgTypeFlags?.subsidized_discount_pct ?? 0;

  const hasCountryPricing = Array.isArray(pricing) && pricing.length > 0;
  const currencySymbol = hasCountryPricing ? (state.localeInfo?.currency_symbol || '$') : '$';
  const pricingArray = buildPricingArray(pricing as any, allTierPricing as any);

  const selectedCycle = billingCycles?.find(c => c.id === selectedCycleId);
  const cycleDiscount = selectedCycle?.discount_percentage ?? 0;

  const selectedMembershipTier = membershipTiers?.find(m => m.id === watchedMembershipTierId);
  const membershipResult = calculateMembershipDiscount(selectedMembershipTier?.code ?? null, isInternalDept);

  const availableEngagementModels = tierEngagement
    ?.filter((te) => te.tier_id === watchedTierId && te.access_type === 'included')
    .map((te) => engagementModels?.find((em) => em.id === te.engagement_model_id))
    .filter(Boolean) ?? [];

  const getFeaturesForTier = (tierId: string) => tierFeatures?.filter((f) => f.tier_id === tierId) ?? [];
  const tierShadow = shadowPricing?.find((sp) => sp.tier_id === watchedTierId);

  // Fee sources with dedup
  const hasCountryBaseFees = Array.isArray(baseFeesByCountry) && baseFeesByCountry.length > 0;
  const hasCountryPlatformFees = Array.isArray(platformFeesByCountry) && platformFeesByCountry.length > 0;
  const baseFeeSource = hasCountryBaseFees ? baseFeesByCountry! : (allBaseFees ?? []);
  const platformFeeSource = hasCountryPlatformFees ? platformFeesByCountry! : (allPlatformFees ?? []);
  const usingFallbackFees = !hasCountryBaseFees;

  // ══ Handlers ══
  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    form.setValue('billing_cycle_id', cycleId, { shouldDirty: true });
  };

  const handleSelectTier = (tierId: string) => {
    form.setValue('tier_id', tierId);
    if (selectedCycleId) form.setValue('billing_cycle_id', selectedCycleId);
  };

  const handleEnterpriseInquiry = async (data: { expected_challenge_volume: string; specific_requirements: string }) => {
    if (!state.organizationId || !state.tenantId || !state.step2) return;
    const parts = ['Enterprise tier inquiry from registration wizard'];
    if (data.expected_challenge_volume) parts.push(`Expected challenge volume/month: ${data.expected_challenge_volume}`);
    if (data.specific_requirements.trim()) parts.push(`Requirements: ${data.specific_requirements.trim()}`);
    await submitEnterprise.mutateAsync({
      organization_id: state.organizationId, tenant_id: state.tenantId,
      contact_name: state.step2.full_name, contact_email: state.step2.email,
      contact_phone: state.step2.phone, company_size: state.step1?.company_size_range,
      message: parts.join(' | '),
    });
  };

  const handleSubmit = async (data: PlanSelectionFormValues) => {
    if (isEnterpriseTier) { toast.info('Our enterprise team will contact you shortly.'); return; }
    setStep4Data({
      tier_id: data.tier_id, billing_cycle_id: data.billing_cycle_id,
      engagement_model_id: data.engagement_model_id || undefined,
      membership_tier_id: data.membership_tier_id || undefined,
      estimated_challenges_per_month: 0,
    });
    setStep(5);
    navigate('/registration/billing');
  };

  const isReturning = !!state.organizationId && !!state.step4;
  const showContinueOnly = isReturning && !form.formState.isDirty;
  const handleContinueOnly = () => { setStep(5); navigate('/registration/billing'); };

  // ══ Loading ══
  if (tiersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 w-full" /><Skeleton className="h-80 w-full" /><Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const nonEnterpriseTiers = tiers?.filter((t) => !t.is_enterprise) ?? [];
  const enterpriseTier = tiers?.find((t) => t.is_enterprise);

  // ══ Render ══
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Org Context Banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm">
          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium">Registering: {state.step1?.legal_entity_name || 'Your Organization'}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Currency: {state.localeInfo?.currency_code || 'USD'}</span>
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
                  <h3 className="font-semibold text-foreground text-sm">Understanding Engagement Models & Tier Rules</h3>
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">NEW</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">Each tier provides access to different engagement models. The Marketplace model connects you with vetted solution providers, while the Aggregator model provides curated expert panels.</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Marketplace Model</Badge>
                  <Badge variant="outline" className="text-xs">Aggregator Model</Badge>
                  <Badge variant="outline" className="text-xs">Tier Comparison</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header + Billing Cycle Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Choose Your Plan</h2>
            <p className="text-sm text-muted-foreground">Select the subscription tier that best fits your organization's needs.</p>
          </div>
          {billingCycles && billingCycles.length > 0 && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              {billingCycles.map((cycle) => (
                <button key={cycle.id} type="button" onClick={() => handleCycleChange(cycle.id)} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5', selectedCycleId === cycle.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {cycle.name}
                  {cycle.discount_percentage > 0 && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0">-{cycle.discount_percentage}%</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hidden validation fields */}
        <FormField control={form.control} name="tier_id" render={() => <FormItem className="hidden"><FormMessage /></FormItem>} />
        <FormField control={form.control} name="billing_cycle_id" render={() => <FormItem className="hidden"><FormMessage /></FormItem>} />

        {/* Membership Tier Selection */}
        {!isInternalDept && membershipTiers && membershipTiers.length > 0 && (
          <MembershipTierSelector tiers={membershipTiers} selectedTierId={form.watch('membership_tier_id') || undefined} onSelect={(id) => form.setValue('membership_tier_id', id ?? '', { shouldDirty: true })} currencySymbol={currencySymbol} />
        )}

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {nonEnterpriseTiers.map((tier) => (
            <PlanTierCard
              key={tier.id}
              tier={tier}
              isSelected={watchedTierId === tier.id}
              onSelect={handleSelectTier}
              pricingArray={pricingArray as any}
              cycleDiscount={cycleDiscount}
              subsidizedPct={subsidizedPct}
              currencySymbol={currencySymbol}
              selectedCycle={selectedCycle}
              features={getFeaturesForTier(tier.id)}
              isInternalDept={isInternalDept}
              baseFees={baseFeeSource as any}
              platformFees={platformFeeSource as any}
              usingFallbackFees={usingFallbackFees}
              membershipFeeDiscountPct={membershipResult.isEligible ? membershipResult.feeDiscountPct : 0}
            />
          ))}
          {enterpriseTier && (
            <PlanEnterpriseCard
              tier={enterpriseTier}
              isSelected={watchedTierId === enterpriseTier.id}
              companySizeRange={state.step1?.company_size_range}
              onSubmitInquiry={handleEnterpriseInquiry}
              isPending={submitEnterprise.isPending}
            />
          )}
        </div>

        {/* Engagement Model (Basic tier only) */}
        {isBasicTier && availableEngagementModels.length > 0 && (
          <FormField control={form.control} name="engagement_model_id" render={({ field }) => (
            <FormItem>
              <label className="text-sm font-medium text-foreground">Engagement Model</label>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="text-base"><SelectValue placeholder="Select engagement model" /></SelectTrigger></FormControl>
                <SelectContent>{availableEngagementModels.map((model) => <SelectItem key={model!.id} value={model!.id}>{model!.name}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {/* Shadow billing note */}
        {isInternalDept && watchedTierId && tierShadow && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Internal department: No actual billing. Shadow charge of {tierShadow.currency_code} {tierShadow.shadow_charge_per_challenge}/challenge for tracking purposes.</p>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate('/registration/compliance')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden lg:inline">Step 4 of 5</span>
            {showContinueOnly ? (
              <Button type="button" onClick={handleContinueOnly}>Continue<ArrowRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button type="submit" disabled={!watchedTierId || isEnterpriseTier}>Save & Continue<ArrowRight className="h-4 w-4 ml-1" /></Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
