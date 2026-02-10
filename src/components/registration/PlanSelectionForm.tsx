/**
 * Plan Selection Form (REG-004)
 * 
 * Step 4: Tier comparison, pricing, billing cycle, engagement model.
 * Business Rules: BR-REG-011, BR-REG-013, BR-REG-014, BR-REG-015
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Crown, Zap, MessageSquare } from 'lucide-react';

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
  FormLabel,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TIER_ICONS: Record<string, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  standard: <Star className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

export function PlanSelectionForm() {
  // ══════════════════════════════════════
  // SECTION 1: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep4Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 2: Form hook
  // ══════════════════════════════════════
  const form = useForm<PlanSelectionFormValues>({
    resolver: zodResolver(planSelectionSchema),
    defaultValues: {
      tier_id: '',
      billing_cycle_id: '',
      engagement_model_id: '',
    },
  });

  const watchedTierId = form.watch('tier_id');
  const watchedBillingCycleId = form.watch('billing_cycle_id');

  // ══════════════════════════════════════
  // SECTION 3: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { data: tierFeatures } = useTierFeatures();
  const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
  const { data: billingCycles, isLoading: cyclesLoading } = useBillingCycles();
  const { data: engagementModels } = useEngagementModels();
  const { data: tierEngagement } = useTierEngagementAccess();
  const { data: shadowPricing } = useShadowPricing();
  const submitEnterprise = useSubmitEnterpriseContact();

  // ══════════════════════════════════════
  // SECTION 4: Derived values
  // ══════════════════════════════════════
  const selectedTier = tiers?.find((t) => t.id === watchedTierId);
  const selectedBillingCycle = billingCycles?.find((c) => c.id === watchedBillingCycleId);
  const isEnterpriseTier = selectedTier?.is_enterprise ?? false;
  const isBasicTier = selectedTier?.code === 'basic';
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;
  const subsidizedDiscount = state.orgTypeFlags?.subsidized_discount_pct ?? 0;

  // Get pricing for selected tier
  const tierPrice = pricing?.find((p) => p.tier_id === watchedTierId);
  const baseMonthly = tierPrice?.local_price ?? tierPrice?.monthly_price_usd ?? 0;
  const currencyCode = tierPrice?.currency_code ?? state.localeInfo?.currency_code ?? 'USD';

  // Billing cycle discount
  const cycleDiscount = selectedBillingCycle?.discount_percentage ?? 0;
  const totalDiscount = Math.min(cycleDiscount + subsidizedDiscount, 100);
  const effectiveMonthly = baseMonthly * (1 - totalDiscount / 100);

  // Engagement models available for this tier
  const availableEngagementModels = tierEngagement
    ?.filter((te) => te.tier_id === watchedTierId && te.access_type === 'included')
    .map((te) => engagementModels?.find((em) => em.id === te.engagement_model_id))
    .filter(Boolean) ?? [];

  // Shadow pricing for internal departments
  const tierShadow = shadowPricing?.find((sp) => sp.tier_id === watchedTierId);

  // Group features by tier
  const getFeaturesForTier = (tierId: string) =>
    tierFeatures?.filter((f) => f.tier_id === tierId) ?? [];

  // ══════════════════════════════════════
  // SECTION 5: Event handlers
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  if (tiersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Tier Cards */}
        <FormField
          control={form.control}
          name="tier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Choose Your Plan</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                >
                  {tiers?.filter((t) => !t.is_enterprise).map((tier) => {
                    const tp = pricing?.find((p) => p.tier_id === tier.id);
                    const price = tp?.local_price ?? tp?.monthly_price_usd ?? 0;
                    const features = getFeaturesForTier(tier.id);
                    const isSelected = field.value === tier.id;
                    const isRecommended = state.orgTypeFlags?.tier_recommendation === tier.code;

                    return (
                      <Label
                        key={tier.id}
                        htmlFor={`tier-${tier.id}`}
                        className={cn(
                          'relative flex flex-col rounded-xl border-2 p-5 cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <RadioGroupItem
                          id={`tier-${tier.id}`}
                          value={tier.id}
                          className="sr-only"
                        />

                        {isRecommended && (
                          <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-xs">
                            Recommended
                          </Badge>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <div className="text-primary">
                            {TIER_ICONS[tier.code] ?? <Zap className="h-5 w-5" />}
                          </div>
                          <h3 className="font-semibold text-foreground">{tier.name}</h3>
                        </div>

                        <div className="mb-3">
                          <span className="text-2xl font-bold text-foreground">
                            {currencyCode} {price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>

                        {tier.description && (
                          <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                        )}

                        <div className="space-y-2 mt-auto">
                          {tier.max_challenges && (
                            <div className="text-sm text-muted-foreground">
                              Up to {tier.max_challenges} challenges/month
                            </div>
                          )}
                          {tier.max_users && (
                            <div className="text-sm text-muted-foreground">
                              Up to {tier.max_users} users
                            </div>
                          )}
                          {features.slice(0, 5).map((f) => (
                            <div key={f.id} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-foreground">{f.feature_name}</span>
                            </div>
                          ))}
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Enterprise Contact Card */}
        {tiers?.some((t) => t.is_enterprise) && (
          <div className="rounded-xl border-2 border-dashed border-border p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Enterprise</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Custom pricing, dedicated support, and unlimited features.
            </p>
            <Button
              type="button"
              variant="outline"
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
        )}

        {/* Billing Cycle */}
        {watchedTierId && !isEnterpriseTier && (
          <FormField
            control={form.control}
            name="billing_cycle_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Cycle *</FormLabel>
                {cyclesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-3"
                  >
                    {billingCycles?.map((cycle) => (
                      <Label
                        key={cycle.id}
                        htmlFor={`cycle-${cycle.id}`}
                        className={cn(
                          'flex flex-col rounded-lg border p-3 cursor-pointer transition-all',
                          field.value === cycle.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <RadioGroupItem
                          id={`cycle-${cycle.id}`}
                          value={cycle.id}
                          className="sr-only"
                        />
                        <span className="font-medium text-foreground">{cycle.name}</span>
                        {cycle.discount_percentage > 0 && (
                          <Badge variant="secondary" className="w-fit mt-1 text-xs">
                            Save {cycle.discount_percentage}%
                          </Badge>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Engagement Model (Basic tier only) */}
        {isBasicTier && availableEngagementModels.length > 0 && (
          <FormField
            control={form.control}
            name="engagement_model_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engagement Model</FormLabel>
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

        {/* Cost Summary */}
        {watchedTierId && watchedBillingCycleId && !isEnterpriseTier && (
          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Cost Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Monthly Price</span>
                <span className="text-foreground">{currencyCode} {baseMonthly.toLocaleString()}</span>
              </div>
              {cycleDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Billing Cycle Discount</span>
                  <span>-{cycleDiscount}%</span>
                </div>
              )}
              {subsidizedDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Subsidized Discount</span>
                  <span>-{subsidizedDiscount}%</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span className="text-foreground">Effective Monthly Cost</span>
                <span className="text-foreground">{currencyCode} {effectiveMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {isInternalDept && tierShadow && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">
                    Internal department: No actual billing.
                    Shadow charge of {tierShadow.currency_code} {tierShadow.shadow_charge_per_challenge}/challenge for tracking purposes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/registration/compliance')}
          >
            Back
          </Button>
          <Button type="submit" disabled={!watchedTierId || isEnterpriseTier}>
            Continue to Billing
          </Button>
        </div>
      </form>
    </Form>
  );
}
