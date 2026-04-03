/**
 * Billing Form (REG-005)
 * Step 5: Payment method, billing address, terms acceptance, subscription creation.
 * Orchestrates BillingAddressFields, BillingPaymentSection, and BillingOrderSummary.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Lock, Shield } from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import { usePaymentMethods, useActivePlatformTerms, useSaveBillingInfo, useCreateSubscription } from '@/hooks/queries/useBillingData';
import { useCreateMembership } from '@/hooks/queries/useMembershipData';
import { useCreateRegistrationPayment } from '@/hooks/queries/useRegistrationPayments';
import { useSubscriptionTiers, useTierPricingForCountry, useAllTierPricing, useBillingCycles } from '@/hooks/queries/usePlanSelectionData';
import { useRehydrateRegistration } from '@/hooks/queries/useRehydrateRegistration';
import { useMembershipTiers } from '@/hooks/queries/useMembershipTiers';
import { useStatesForCountry } from '@/hooks/queries/useRegistrationData';
import { billingSchema, type BillingFormValues } from '@/lib/validations/billing';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { BillingAddressFields } from './BillingAddressFields';
import { BillingPaymentSection } from './BillingPaymentSection';
import { BillingOrderSummary } from './BillingOrderSummary';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';

export function BillingForm() {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const { state, setStep5Data, setStep, reset } = useRegistrationContext();
  const navigate = useNavigate();
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

  // Queries
  const { data: paymentMethods, isLoading: methodsLoading } = usePaymentMethods(watchedBillingCountryId);
  const { data: platformTerms } = useActivePlatformTerms();
  const { data: billingStates, isLoading: statesLoading } = useStatesForCountry(watchedBillingCountryId);
  const { data: tiers } = useSubscriptionTiers();
  const { data: pricing } = useTierPricingForCountry(state.step1?.hq_country_id);
  const { data: allPricingRaw } = useAllTierPricing();
  const { data: billingCycles } = useBillingCycles();
  const { data: membershipTiers } = useMembershipTiers();
  const saveBilling = useSaveBillingInfo();
  const createSubscription = useCreateSubscription();
  const createMembership = useCreateMembership();
  const createPayment = useCreateRegistrationPayment();
  const { isRehydrating, rehydrationFailed } = useRehydrateRegistration();

  // Derived
  const availableMethods = isInternalDept
    ? [{ payment_method: 'shadow' as const, id: 'shadow', tier_id: null }]
    : paymentMethods?.filter((pm) => !state.step4?.tier_id || !pm.tier_id || pm.tier_id === state.step4.tier_id) ?? [];
  const isSubmitting = saveBilling.isPending || createSubscription.isPending || createMembership.isPending || isCreatingAccount;

  const tiersArray = Array.isArray(tiers) ? tiers : [];
  const countryPricingArray = Array.isArray(pricing) ? pricing : [];
  const allPricingArray = Array.isArray(allPricingRaw) ? allPricingRaw : [];
  const pricingArray = countryPricingArray.length > 0 ? countryPricingArray : (() => {
    const seen = new Set<string>();
    return allPricingArray.filter((p) => p.currency_code === 'USD').filter((p) => { if (seen.has(p.tier_id)) return false; seen.add(p.tier_id); return true; });
  })();
  const cyclesArray = Array.isArray(billingCycles) ? billingCycles : [];
  const mTiersArray = Array.isArray(membershipTiers) ? membershipTiers : [];
  const selectedTier = tiersArray.find((t) => t.id === state.step4?.tier_id);
  const selectedCycle = cyclesArray.find((c) => c.id === state.step4?.billing_cycle_id);
  const tierPrice = pricingArray.find((p) => p.tier_id === state.step4?.tier_id);
  const baseMonthly = tierPrice?.local_price ?? tierPrice?.monthly_price_usd ?? 0;
  const cycleDiscount = selectedCycle?.discount_percentage ?? 0;
  const subsidizedPct = state.orgTypeFlags?.subsidized_discount_pct ?? 0;
  const afterCycleDiscount = baseMonthly * (1 - cycleDiscount / 100);
  const effectiveMonthly = afterCycleDiscount * (1 - subsidizedPct / 100);
  const currencyCode = tierPrice?.currency_code ?? 'USD';
  const currencySymbol = state.localeInfo?.currency_symbol ?? '$';
  const selectedMembership = mTiersArray.find((m) => m.id === state.step4?.membership_tier_id);
  const membershipFee = selectedMembership?.annual_fee_usd ?? 0;
  const totalDiscount = Math.min(100, cycleDiscount + subsidizedPct);
  const dueToday = isInternalDept ? 0 : effectiveMonthly + membershipFee;

  // Legal gate for SEEKER_ENROLLMENT trigger (CA acceptance)
  const seekerGate = useLegalGateAction({ triggerEvent: 'SEEKER_ENROLLMENT' });

  // Submit handler
  const handleSubmit = async (data: BillingFormValues) => {
    if (!state.organizationId || !state.tenantId || !state.step4) {
      toast.error('Missing registration data. Please go back and complete previous steps.');
      return;
    }
    try {
      await saveBilling.mutateAsync({
        organization_id: state.organizationId, tenant_id: state.tenantId,
        billing_entity_name: data.billing_entity_name, billing_email: data.billing_email,
        billing_address_line1: data.billing_address_line1, billing_address_line2: data.billing_address_line2,
        billing_city: data.billing_city, billing_state_province_id: data.billing_state_province_id,
        billing_country_id: data.billing_country_id, billing_postal_code: data.billing_postal_code,
        payment_method: data.payment_method, po_number: data.po_number, tax_id: data.tax_id,
      });

      let termsHash: string | undefined;
      if (platformTerms && state.organizationId) {
        const acceptedAt = new Date().toISOString();
        const { data: hashResult, error: hashError } = await supabase.rpc('generate_terms_acceptance_hash', {
          p_org_id: state.organizationId, p_terms_version: platformTerms.version, p_accepted_at: acceptedAt, p_accepted_by: state.organizationId,
        });
        if (hashError) { toast.error('Failed to generate terms acceptance hash'); return; }
        termsHash = hashResult as string;
      }

      await createSubscription.mutateAsync({
        organization_id: state.organizationId, tenant_id: state.tenantId, tier_id: state.step4.tier_id,
        billing_cycle_id: state.step4.billing_cycle_id, engagement_model_id: state.step4.engagement_model_id,
        monthly_base_price: baseMonthly, effective_monthly_cost: effectiveMonthly, discount_percentage: totalDiscount,
        payment_type: isInternalDept ? 'shadow' : 'live', status: 'active',
        terms_version: platformTerms?.version, terms_acceptance_hash: termsHash,
      });

      if (state.step4.membership_tier_id && selectedMembership) {
        const durationMonths = selectedMembership.duration_months ?? 12;
        const endsAt = new Date(); endsAt.setMonth(endsAt.getMonth() + durationMonths);
        await createMembership.mutateAsync({
          organization_id: state.organizationId, tenant_id: state.tenantId,
          membership_tier_id: state.step4.membership_tier_id,
          fee_discount_pct: selectedMembership.fee_discount_pct ?? 0,
          commission_rate_pct: selectedMembership.commission_rate_pct ?? 0,
          ends_at: endsAt.toISOString(),
        });
      }

      try {
        await createPayment.mutateAsync({
          organization_id: state.organizationId, tenant_id: state.tenantId,
          payment_amount: dueToday, currency_code: currencyCode,
          payment_method: isInternalDept ? 'shadow' : data.payment_method,
        });
      } catch { /* Non-blocking placeholder */ }

      if (state.step2?.password && state.step2?.email) {
        setIsCreatingAccount(true);
        try {
          const response = await supabase.functions.invoke('create-org-admin', {
            body: {
              email: state.step2.email, password: state.step2.password,
              first_name: state.step2.first_name ?? '', last_name: state.step2.last_name ?? '',
              organization_id: state.organizationId, tenant_id: state.tenantId,
            },
          });
          if (response.error || !response.data?.success) {
            toast.error(`Account creation failed: ${response.data?.error?.message ?? response.error?.message ?? 'Unknown error'}`);
            setIsCreatingAccount(false); return;
          }
        } finally { setIsCreatingAccount(false); }
      } else { toast.error('Password not found. Please go back to Step 2.'); return; }

      if (state.step2?.admin_designation === 'separate' && state.step2?.separate_admin?.email) {
        try {
          await supabase.from('org_admin_change_requests').insert({
            tenant_id: state.tenantId, organization_id: state.organizationId, requested_by: null,
            current_admin_user_id: null, new_admin_name: state.step2.separate_admin.name ?? null,
            new_admin_email: state.step2.separate_admin.email, new_admin_phone: state.step2.separate_admin.phone ?? null,
            new_admin_title: (state.step2.separate_admin as any).admin_title ?? null,
            new_admin_relationship_to_org: (state.step2.separate_admin as any).relationship_to_org ?? null,
            request_type: 'registration_delegate', lifecycle_status: 'pending',
          } as any);
        } catch { /* Non-blocking */ }
      }

      await supabase.from('seeker_organizations').update({
        verification_status: 'payment_submitted' as any, registration_step: 5, updated_at: new Date().toISOString(),
      }).eq('id', state.organizationId);

      setStep5Data({
        payment_method: data.payment_method, is_internal_department: isInternalDept,
        billing_entity_name: data.billing_entity_name, billing_email: data.billing_email,
        billing_address_line1: data.billing_address_line1, billing_address_line2: data.billing_address_line2,
        billing_city: data.billing_city, billing_state_province_id: data.billing_state_province_id,
        billing_country_id: data.billing_country_id, billing_postal_code: data.billing_postal_code,
        po_number: data.po_number, tax_id: data.tax_id,
      });
      setStep(6);
      toast.success('Registration complete! Review your summary.');
      navigate('/registration/preview');
    } catch { /* Error handled by mutation callbacks */ }
  };

  // Guards
  if (isRehydrating) {
    return <Card className="max-w-md mx-auto mt-8"><CardContent className="pt-6 text-center space-y-4"><Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" /><div><h3 className="font-semibold text-foreground">Restoring Your Session</h3><p className="text-sm text-muted-foreground mt-1">Loading your registration data…</p></div></CardContent></Card>;
  }
  if (rehydrationFailed || !state.organizationId || !state.tenantId || !state.step4) {
    return <Card className="max-w-md mx-auto mt-8"><CardContent className="pt-6 text-center space-y-4"><Shield className="h-10 w-10 mx-auto text-muted-foreground" /><div><h3 className="font-semibold text-foreground">Session Data Not Found</h3><p className="text-sm text-muted-foreground mt-1">Your registration session may have expired. Please restart from Step 1.</p></div><Button onClick={() => navigate('/registration/organization-identity')} className="w-full"><ArrowLeft className="h-4 w-4 mr-2" />Return to Step 1</Button></CardContent></Card>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => seekerGate.gateAction(() => handleSubmit(data)))}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <BillingAddressFields form={form} billingStates={billingStates} statesLoading={statesLoading} watchedBillingCountryId={watchedBillingCountryId} />
            <BillingPaymentSection form={form} isInternalDept={isInternalDept} availableMethods={availableMethods} methodsLoading={methodsLoading} platformTerms={platformTerms} />
          </div>
          <div className="xl:col-span-1">
            <BillingOrderSummary selectedTierName={selectedTier?.name} selectedTierCode={selectedTier?.code} selectedCycleName={selectedCycle?.name} currencySymbol={currencySymbol} baseMonthly={baseMonthly} cycleDiscount={cycleDiscount} subsidizedPct={subsidizedPct} effectiveMonthly={effectiveMonthly} selectedMembership={selectedMembership} membershipFee={membershipFee} dueToday={dueToday} isInternalDept={isInternalDept} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate('/registration/plan-selection')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden lg:inline">Step 5 of 5</span>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}Complete Registration
            </Button>
          </div>
        </div>
      </form>

      {/* SEEKER_ENROLLMENT legal gate */}
      {seekerGate.showGate && (
        <LegalGateModal
          triggerEvent={seekerGate.triggerEvent}
          onAllAccepted={seekerGate.handleAllAccepted}
          onDeclined={seekerGate.handleDeclined}
        />
      )}
    </Form>
  );
}
