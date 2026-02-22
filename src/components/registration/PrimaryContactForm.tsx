/**
 * Primary Contact Form (REG-002)
 * 
 * Step 2 of the Seeker Registration Wizard.
 * Captures contact info, validates email domain, sends/verifies OTP.
 * 
 * Business Rules: BR-REG-005, BR-REG-006
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import {
  useBlockedDomains,
  useLanguages,
  useDepartments,
  useSendOtp,
  useVerifyOtp,
  useUpsertContact,
} from '@/hooks/queries/usePrimaryContactData';
import { useFunctionalAreas } from '@/hooks/queries/useFunctionalAreas';
import {
  primaryContactSchema,
  type PrimaryContactFormValues,
  extractDomain,
  isInstitutionalDomain,
} from '@/lib/validations/primaryContact';

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
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

import { EmailDomainBlocker } from './EmailDomainBlocker';
import { OtpVerification } from './OtpVerification';

// Common timezone list (supportedValuesOf may not exist in all TS targets)
const TIMEZONE_OPTIONS = (() => {
  try {
    return (Intl as any).supportedValuesOf('timeZone')
      .filter((tz: string) => !tz.startsWith('Etc/'))
      .sort() as string[];
  } catch {
    // Fallback for older environments
    return [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
      'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
      'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
    ];
  }
})();

export function PrimaryContactForm() {
  // ══════════════════════════════════════
  // SECTION 1: Context and navigation
  // ══════════════════════════════════════
  const { state, setStep2Data, setStep } = useRegistrationContext();
  const navigate = useNavigate();

  // ══════════════════════════════════════
  // SECTION 2: useState hooks
  // ══════════════════════════════════════
  // TODO: TEMP BYPASS — was: useState(() => !!state.step2?.email_verified)
  const [emailVerified, setEmailVerified] = useState(true);

  // ══════════════════════════════════════
  // SECTION 3: Form hook
  // ══════════════════════════════════════
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const form = useForm<PrimaryContactFormValues>({
    resolver: zodResolver(primaryContactSchema),
    defaultValues: {
      first_name: state.step2?.first_name ?? '',
      last_name: state.step2?.last_name ?? '',
      job_title: state.step2?.designation ?? '',
      email: state.step2?.email ?? '',
      phone_country_code: state.step2?.phone_country_code ?? state.localeInfo?.phone_code ?? '',
      phone_number: state.step2?.phone ?? '',
      department: state.step2?.department ?? '',
      department_functional_area_id: '',
      timezone: state.step2?.timezone ?? detectedTimezone ?? '',
      preferred_language_id: state.step2?.preferred_language_id ?? '',
      is_email_verified: true, // TODO: TEMP BYPASS — was conditional on state.step2?.email_verified
    },
  });

  const watchedEmail = form.watch('email');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: blockedDomains = [], isLoading: domainsLoading } = useBlockedDomains();
  const { data: languages, isLoading: languagesLoading } = useLanguages();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const { data: functionalAreas, isLoading: areasLoading } = useFunctionalAreas();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const upsertContact = useUpsertContact();

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  // Auto-populate phone country code from locale
  useEffect(() => {
    if (state.localeInfo?.phone_code && !form.getValues('phone_country_code')) {
      form.setValue('phone_country_code', state.localeInfo.phone_code);
    }
  }, [state.localeInfo, form]);

  // ══════════════════════════════════════
  // SECTION 6: Derived values
  // ══════════════════════════════════════
  const emailDomain = extractDomain(watchedEmail);
  const isEmailBlocked =
    emailDomain &&
    !isInstitutionalDomain(emailDomain) &&
    blockedDomains.some(
      (b) => emailDomain === b || emailDomain.endsWith(`.${b}`),
    );

  // ══════════════════════════════════════
  // SECTION 7: Event handlers
  // ══════════════════════════════════════
  const handleSendOtp = () => {
    if (!state.organizationId || !state.tenantId) return;
    sendOtp.mutate({
      email: watchedEmail,
      organization_id: state.organizationId,
      tenant_id: state.tenantId,
    });
  };

  const handleVerifyOtp = (code: string) => {
    if (!state.organizationId) return;
    verifyOtp.mutate(
      { email: watchedEmail, otp: code, organization_id: state.organizationId },
      {
        onSuccess: () => {
          setEmailVerified(true);
          form.setValue('is_email_verified', true as unknown as never);
        },
      },
    );
  };

  const handleSubmit = async (data: PrimaryContactFormValues) => {
    if (!emailVerified) {
      form.setError('email', { message: 'Please verify your email before continuing' });
      return;
    }
    if (isEmailBlocked) {
      form.setError('email', { message: 'Free email providers are not allowed' });
      return;
    }
    if (!state.organizationId || !state.tenantId) return;

    await upsertContact.mutateAsync({
      organization_id: state.organizationId,
      tenant_id: state.tenantId,
      first_name: data.first_name,
      last_name: data.last_name,
      job_title: data.job_title,
      email: data.email,
      phone_country_code: data.phone_country_code,
      phone_number: data.phone_number,
      department: data.department || undefined,
      timezone: data.timezone,
      preferred_language_id: data.preferred_language_id,
      email_verified: emailVerified,
    });

    setStep2Data({
      full_name: `${data.first_name} ${data.last_name}`,
      first_name: data.first_name,
      last_name: data.last_name,
      designation: data.job_title,
      email: data.email,
      phone: data.phone_number,
      phone_country_code: data.phone_country_code,
      department: data.department || undefined,
      timezone: data.timezone,
      preferred_language_id: data.preferred_language_id,
      email_verified: emailVerified,
    });

    setStep(3);
    navigate('/registration/compliance');
  };

  const handleBack = () => {
    setStep(1);
    navigate('/registration/organization-identity');
  };

  const isSubmitting = upsertContact.isPending;
  const isReturning = !!state.organizationId && !!state.step2;
  const { isDirty } = form.formState;
  const showContinueOnly = isReturning && !isDirty;

  const handleContinueOnly = () => {
    setStep(3);
    navigate('/registration/compliance');
  };

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="First name" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Last name" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Job Title */}
        <FormField
          control={form.control}
          name="job_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation / Job Title *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Chief Technology Officer" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Corporate Email *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="name@company.com"
                  className="text-base"
                  // TODO: TEMP BYPASS — was: disabled={emailVerified}
                />
              </FormControl>
              <EmailDomainBlocker
                email={watchedEmail}
                blockedDomains={blockedDomains}
                isLoading={domainsLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* OTP Verification */}
        {/* TODO: TEMP BYPASS — OTP section hidden */}
        {false && watchedEmail && !isEmailBlocked && (
          <OtpVerification
            email={watchedEmail}
            isVerified={emailVerified}
            isSending={sendOtp.isPending}
            isVerifying={verifyOtp.isPending}
            onSendOtp={handleSendOtp}
            onVerifyOtp={handleVerifyOtp}
          />
        )}

        {/* Phone */}
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <FormField
            control={form.control}
            name="phone_country_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+1" className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    placeholder="Phone number (digits only)"
                    className="text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Department */}
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              {departmentsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Department Functional Area */}
        <FormField
          control={form.control}
          name="department_functional_area_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Functional Area</FormLabel>
              {areasLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select functional area" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {functionalAreas?.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Timezone */}
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preferred Language */}
        <FormField
          control={form.control}
          name="preferred_language_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Language *</FormLabel>
              {languagesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {languages?.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.name}{lang.native_name ? ` (${lang.native_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {showContinueOnly ? (
            <Button type="button" onClick={handleContinueOnly}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}> {/* TODO: TEMP BYPASS — removed !emailVerified */}
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save & Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
