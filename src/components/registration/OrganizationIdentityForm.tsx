/**
 * Organization Identity Form (REG-001)
 * 
 * Complete form for Step 1 of the Seeker Registration Wizard.
 * Implements 14 fields with Zod validation, business rule hooks,
 * duplicate detection, and conditional verification uploads.
 * 
 * Business Rules: BR-REG-001, BR-REG-002, BR-REG-004, BR-REG-007,
 *                 BR-CTY-001, BR-SUB-001/002, BR-TCP-001
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import { useOrganizationTypes } from '@/hooks/queries/useMasterData';
import {
  useStatesForCountry,
  useOrgTypeRules,
  useSubsidizedPricing,
  useCountryLocale,
  useCheckDuplicateOrg,
  useCreateOrganization,
  useUpdateOrganization,
  useTierCountryPricing,
} from '@/hooks/queries/useRegistrationData';
import { isStartupEligible } from '@/services/registrationService';
import {
  organizationIdentitySchema,
  type OrganizationIdentityFormValues,
} from '@/lib/validations/organizationIdentity';
import { COMPANY_SIZE_OPTIONS, ANNUAL_REVENUE_OPTIONS, FILE_LIMITS } from '@/config/registration';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

import { CountrySelector } from './CountrySelector';
import { IndustryTagSelector } from './IndustryTagSelector';
import { GeographyTagSelector } from './GeographyTagSelector';
import { VerificationDocuments } from './VerificationDocuments';
import { DuplicateOrgModal } from './DuplicateOrgModal';
import { OrgTypeInfoBanner } from './OrgTypeInfoBanner';
import { FileUploadZone } from '@/components/shared/FileUploadZone';

export function OrganizationIdentityForm() {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateOrgName, setDuplicateOrgName] = useState<string>();
  const [verificationFiles, setVerificationFiles] = useState<File[]>([]);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [profileDocument, setProfileDocument] = useState<File | null>(null);

  // ══════════════════════════════════════
  // SECTION 2: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep1Data, setOrgId, setLocale, setOrgTypeFlags, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 3: Form hook
  // ══════════════════════════════════════
  const form = useForm<OrganizationIdentityFormValues>({
    resolver: zodResolver(organizationIdentitySchema),
    defaultValues: {
      legal_entity_name: state.step1?.legal_entity_name ?? '',
      trade_brand_name: state.step1?.trade_brand_name ?? '',
      organization_type_id: state.step1?.organization_type_id ?? '',
      industry_ids: state.step1?.industry_ids ?? [],
      company_size_range: state.step1?.company_size_range ?? undefined,
      annual_revenue_range: state.step1?.annual_revenue_range ?? undefined,
      year_founded: state.step1?.year_founded ?? (undefined as unknown as number),
      hq_country_id: state.step1?.hq_country_id ?? '',
      state_province_id: state.step1?.state_province_id ?? '',
      city: state.step1?.city ?? '',
      operating_geography_ids: state.step1?.operating_geography_ids ?? [],
    },
  });

  const watchedCountryId = form.watch('hq_country_id');
  const watchedOrgTypeId = form.watch('organization_type_id');
  const watchedYearFounded = form.watch('year_founded');
  const watchedSizeRange = form.watch('company_size_range');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: orgTypes, isLoading: orgTypesLoading } = useOrganizationTypes();
  const { data: states, isLoading: statesLoading } = useStatesForCountry(watchedCountryId);
  const { data: orgTypeFlags } = useOrgTypeRules(watchedOrgTypeId);
  const { data: subsidizedPricing } = useSubsidizedPricing(watchedOrgTypeId);
  const { data: countryLocale } = useCountryLocale(watchedCountryId);
  const duplicateCheck = useCheckDuplicateOrg();
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const { data: countryPricingSupported } = useTierCountryPricing(watchedCountryId);

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  // Track initial country to avoid wiping state/province on mount
  const initialCountryRef = useRef(state.step1?.hq_country_id ?? '');

  // Reset state only when user actively changes country, not on initial mount
  useEffect(() => {
    if (initialCountryRef.current && watchedCountryId === initialCountryRef.current) {
      initialCountryRef.current = ''; // Allow future changes to reset
      return;
    }
    form.setValue('state_province_id', '');
  }, [watchedCountryId, form]);

  // Update context with locale info when country changes
  useEffect(() => {
    if (countryLocale) {
      setLocale({
        currency_code: countryLocale.currency_code ?? 'USD',
        currency_symbol: countryLocale.currency_symbol ?? '$',
        phone_code: countryLocale.phone_code ?? '',
        date_format: countryLocale.date_format ?? 'MM/DD/YYYY',
        number_format: countryLocale.number_format ?? '1,234.56',
        address_format_template: countryLocale.address_format_template as Record<string, unknown> | null,
      });
    }
  }, [countryLocale, setLocale]);

  // Update context with org type flags
  useEffect(() => {
    if (orgTypeFlags) {
      const flags = {
        ...orgTypeFlags,
        subsidized_discount_pct: subsidizedPricing?.discount_pct,
      };
      // Check startup eligibility
      if (orgTypeFlags.startup_eligible && watchedYearFounded && watchedSizeRange) {
        flags.startup_eligible = isStartupEligible(watchedYearFounded, watchedSizeRange);
      }
      setOrgTypeFlags(flags);
    }
  }, [orgTypeFlags, subsidizedPricing, watchedYearFounded, watchedSizeRange, setOrgTypeFlags]);

  // ══════════════════════════════════════
  // SECTION 6: Derived values
  // ══════════════════════════════════════
  const showVerification = orgTypeFlags?.verification_required ?? false;
  const selectedOrgType = orgTypes?.find((t) => t.id === watchedOrgTypeId);
  // Country pricing warning bypassed for testing — all countries accepted
  const showCountryWarning = false;

  // ══════════════════════════════════════
  // SECTION 7: Event handlers
  // ══════════════════════════════════════
  const handleSubmit = async (data: OrganizationIdentityFormValues) => {
    const isUpdate = !!state.organizationId;

    // BR-REG-007: Duplicate check — skip when updating existing org
    if (!isUpdate && !skipDuplicateCheck) {
      const result = await duplicateCheck.mutateAsync({
        legalEntityName: data.legal_entity_name,
        hqCountryId: data.hq_country_id,
      });
      if (result.exists) {
        setDuplicateOrgName(result.orgName);
        setShowDuplicateModal(true);
        return;
      }
    }

    const payload = {
      legal_entity_name: data.legal_entity_name,
      trade_brand_name: data.trade_brand_name || undefined,
      organization_type_id: data.organization_type_id,
      employee_count_range: data.company_size_range,
      annual_revenue_range: data.annual_revenue_range,
      founding_year: data.year_founded,
      hq_country_id: data.hq_country_id,
      hq_state_province_id: data.state_province_id,
      hq_city: data.city,
      industry_ids: data.industry_ids,
      operating_geography_ids: data.operating_geography_ids,
      subsidized_discount_pct: subsidizedPricing?.discount_pct,
      locale: {
        currency_code: countryLocale?.currency_code,
        currency_symbol: countryLocale?.currency_symbol,
        date_format: countryLocale?.date_format,
        number_format: countryLocale?.number_format,
        address_format_template: countryLocale?.address_format_template as Record<string, unknown> | null,
      },
    };

    if (isUpdate) {
      // UPDATE existing organization
      await updateOrg.mutateAsync({
        id: state.organizationId!,
        tenantId: state.tenantId!,
        ...payload,
      });
    } else {
      // CREATE new organization
      const result = await createOrg.mutateAsync(payload);
      setOrgId(result.organizationId, result.tenantId);
    }
    setStep1Data({
      legal_entity_name: data.legal_entity_name,
      trade_brand_name: data.trade_brand_name || undefined,
      organization_type_id: data.organization_type_id,
      industry_ids: data.industry_ids,
      company_size_range: data.company_size_range,
      annual_revenue_range: data.annual_revenue_range,
      year_founded: data.year_founded,
      hq_country_id: data.hq_country_id,
      state_province_id: data.state_province_id,
      city: data.city,
      operating_geography_ids: data.operating_geography_ids,
      verification_documents: verificationFiles.length > 0 ? verificationFiles : undefined,
    });

    setStep(2);
    navigate('/registration/primary-contact');
  };

  const handleDuplicateProceed = () => {
    setShowDuplicateModal(false);
    setSkipDuplicateCheck(true);
    form.handleSubmit(handleSubmit)();
  };

  const isSubmitting = createOrg.isPending || updateOrg.isPending || duplicateCheck.isPending;
  const isReturning = !!state.organizationId;
  const { isDirty } = form.formState;
  const showContinueOnly = isReturning && !isDirty;

  const handleContinueOnly = () => {
    setStep(2);
    navigate('/registration/primary-contact');
  };

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Legal Entity Name */}
          <FormField
            control={form.control}
            name="legal_entity_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Entity Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Registered company name" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Trade/Brand Name */}
          <FormField
            control={form.control}
            name="trade_brand_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trade / Brand Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional — if different from legal name" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Organization Logo */}
          <div className="space-y-2">
            <FormLabel>Organization Logo</FormLabel>
            <FileUploadZone
              config={FILE_LIMITS.LOGO}
              value={logoFile}
              onChange={setLogoFile}
            />
          </div>

          {/* Organization Profile Document */}
          <div className="space-y-2">
            <FormLabel>Organization Profile Document</FormLabel>
            <FileUploadZone
              config={FILE_LIMITS.PROFILE_DOCUMENT}
              value={profileDocument}
              onChange={setProfileDocument}
            />
          </div>

          {/* Organization Type */}
          <FormField
            control={form.control}
            name="organization_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Type *</FormLabel>
                {orgTypesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select organization type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orgTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Org Type Info Banner */}
          {orgTypeFlags && <OrgTypeInfoBanner flags={orgTypeFlags} />}

          {/* Industries */}
          <FormField
            control={form.control}
            name="industry_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industries *</FormLabel>
                <FormControl>
                  <IndustryTagSelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Company Size & Revenue — side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="company_size_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Size *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select size range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMPANY_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annual_revenue_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Revenue *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select revenue range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ANNUAL_REVENUE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Year Founded */}
          <FormField
            control={form.control}
            name="year_founded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Founded *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="e.g. 2015"
                    className="text-base"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* HQ Country */}
          <FormField
            control={form.control}
            name="hq_country_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Headquarters Country *</FormLabel>
                <FormControl>
                  <CountrySelector
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select headquarters country"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* BR-TCP-001: Country Pricing Support Warning */}
          {showCountryWarning && (
            <Alert className="border-destructive/50 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm text-destructive">
                The selected country is not currently supported for tier pricing.
                Please contact support or select a different headquarters country.
              </AlertDescription>
            </Alert>
          )}

          {/* State/Province — dependent on country */}
          <FormField
            control={form.control}
            name="state_province_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State / Province *</FormLabel>
                {statesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!watchedCountryId}
                  >
                    <FormControl>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder={
                          !watchedCountryId
                            ? 'Select a country first'
                            : states && states.length === 0
                              ? 'No states available'
                              : 'Select state/province'
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {states?.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="City name" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Operating Geographies */}
          <FormField
            control={form.control}
            name="operating_geography_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operating Geographies *</FormLabel>
                <FormControl>
                  <GeographyTagSelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Verification Documents (conditional) */}
          {showVerification && (
            <VerificationDocuments
              files={verificationFiles}
              onFilesChange={setVerificationFiles}
              orgTypeName={selectedOrgType?.name}
              discountPct={subsidizedPricing?.discount_pct}
            />
          )}

          {/* Data Privacy Notice */}
          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              Your data is stored securely and used solely for platform operations.
              By proceeding, you agree to our{' '}
              <a href="/privacy" className="text-primary underline">Privacy Policy</a> and{' '}
              <a href="/terms" className="text-primary underline">Terms of Service</a>.
            </AlertDescription>
          </Alert>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/auth" className="text-primary font-medium underline">Sign in</a>
            </p>
            {showContinueOnly ? (
              <Button
                type="button"
                size="lg"
                onClick={handleContinueOnly}
                className="min-w-[180px]"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Continue'
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Duplicate Org Dialog */}
      <DuplicateOrgModal
        open={showDuplicateModal}
        onOpenChange={setShowDuplicateModal}
        existingOrgName={duplicateOrgName}
        onProceed={handleDuplicateProceed}
        onCancel={() => setShowDuplicateModal(false)}
      />
    </>
  );
}
