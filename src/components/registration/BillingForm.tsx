/**
 * Billing Form (REG-005)
 * 
 * Step 5: Payment method, billing address, terms acceptance, subscription creation.
 * Business Rules: BR-REG-016, BR-SAAS-001/003, BR-ZFE-001
 * Redesigned with 2-column layout, order summary, payment tabs.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Loader2, ArrowLeft, Lock, CreditCard, Building2, Banknote, Shield, CheckCircle2,
} from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  usePaymentMethods,
  useActivePlatformTerms,
  useSaveBillingInfo,
  useCreateSubscription,
} from '@/hooks/queries/useBillingData';
import {
  useSubscriptionTiers,
  useTierPricingForCountry,
  useBillingCycles,
} from '@/hooks/queries/usePlanSelectionData';
import { useMembershipTiers } from '@/hooks/queries/useMembershipTiers';
import { calculateMembershipDiscount } from '@/services/membershipService';
import { useStatesForCountry } from '@/hooks/queries/useRegistrationData';
import { CountrySelector } from './CountrySelector';
import { billingSchema, type BillingFormValues } from '@/lib/validations/billing';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAYMENT_METHOD_LABELS: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  credit_card: { label: 'Credit/Debit Card', desc: 'Visa, Mastercard, Amex', icon: <CreditCard className="h-4 w-4" /> },
  ach_bank_transfer: { label: 'ACH Bank Transfer', desc: 'US bank accounts', icon: <Building2 className="h-4 w-4" /> },
  wire_transfer: { label: 'Wire Transfer', desc: 'International transfer', icon: <Banknote className="h-4 w-4" /> },
  shadow: { label: 'Internal Tracking', desc: 'Shadow billing', icon: <Shield className="h-4 w-4" /> },
};

export function BillingForm() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [termsOpen, setTermsOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep5Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 3: Form hook
  // ══════════════════════════════════════
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;
  const countryId = state.step1?.hq_country_id;

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      billing_entity_name: state.step5?.billing_entity_name ?? state.step1?.legal_entity_name ?? '',
      billing_email: state.step5?.billing_email ?? state.step2?.email ?? '',
      billing_address_line1: state.step5?.billing_address_line1 ?? '',
      billing_address_line2: state.step5?.billing_address_line2 ?? '',
      billing_city: state.step5?.billing_city ?? state.step1?.city ?? '',
      billing_state_province_id: state.step5?.billing_state_province_id ?? state.step1?.state_province_id ?? '',
      billing_country_id: state.step5?.billing_country_id ?? countryId ?? '',
      billing_postal_code: state.step5?.billing_postal_code ?? '',
      payment_method: (state.step5?.payment_method as BillingFormValues['payment_method']) ?? (isInternalDept ? 'shadow' : 'credit_card'),
      po_number: state.step5?.po_number ?? '',
      tax_id: state.step5?.tax_id ?? '',
      terms_accepted: false,
    },
  });

  const watchedBillingCountryId = form.watch('billing_country_id');
  const watchedPaymentMethod = form.watch('payment_method');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: paymentMethods, isLoading: methodsLoading } = usePaymentMethods(watchedBillingCountryId);
  const { data: platformTerms } = useActivePlatformTerms();
  const { data: billingStates, isLoading: statesLoading } = useStatesForCountry(watchedBillingCountryId);
  const { data: tiers } = useSubscriptionTiers();
  const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
  const { data: billingCycles } = useBillingCycles();
  const { data: membershipTiers } = useMembershipTiers();
  const saveBilling = useSaveBillingInfo();
  const createSubscription = useCreateSubscription();

  // ══════════════════════════════════════
  // SECTION 5: Derived values
  // ══════════════════════════════════════
  const availableMethods = isInternalDept
    ? [{ payment_method: 'shadow' as const, id: 'shadow', tier_id: null }]
    : paymentMethods?.filter((pm) => !state.step4?.tier_id || !pm.tier_id || pm.tier_id === state.step4.tier_id) ?? [];

  const isSubmitting = saveBilling.isPending || createSubscription.isPending;

  // Order summary data
  const tiersArray = Array.isArray(tiers) ? tiers : [];
  const pricingArray = Array.isArray(pricing) ? pricing : [];
  const cyclesArray = Array.isArray(billingCycles) ? billingCycles : [];
  const selectedTier = tiersArray.find((t) => t.id === state.step4?.tier_id);
  const selectedCycle = cyclesArray.find((c) => c.id === state.step4?.billing_cycle_id);
  const tierPrice = pricingArray.find((p) => p.tier_id === state.step4?.tier_id);
  const baseMonthly = tierPrice?.local_price ?? tierPrice?.monthly_price_usd ?? 0;
  const cycleDiscount = selectedCycle?.discount_percentage ?? 0;
  const subsidizedPct = state.orgTypeFlags?.subsidized_discount_pct ?? 0;
  const afterCycleDiscount = baseMonthly * (1 - cycleDiscount / 100);
  const effectiveMonthly = afterCycleDiscount * (1 - subsidizedPct / 100);
  const currencyCode = tierPrice?.currency_code ?? 'USD';

  // ══════════════════════════════════════
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleSubmit = async (data: BillingFormValues) => {
    if (!state.organizationId || !state.tenantId || !state.step4) {
      toast.error('Missing registration data. Please go back and complete previous steps.');
      return;
    }

    try {
      await saveBilling.mutateAsync({
        organization_id: state.organizationId,
        tenant_id: state.tenantId,
        billing_entity_name: data.billing_entity_name,
        billing_email: data.billing_email,
        billing_address_line1: data.billing_address_line1,
        billing_address_line2: data.billing_address_line2,
        billing_city: data.billing_city,
        billing_state_province_id: data.billing_state_province_id,
        billing_country_id: data.billing_country_id,
        billing_postal_code: data.billing_postal_code,
        payment_method: data.payment_method,
        po_number: data.po_number,
        tax_id: data.tax_id,
      });

      const termsHash = platformTerms
        ? await generateTermsHash(state.organizationId, platformTerms.version, platformTerms.content)
        : undefined;

      await createSubscription.mutateAsync({
        organization_id: state.organizationId,
        tenant_id: state.tenantId,
        tier_id: state.step4.tier_id,
        billing_cycle_id: state.step4.billing_cycle_id,
        engagement_model_id: state.step4.engagement_model_id,
        payment_type: isInternalDept ? 'shadow' : 'live',
        terms_version: platformTerms?.version,
        terms_acceptance_hash: termsHash,
      });

      setStep5Data({
        payment_method: data.payment_method,
        is_internal_department: isInternalDept,
        billing_entity_name: data.billing_entity_name,
        billing_email: data.billing_email,
        billing_address_line1: data.billing_address_line1,
        billing_address_line2: data.billing_address_line2,
        billing_city: data.billing_city,
        billing_state_province_id: data.billing_state_province_id,
        billing_country_id: data.billing_country_id,
        billing_postal_code: data.billing_postal_code,
        po_number: data.po_number,
        tax_id: data.tax_id,
      });

      setStep(6);
      toast.success('Registration complete! Welcome aboard.');
      navigate('/login');
    } catch {
      // Error handled by mutation's onError callbacks
    }
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* LEFT COLUMN — Main Form */}
          <div className="xl:col-span-2 space-y-6">
            {/* Billing Contact */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Billing Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_entity_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Contact Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Company or dept name" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="billing@company.com" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="billing_address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" className="text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_state_province_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        {statesLoading ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Select value={field.value || ''} onValueChange={field.onChange} disabled={!watchedBillingCountryId}>
                            <FormControl>
                              <SelectTrigger className="text-base">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {billingStates?.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP / Postal Code *</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_country_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <CountrySelector value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            {!isInternalDept && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        {methodsLoading ? (
                          <Skeleton className="h-12 w-full" />
                        ) : (
                          <Tabs value={field.value} onValueChange={field.onChange}>
                            <TabsList className="w-full grid grid-cols-3">
                              {availableMethods.map((pm) => {
                                const info = PAYMENT_METHOD_LABELS[pm.payment_method];
                                return (
                                  <TabsTrigger key={pm.id} value={pm.payment_method} className="text-xs lg:text-sm">
                                    {info?.icon}
                                    <span className="ml-1.5 hidden lg:inline">{info?.label ?? pm.payment_method}</span>
                                  </TabsTrigger>
                                );
                              })}
                            </TabsList>

                            {/* Credit Card Tab */}
                            <TabsContent value="credit_card" className="space-y-4 mt-4">
                              <div>
                                <Label className="text-sm">Card Number</Label>
                                <div className="relative">
                                  <Input placeholder="1234 5678 9012 3456" className="text-base pr-20" />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground text-xs">
                                    VISA MC
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">Expiry Date</Label>
                                  <Input placeholder="MM/YY" className="text-base" />
                                </div>
                                <div>
                                  <Label className="text-sm">CVV</Label>
                                  <Input placeholder="123" className="text-base" />
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm">Cardholder Name</Label>
                                <Input placeholder="John Doe" className="text-base" />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                                <span>256-bit SSL encrypted. We never store your full card number.</span>
                              </div>
                            </TabsContent>

                            {/* ACH Tab */}
                            <TabsContent value="ach_bank_transfer" className="mt-4">
                              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                                <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  ACH bank transfer details will be provided after registration.
                                </p>
                              </div>
                            </TabsContent>

                            {/* Wire Tab */}
                            <TabsContent value="wire_transfer" className="mt-4">
                              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                                <Banknote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Wire transfer instructions will be emailed after registration.
                                </p>
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {isInternalDept && (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      As an internal department, billing will be tracked via shadow charges for internal
                      accounting purposes. No actual payment is required.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PO Number + Tax ID */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="po_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PO Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <FormField
              control={form.control}
              name="terms_accepted"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="cursor-pointer text-sm">
                      I accept the{' '}
                      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="text-primary underline hover:no-underline inline-flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Terms & Conditions
                          </button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                          <DialogHeader className="shrink-0">
                            <DialogTitle>
                              {platformTerms?.title ?? 'Terms & Conditions'}
                              {platformTerms?.version && (
                                <span className="text-muted-foreground text-sm ml-2">v{platformTerms.version}</span>
                              )}
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="prose prose-sm max-w-none p-4 text-foreground">
                              {platformTerms?.content ? (
                                <div dangerouslySetInnerHTML={{ __html: platformTerms.content }} />
                              ) : (
                                <p className="text-muted-foreground">No terms available.</p>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                      {platformTerms?.version && (
                        <span className="text-muted-foreground text-xs ml-1">(v{platformTerms.version})</span>
                      )}
                    </FormLabel>
                    <FormDescription>
                      By accepting, you agree to our platform terms and privacy policy.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* RIGHT COLUMN — Order Summary (sticky) */}
          <div className="xl:col-span-1">
            <div className="sticky top-8">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Plan info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{selectedTier?.name ?? 'Plan'}</p>
                      <p className="text-xs text-muted-foreground">{selectedCycle?.name ?? 'Monthly'} billing</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{selectedTier?.code}</Badge>
                  </div>

                  <Separator />

                  {/* Price breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Price</span>
                      <span className="text-foreground">${baseMonthly.toFixed(2)}/mo</span>
                    </div>
                    {cycleDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Billing discount</span>
                        <span>-{cycleDiscount}%</span>
                      </div>
                    )}
                    {subsidizedPct > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Subsidized discount</span>
                        <span>-{subsidizedPct}%</span>
                      </div>
                    )}
                    {/* Membership info */}
                    {state.step4?.membership_tier_id && (() => {
                      const mTiers = membershipTiers ?? [];
                      const selectedMembership = mTiers.find((m) => m.id === state.step4?.membership_tier_id);
                      if (!selectedMembership) return null;
                      const mDiscount = calculateMembershipDiscount(selectedMembership.code, false);
                      return (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{selectedMembership.name}</span>
                          <span className="text-emerald-600 text-xs">{mDiscount.feeDiscountPct}% off challenge fees</span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Challenge Fees</span>
                      <span className="text-muted-foreground text-xs">varies</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-muted-foreground text-xs">calculated at checkout</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Due Today</span>
                    <span className="text-lg font-bold text-foreground">
                      ${effectiveMonthly.toFixed(2)}
                    </span>
                  </div>

                  {isInternalDept && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                      Shadow billing — no actual charge.
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    You can upgrade, downgrade, or cancel anytime.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/registration/plan-selection')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden lg:inline">Step 5 of 5</span>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Complete Registration
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

// ============================================================
// Utility: Generate SHA-256 hash for terms acceptance
// ============================================================
async function generateTermsHash(orgId: string, version: string, content: string): Promise<string> {
  const input = `${orgId}:${version}:${content}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
