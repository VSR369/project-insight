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
import { Textarea } from '@/components/ui/textarea';
import { useCountries } from '@/hooks/queries/useCountries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ArrowRight, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  const [adminDesignation, setAdminDesignation] = useState<'self' | 'separate'>(
    state.step2?.admin_designation ?? 'self'
  );
  const [separateAdmin, setSeparateAdmin] = useState({
    name: state.step2?.separate_admin?.name ?? '',
    email: state.step2?.separate_admin?.email ?? '',
    phone: state.step2?.separate_admin?.phone ?? '',
    country_id: state.step2?.separate_admin?.country_id ?? state.step1?.hq_country_id ?? '',
    phone_country_code: state.step2?.separate_admin?.phone_country_code ?? state.localeInfo?.phone_code ?? '',
    working_location: state.step2?.separate_admin?.working_location ?? '',
  });

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
      password: '',
      confirm_password: '',
    },
  });

  const watchedEmail = form.watch('email');

  // ══════════════════════════════════════
  // SECTION 4: Query/Mutation hooks
  // ══════════════════════════════════════
  const { data: blockedDomains = [], isLoading: domainsLoading } = useBlockedDomains();
  const { data: countries } = useCountries();
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
    if (state.localeInfo?.phone_code) {
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
    if (!state.organizationId || !state.tenantId) {
      toast.error("Registration session not found. Please start from Step 1.");
      return;
    }

    try {
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
        password: data.password, // In-memory only, stripped from sessionStorage
        admin_designation: adminDesignation,
        separate_admin: adminDesignation === 'separate'
          ? {
              name: separateAdmin.name || undefined,
              email: separateAdmin.email || undefined,
              phone: separateAdmin.phone || undefined,
              country_id: separateAdmin.country_id || undefined,
              phone_country_code: separateAdmin.phone_country_code || undefined,
              working_location: separateAdmin.working_location || undefined,
            }
          : undefined,
      });

      setStep(3);
      navigate('/registration/compliance');
    } catch (error) {
      // Error toast is already handled by the mutation's onError callback
      // This catch prevents unhandled promise rejection / white screen
    }
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

        {/* Admin Designation */}
        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Organization Admin Designation
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Will you be the Seeking Org Admin, or will it be a separate person?
              </p>
            </div>
            <RadioGroup
              value={adminDesignation}
              onValueChange={(v) => setAdminDesignation(v as 'self' | 'separate')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="admin-self" />
                <Label htmlFor="admin-self" className="cursor-pointer text-sm">
                  Yes, I will be the Admin
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="separate" id="admin-separate" />
                <Label htmlFor="admin-separate" className="cursor-pointer text-sm">
                  No, a separate person will be the Admin
                </Label>
              </div>
            </RadioGroup>

            {adminDesignation === 'separate' && (
              <div className="space-y-3 pt-2 pl-6 border-l-2 border-primary/20">
                <p className="text-xs text-muted-foreground">
                  Separate Admin Details (Optional) — You can provide these later from Settings.
                </p>
                <Input
                  placeholder="Full Name"
                  className="text-base"
                  value={separateAdmin.name}
                  onChange={(e) => setSeparateAdmin((p) => ({ ...p, name: e.target.value }))}
                />
                <Input
                  placeholder="Email address"
                  type="email"
                  className="text-base"
                  value={separateAdmin.email}
                  onChange={(e) => setSeparateAdmin((p) => ({ ...p, email: e.target.value }))}
                />

                {/* Country selector for separate admin */}
                <div>
                  <Label className="text-sm mb-1.5 block">Country</Label>
                  <Select
                    value={separateAdmin.country_id}
                    onValueChange={(countryId) => {
                      const selected = countries?.find((c) => c.id === countryId);
                      setSeparateAdmin((p) => ({
                        ...p,
                        country_id: countryId,
                        phone_country_code: selected?.phone_code ?? p.phone_country_code,
                      }));
                    }}
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone with country code */}
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">Code</Label>
                    <Input
                      value={separateAdmin.phone_country_code}
                      readOnly
                      className="text-base bg-muted"
                      placeholder="+1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Phone Number</Label>
                    <Input
                      placeholder="Phone number"
                      type="tel"
                      className="text-base"
                      value={separateAdmin.phone}
                      onChange={(e) => setSeparateAdmin((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Working Location / Address */}
                <div>
                  <Label className="text-sm mb-1.5 block">Working Location / Address</Label>
                  <Textarea
                    placeholder="Optional — office address or working location"
                    className="text-base"
                    rows={2}
                    value={separateAdmin.working_location}
                    onChange={(e) => setSeparateAdmin((p) => ({ ...p, working_location: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Password */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Create Your Account Password</h3>
              <p className="text-xs text-muted-foreground mt-1">
                This will be used to log in after registration is complete.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Min 8 chars, mixed case, number, symbol" className="text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Re-enter password" className="text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

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
