/**
 * Plan Selection Form (REG-004)
 * 
 * Step 4: Tier comparison, pricing, billing cycle, engagement model.
 * Business Rules: BR-REG-011, BR-REG-013, BR-REG-014, BR-REG-015
 * Redesigned to match reference mockups.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Star, Crown, Zap, MessageSquare, Lightbulb, ArrowLeft, ArrowRight, Loader2, Sparkles,
} from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  useSubscriptionTiers,
  useTierFeatures,
  useTierPricingForCountry,
  useBillingCycles,
  useEngagementModels,
  useTierEngagementAccess,
  useShadowPricing,
  useSubmitEnterpriseContact,
} from '@/hooks/queries/usePlanSelectionData';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
};

// All features across tiers for comparison grid
const COMPARISON_FEATURES = [
  'Marketplace Access',
  'Aggregator Access',
  'Dedicated Account Manager',
  'Analytics Dashboard',
  'API Access',
  'Priority Support',
  'Custom Integrations',
  'White-label Reports',
];

export function PlanSelectionForm() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [isAnnual, setIsAnnual] = useState(false);

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
    },
  });

  const watchedTierId = form.watch('tier_id');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { data: tierFeatures } = useTierFeatures();
  const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
  const { data: billingCycles } = useBillingCycles();
  const { data: engagementModels } = useEngagementModels();
  const { data: tierEngagement } = useTierEngagementAccess();
  const { data: shadowPricing } = useShadowPricing();
  const submitEnterprise = useSubmitEnterpriseContact();

  // ══════════════════════════════════════
  // SECTION 5: Derived values
  // ══════════════════════════════════════
  const selectedTier = tiers?.find((t) => t.id === watchedTierId);
  const isEnterpriseTier = selectedTier?.is_enterprise ?? false;
  const isBasicTier = selectedTier?.code === 'basic';
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;

  const pricingArray = Array.isArray(pricing) ? pricing : [];
  const currencyCode = pricingArray[0]?.currency_code ?? state.localeInfo?.currency_code ?? 'USD';

  // Annual billing cycle
  const annualCycle = billingCycles?.find((c) => c.code === 'annual' || c.months === 12);
  const monthlyCycle = billingCycles?.find((c) => c.code === 'monthly' || c.months === 1);
  const annualDiscount = annualCycle?.discount_percentage ?? 17;

  const getEffectivePrice = (tierId: string) => {
    const tp = pricingArray.find((p) => p.tier_id === tierId);
    const base = tp?.local_price ?? tp?.monthly_price_usd ?? 0;
    if (isAnnual) return base * (1 - annualDiscount / 100);
    return base;
  };

  const getBasePrice = (tierId: string) => {
    const tp = pricingArray.find((p) => p.tier_id === tierId);
    return tp?.local_price ?? tp?.monthly_price_usd ?? 0;
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
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleSelectTier = (tierId: string) => {
    form.setValue('tier_id', tierId);
    // Auto-set billing cycle based on toggle
    const cycleToUse = isAnnual ? annualCycle : monthlyCycle;
    if (cycleToUse) {
      form.setValue('billing_cycle_id', cycleToUse.id);
    }
  };

  const handleEnterpriseContact = async () => {
    if (!state.organizationId || !state.tenantId || !state.step2) return;

    await submitEnterprise.mutateAsync({
      organization_id: state.organizationId,
      tenant_id: state.tenantId,
      contact_name: state.step2.full_name,
      contact_email: state.step2.email,
      contact_phone: state.step2.phone,
      company_size: state.step1?.company_size_range,
      message: 'Enterprise tier inquiry from registration wizard',
    });
  };

  const handleSubmit = async (data: PlanSelectionFormValues) => {
    if (isEnterpriseTier) {
      toast.info('Our enterprise team will contact you shortly.');
      return;
    }

    setStep4Data({
      tier_id: data.tier_id,
      billing_cycle_id: data.billing_cycle_id,
      engagement_model_id: data.engagement_model_id || undefined,
      estimated_challenges_per_month: 0,
    });

    setStep(5);
    navigate('/registration/billing');
  };

  const isReturning = !!state.organizationId && !!state.step4;
  const { isDirty } = form.formState;
  const showContinueOnly = isReturning && !isDirty;

  const handleContinueOnly = () => {
    setStep(5);
    navigate('/registration/billing');
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

        {/* Page Header with Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Choose Your Plan</h2>
            <p className="text-sm text-muted-foreground">
              Select the subscription tier that best fits your organization's needs.
            </p>
          </div>

          {/* Monthly / Annual Toggle */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2">
            <span className={cn('text-sm font-medium', !isAnnual ? 'text-foreground' : 'text-muted-foreground')}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={cn('text-sm font-medium', isAnnual ? 'text-foreground' : 'text-muted-foreground')}>
              Annual
            </span>
            {annualDiscount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                Save {annualDiscount}%
              </Badge>
            )}
          </div>
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

        {/* Tier Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {nonEnterpriseTiers.map((tier) => {
            const config = TIER_CONFIG[tier.code] ?? TIER_CONFIG.basic;
            const price = getEffectivePrice(tier.id);
            const basePrice = getBasePrice(tier.id);
            const features = getFeaturesForTier(tier.id);
            const isSelected = watchedTierId === tier.id;

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

                  {/* Price */}
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-foreground">
                      ${Math.round(price).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {isAnnual && basePrice !== price && (
                    <p className="text-xs text-muted-foreground line-through mb-2">
                      ${Math.round(basePrice).toLocaleString()}/mo
                    </p>
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

                  {/* Per-challenge note */}
                  <p className="text-xs text-muted-foreground mt-4 mb-4">
                    + per-challenge fees apply
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
        </div>

        {/* Enterprise Card */}
        {tiers?.some((t) => t.is_enterprise) && (
          <Card className="border-dashed border-2">
            <CardContent className="pt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Enterprise</h3>
                  <p className="text-sm text-muted-foreground">
                    Custom pricing, dedicated support, and unlimited features.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
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
            </CardContent>
          </Card>
        )}

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
