import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WizardLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useCountries } from '@/hooks/queries/useCountries';
import { useCurrentProvider, useUpdateProviderBasicProfile } from '@/hooks/queries/useProvider';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useEnrollmentCanModifyField, useEnrollmentIsTerminal } from '@/hooks/queries/useEnrollmentExpertise';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, GraduationCap, Factory, Building2 } from 'lucide-react';
import { toast } from 'sonner';

// India country code for PIN validation
const INDIA_COUNTRY_CODE = 'IN';

// Registration form schema - NO industry field (industry is selected via Dashboard)
const registrationSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be 50 characters or less')
    .trim(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .trim(),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(250, 'Address must be 250 characters or less')
    .trim(),
  pinCode: z.string().trim(),
  countryId: z.string().min(1, 'Country is required'),
}).superRefine((data, ctx) => {
  if (data.pinCode && data.pinCode.length > 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pin code must be 12 characters or less',
      path: ['pinCode'],
    });
  }
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

function RegistrationContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { activeEnrollment, activeEnrollmentId } = useEnrollmentContext();
  const updateProfile = useUpdateProviderBasicProfile();
  
  const [activeTab, setActiveTab] = useState<'experienced' | 'student'>('experienced');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

  // Redirect add-industry mode to Dashboard
  const isAddIndustryMode = searchParams.get('mode') === 'add-industry';
  useEffect(() => {
    if (isAddIndustryMode) {
      toast.info('Please use Dashboard to add new industries.');
      navigate('/dashboard', { replace: true });
    }
  }, [isAddIndustryMode, navigate]);

  // CRITICAL: Use ENROLLMENT-scoped lifecycle validation
  // Only apply lock logic if enrollment exists - no enrollment = new user, always editable
  const hasEnrollment = !!activeEnrollmentId;
  const contentCheck = useEnrollmentCanModifyField(activeEnrollmentId ?? undefined, 'content');
  const terminalState = useEnrollmentIsTerminal(activeEnrollmentId ?? undefined);
  const isTerminal = hasEnrollment && terminalState.isTerminal;
  const isLocked = hasEnrollment && (!contentCheck.allowed || isTerminal);

  // Registration form
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      address: '',
      pinCode: '',
      countryId: '',
    },
  });

  // Pre-fill registration form from existing provider data
  useEffect(() => {
    if (provider) {
      form.reset({
        firstName: provider.first_name || '',
        lastName: provider.last_name || '',
        address: provider.address || '',
        pinCode: provider.pin_code || '',
        countryId: provider.country_id || '',
      });

      if (provider.country_id && countries) {
        const country = countries.find(c => c.id === provider.country_id);
        if (country) {
          setSelectedCountryCode(country.code);
        }
      }
    }
  }, [provider, countries, form]);

  const handleCountryChange = (countryId: string) => {
    form.setValue('countryId', countryId);
    const country = countries?.find(c => c.id === countryId);
    setSelectedCountryCode(country?.code || '');
    form.clearErrors('pinCode');
  };

  const validatePinCode = (value: string): string | true => {
    if (selectedCountryCode === INDIA_COUNTRY_CODE) {
      if (!value || value.length === 0) {
        return 'Pin code is required for India';
      }
      if (!/^[1-9][0-9]{5}$/.test(value)) {
        return 'Indian pin code must be 6 digits starting with 1-9';
      }
    } else if (value && value.length > 12) {
      return 'Pin code must be 12 characters or less';
    }
    return true;
  };

  // Handle Registration submission
  const handleContinue = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();
    
    const pinValidation = validatePinCode(data.pinCode);
    if (pinValidation !== true) {
      form.setError('pinCode', { message: pinValidation });
      return;
    }

    if (!provider?.id) {
      toast.error('Provider profile not found. Please try again.');
      return;
    }

    // Get current industry from enrollment or provider
    const industrySegmentId = activeEnrollment?.industry_segment_id || provider.industry_segment_id;
    if (!industrySegmentId) {
      toast.error('No industry selected. Please select an industry from Dashboard.');
      navigate('/dashboard');
      return;
    }

    try {
      const result = await updateProfile.mutateAsync({
        providerId: provider.id,
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          address: data.address,
          pinCode: data.pinCode,
          countryId: data.countryId,
          industrySegmentId: industrySegmentId,
          isStudent: activeTab === 'student',
        },
      });

      if (result.success) {
        // Navigate to participation mode
        navigate('/enroll/participation-mode');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleStudentTab = () => {
    setActiveTab('student');
    toast.info('Student registration coming soon');
  };

  const isLoading = countriesLoading || providerLoading;

  if (isLoading) {
    return (
      <WizardLayout currentStep={1} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // Render normal registration form (global profile, no industry selection)
  // Step 1: Back goes to Dashboard (via default handler), Continue validates and navigates
  return (
    <WizardLayout
      currentStep={1}
      onContinue={handleContinue}
      isSubmitting={updateProfile.isPending}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Solution Provider Registration
          </h1>
          <p className="text-muted-foreground mt-1">
            Logged in as: {user?.email}
          </p>
        </div>

        {/* Lock Banners - only show when enrollment exists and is locked */}
        {isLocked && isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Registration details cannot be modified."
          />
        )}
        
        {isLocked && !isTerminal && contentCheck.reason && (
          <LockedFieldBanner 
            lockLevel="content"
            reason={contentCheck.reason}
          />
        )}

        {/* Current Industry Indicator */}
        {activeEnrollment && (
          <Alert className="bg-primary/5 border-primary/20">
            <Factory className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span>Enrolling in:</span>
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" />
                {activeEnrollment.industry_segment?.name}
              </Badge>
              <span className="text-xs text-muted-foreground">
                (Change industry from Dashboard)
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="experienced" 
              onClick={() => setActiveTab('experienced')}
              className="gap-2"
              disabled={isLocked}
            >
              <User className="h-4 w-4" />
              Experienced Professional
            </TabsTrigger>
            <TabsTrigger 
              value="student" 
              onClick={handleStudentTab}
              className="gap-2"
              disabled={isLocked}
            >
              <GraduationCap className="h-4 w-4" />
              Students, Fresh Grads
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Profile</CardTitle>
            <CardDescription>
              Enter your basic professional details to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter first name" 
                            {...field} 
                            disabled={isLocked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter last name" 
                            {...field} 
                            disabled={isLocked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your full address" 
                          className="min-h-[80px]"
                          {...field} 
                          disabled={isLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="countryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={handleCountryChange}
                          disabled={isLocked}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries?.map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.name}
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
                    name="pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Pin Code {selectedCountryCode === INDIA_COUNTRY_CODE ? '*' : ''}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={
                              selectedCountryCode === INDIA_COUNTRY_CODE 
                                ? "6-digit PIN code" 
                                : "Enter pin/postal code"
                            } 
                            {...field} 
                            disabled={isLocked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </WizardLayout>
  );
}

export default function EnrollRegistration() {
  return (
    <FeatureErrorBoundary featureName="Registration">
      <RegistrationContent />
    </FeatureErrorBoundary>
  );
}
