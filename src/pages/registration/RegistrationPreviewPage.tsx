/**
 * Registration Preview Page (Step 6 — Post-Submit)
 *
 * Read-only summary of all 5 registration steps with resolved names + order summary.
 */

import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Shield, CreditCard, FileText, CheckCircle2, LogIn, Printer,
  FileIcon, Globe,
} from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Data hooks for ID → name resolution
import { useCountries, useOrganizationTypes, useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useStatesForCountry, useOrgDocuments } from '@/hooks/queries/useRegistrationData';
import {
  useSubscriptionTiers, useBillingCycles, useEngagementModels,
  useTierPricingForCountry, useAllTierPricing,
} from '@/hooks/queries/usePlanSelectionData';
import { useMembershipTiers } from '@/hooks/queries/useMembershipTiers';
import { useLanguages } from '@/hooks/queries/usePrimaryContactData';
import { useExportControlStatuses, useDataResidencyOptions } from '@/hooks/queries/useComplianceData';
import { PreviewOrderSummary } from '@/components/registration/PreviewOrderSummary';

// ── Helpers ──
function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{display}</span>
    </div>
  );
}

function resolveName<T extends { id: string; name: string }>(list: T[] | undefined, id?: string) {
  if (!id || !list) return undefined;
  return list.find((i) => i.id === id)?.name;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: 'Credit/Debit Card',
  ach_bank_transfer: 'ACH Bank Transfer',
  wire_transfer: 'Wire Transfer',
  shadow: 'Internal Tracking (Shadow)',
};

const NDA_LABELS: Record<string, string> = {
  standard_platform_nda: 'Standard Platform NDA',
  custom_nda: 'Custom NDA (Uploaded)',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  logo: 'Logo',
  profile: 'Profile Document',
  verification: 'Verification Document',
  nda: 'NDA Document',
};

const VERIFICATION_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  verified: 'default',
  rejected: 'destructive',
};

export default function RegistrationPreviewPage() {
  const { state, reset } = useRegistrationContext();
  const navigate = useNavigate();

  const s1 = state.step1;
  const s2 = state.step2;
  const s3 = state.step3;
  const s4 = state.step4;
  const s5 = state.step5;

  // ══════════════════════════════════════
  // Query hooks — resolve IDs
  // ══════════════════════════════════════
  const { data: countries, isLoading: lCountries } = useCountries();
  const { data: orgTypes, isLoading: lOrgTypes } = useOrganizationTypes();
  const { data: industries, isLoading: lIndustries } = useIndustrySegments();
  const { data: hqStates, isLoading: lHqStates } = useStatesForCountry(s1?.hq_country_id);
  const { data: billingStates } = useStatesForCountry(s5?.billing_country_id);
  const { data: tiers, isLoading: lTiers } = useSubscriptionTiers();
  const { data: cycles, isLoading: lCycles } = useBillingCycles();
  const { data: engModels } = useEngagementModels();
  const { data: mTiers } = useMembershipTiers();
  const { data: countryPricing } = useTierPricingForCountry(s1?.hq_country_id);
  const { data: allPricingRaw } = useAllTierPricing();
  const { data: languages } = useLanguages();
  const { data: exportControlStatuses } = useExportControlStatuses();
  const { data: dataResidencyOptions } = useDataResidencyOptions();
  const { data: orgDocuments } = useOrgDocuments(state.organizationId);

  const isLoading = lCountries || lOrgTypes || lIndustries || lHqStates || lTiers || lCycles;

  // ── Resolve names ──
  const hqCountryName = resolveName(countries, s1?.hq_country_id);
  const hqStateName = resolveName(hqStates, s1?.state_province_id);
  const orgTypeName = resolveName(orgTypes, s1?.organization_type_id);
  const industryNames = s1?.industry_ids?.map((id) => resolveName(industries, id)).filter(Boolean).join(', ');
  const operatingGeoNames = s1?.operating_geography_ids
    ?.map((id) => resolveName(countries, id))
    .filter(Boolean)
    .join(', ');

  const preferredLanguageName = resolveName(languages, s2?.preferred_language_id);
  const exportControlName = resolveName(exportControlStatuses, s3?.export_control_status_id);
  const dataResidencyName = resolveName(dataResidencyOptions, s3?.data_residency_id);

  const selectedTier = tiers?.find((t) => t.id === s4?.tier_id);
  const selectedCycle = cycles?.find((c) => c.id === s4?.billing_cycle_id);
  const engModelName = resolveName(engModels, s4?.engagement_model_id);
  const selectedMembership = mTiers?.find((m) => m.id === s4?.membership_tier_id);

  const billingCountryName = resolveName(countries, s5?.billing_country_id);
  const billingStateName = resolveName(billingStates, s5?.billing_state_province_id);

  // ── Pricing logic (mirrors BillingForm) ──
  const countryPricingArr = Array.isArray(countryPricing) ? countryPricing : [];
  const allPricingArr = Array.isArray(allPricingRaw) ? allPricingRaw : [];
  const pricingArray = countryPricingArr.length > 0
    ? countryPricingArr
    : (() => {
        const seen = new Set<string>();
        return allPricingArr.filter((p) => p.currency_code === 'USD').filter((p) => {
          if (seen.has(p.tier_id)) return false;
          seen.add(p.tier_id);
          return true;
        });
      })();

  const tierPrice = pricingArray.find((p) => p.tier_id === s4?.tier_id);
  const baseMonthly = tierPrice?.local_price ?? tierPrice?.monthly_price_usd ?? 0;
  const cycleDiscount = selectedCycle?.discount_percentage ?? 0;
  const subsidizedPct = state.orgTypeFlags?.subsidized_discount_pct ?? 0;
  const afterCycleDiscount = baseMonthly * (1 - cycleDiscount / 100);
  const effectiveMonthly = afterCycleDiscount * (1 - subsidizedPct / 100);
  const currencySymbol = state.localeInfo?.currency_symbol ?? '$';
  const membershipFee = selectedMembership?.annual_fee_usd ?? 0;
  const isInternalDept = state.orgTypeFlags?.zero_fee_eligible ?? false;
  const cycleMonths = selectedCycle?.months ?? 1;
  const subscriptionTotal = effectiveMonthly * cycleMonths;
  const dueToday = isInternalDept ? 0 : subscriptionTotal + membershipFee;

  const handleGoToLogin = () => { reset(); navigate('/login'); };

  // ── Guard: no data ──
  if (!s1 && !s2 && !s3 && !s4 && !s5) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-semibold text-foreground">No Registration Data</h3>
            <p className="text-sm text-muted-foreground">Your registration session has expired or was already completed.</p>
            <Button onClick={() => navigate('/login')} className="w-full"><LogIn className="h-4 w-4 mr-2" /> Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full max-w-4xl" />
        <Skeleton className="h-48 w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">Registration</span>
          <Badge variant="default" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</Badge>
        </div>
      </header>

      {/* Success Banner */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Complete!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Your organization has been registered. Review the summary below, then log in to get started.</p>
        </div>
      </div>

      {/* Content — 2 columns on xl */}
      <main className="flex-1 min-h-0">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT — Step summaries */}
          <div className="xl:col-span-2 space-y-6">
            {/* Step 1 */}
            {s1 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Organization Identity</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Field label="Legal Entity Name" value={s1.legal_entity_name} />
                    <Field label="Trade / Brand Name" value={s1.trade_brand_name} />
                    <Field label="Organization Type" value={orgTypeName} />
                    <Field label="Industries" value={industryNames} />
                    <Field label="Company Size" value={s1.company_size_range} />
                    <Field label="Annual Revenue" value={s1.annual_revenue_range} />
                    <Field label="Year Founded" value={s1.year_founded} />
                    <Field label="HQ Country" value={hqCountryName} />
                    <Field label="State / Province" value={hqStateName} />
                    <Field label="City" value={s1.city} />
                    <Field label="Operating Geographies" value={operatingGeoNames} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2 */}
            {s2 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Primary Contact</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Field label="Full Name" value={s2.full_name} />
                    <Field label="Designation" value={s2.designation} />
                    <Field label="Email" value={s2.email} />
                    <Field label="Phone" value={`${s2.phone_country_code} ${s2.phone}`} />
                    <Field label="Department" value={s2.department} />
                    <Field label="Timezone" value={s2.timezone} />
                    <Field label="Preferred Language" value={preferredLanguageName} />
                    <Field label="Email Verified" value={s2.email_verified} />
                    <Field label="Admin Designation" value={s2.admin_designation === 'separate' ? 'Separate Admin' : 'Self (Registering User)'} />
                  </div>
                  {s2.admin_designation === 'separate' && s2.separate_admin && (
                    <>
                      <Separator className="my-4" />
                      <p className="text-xs font-medium text-muted-foreground mb-3">Designated Administrator</p>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Field label="Admin Name" value={s2.separate_admin.name} />
                        <Field label="Admin Email" value={s2.separate_admin.email} />
                        <Field label="Admin Phone" value={s2.separate_admin.phone ? `${s2.separate_admin.phone_country_code ?? ''} ${s2.separate_admin.phone}` : undefined} />
                        <Field label="Working Location" value={s2.separate_admin.working_location} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3 */}
            {s3 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Compliance & Export Control</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Field label="Tax ID" value={s3.tax_id} />
                    <Field label="Tax ID Label" value={s3.tax_id_label} />
                    <Field label="Export Control Status" value={exportControlName} />
                    <Field label="ITAR Restricted" value={s3.is_itar_restricted} />
                    <Field label="Data Residency" value={dataResidencyName} />
                    <Field label="NDA Preference" value={s3.nda_preference ? NDA_LABELS[s3.nda_preference] ?? s3.nda_preference : undefined} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4 — Plan Selection */}
            {s4 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Plan Selection</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Field label="Subscription Tier" value={selectedTier?.name} />
                    <Field label="Billing Cycle" value={selectedCycle?.name} />
                    <Field label="Engagement Model" value={engModelName} />
                    <Field label="Membership Tier" value={selectedMembership?.name} />
                    <Field label="Est. Challenges / Month" value={s4.estimated_challenges_per_month} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 — Billing */}
            {s5 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Billing</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Field label="Billing Entity" value={s5.billing_entity_name} />
                    <Field label="Billing Email" value={s5.billing_email} />
                    <Field label="Payment Method" value={PAYMENT_LABELS[s5.payment_method] ?? s5.payment_method} />
                    <Field label="Internal Department" value={s5.is_internal_department} />
                    <Field label="Address" value={[s5.billing_address_line1, s5.billing_address_line2].filter(Boolean).join(', ')} />
                    <Field label="City" value={s5.billing_city} />
                    <Field label="State / Province" value={billingStateName} />
                    <Field label="Country" value={billingCountryName} />
                    <Field label="Postal Code" value={s5.billing_postal_code} />
                    <Field label="PO Number" value={s5.po_number} />
                    <Field label="Tax ID" value={s5.tax_id} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Uploaded Documents */}
            {orgDocuments && orgDocuments.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileIcon className="h-4 w-4 text-primary" /> Uploaded Documents</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orgDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                              {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant={VERIFICATION_STATUS_VARIANT[doc.verification_status] ?? 'outline'} className="shrink-0 ml-2">
                          {doc.verification_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT — Order Summary */}
          <div className="space-y-6">
            {s4 && (
              <PreviewOrderSummary
                tierName={selectedTier?.name ?? 'N/A'}
                cycleName={selectedCycle?.name ?? 'N/A'}
                cycleMonths={selectedCycle?.months ?? 1}
                membershipName={selectedMembership?.name}
                currencySymbol={currencySymbol}
                baseMonthly={baseMonthly}
                cycleDiscount={cycleDiscount}
                subsidizedPct={subsidizedPct}
                effectiveMonthly={effectiveMonthly}
                membershipFee={membershipFee}
                dueToday={dueToday}
                isInternalDept={isInternalDept}
              />
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button onClick={handleGoToLogin} size="lg" className="gap-2 w-full">
                <LogIn className="h-4 w-4" /> Go to Login
              </Button>
              <Button variant="outline" size="lg" className="gap-2 w-full" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Summary
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">A confirmation email has been sent to your registered email address.</p>
        </div>
      </footer>
    </div>
  );
}
