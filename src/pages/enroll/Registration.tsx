import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WizardLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useCountries } from '@/hooks/queries/useCountries';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useCurrentProvider, useUpdateProviderBasicProfile } from '@/hooks/queries/useProvider';
import { useCanModifyField, useIsTerminalState, useCascadeImpact } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner, CascadeWarningDialog } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

// India country code for PIN validation
const INDIA_COUNTRY_CODE = 'IN';

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
  industrySegmentId: z.string().min(1, 'Industry Segment is required'),
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
  const { user } = useAuth();
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: industrySegments, isLoading: segmentsLoading } = useIndustrySegments();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const updateProfile = useUpdateProviderBasicProfile();
  const [activeTab, setActiveTab] = useState<'experienced' | 'student'>('experienced');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

  // Lifecycle validation
  const configurationCheck = useCanModifyField('configuration');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const { impact: industryCascadeImpact } = useCascadeImpact('industry_segment_id');
  
  // Cascade warning state
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [pendingCascadeData, setPendingCascadeData] = useState<{
    formData: RegistrationFormData;
    impact: { specialtyProofPointsCount: number; proficiencyAreasCount: number; specialitiesCount: number; generalProofPointsCount: number };
  } | null>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      address: '',
      pinCode: '',
      countryId: '',
      industrySegmentId: '',
    },
  });

  // Pre-fill form from existing provider data
  useEffect(() => {
    if (provider) {
      form.reset({
        firstName: provider.first_name || '',
        lastName: provider.last_name || '',
        address: provider.address || '',
        pinCode: provider.pin_code || '',
        countryId: provider.country_id || '',
        industrySegmentId: provider.industry_segment_id || '',
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

    try {
      const result = await updateProfile.mutateAsync({
        providerId: provider.id,
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          address: data.address,
          pinCode: data.pinCode,
          countryId: data.countryId,
          industrySegmentId: data.industrySegmentId,
          isStudent: activeTab === 'student',
        },
      });

      // Check if cascade confirmation is required
      if (!result.success && result.requiresConfirmation && result.cascadeImpact) {
        setPendingCascadeData({
          formData: data,
          impact: {
            ...result.cascadeImpact,
            generalProofPointsCount: 0, // General proof points are preserved
          },
        });
        setCascadeDialogOpen(true);
        return;
      }

      if (result.success) {
        navigate('/enroll/welcome');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleConfirmCascade = async () => {
    if (!pendingCascadeData || !provider?.id) return;

    try {
      const result = await updateProfile.mutateAsync({
        providerId: provider.id,
        data: {
          firstName: pendingCascadeData.formData.firstName,
          lastName: pendingCascadeData.formData.lastName,
          address: pendingCascadeData.formData.address,
          pinCode: pendingCascadeData.formData.pinCode,
          countryId: pendingCascadeData.formData.countryId,
          industrySegmentId: pendingCascadeData.formData.industrySegmentId,
          isStudent: activeTab === 'student',
        },
        confirmCascade: true,
      });

      if (result.success) {
        setCascadeDialogOpen(false);
        setPendingCascadeData(null);
        navigate('/enroll/welcome');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelCascade = () => {
    setCascadeDialogOpen(false);
    setPendingCascadeData(null);
  };

  const handleStudentTab = () => {
    setActiveTab('student');
    toast.info('Student registration coming soon');
  };

  const isLoading = countriesLoading || segmentsLoading || providerLoading;
  const isIndustryLocked = !configurationCheck.allowed;

  if (isLoading) {
    return (
      <WizardLayout currentStep={1} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      currentStep={1}
      onContinue={handleContinue}
      isSubmitting={updateProfile.isPending}
      hideBackButton
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

        {/* Terminal State Banner */}
        {isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Registration details cannot be modified."
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="experienced" 
              onClick={() => setActiveTab('experienced')}
              className="gap-2"
              disabled={isTerminal}
            >
              <User className="h-4 w-4" />
              Experienced Professional
            </TabsTrigger>
            <TabsTrigger 
              value="student" 
              onClick={handleStudentTab}
              className="gap-2"
              disabled={isTerminal}
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
                            disabled={isTerminal}
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
                            disabled={isTerminal}
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
                          disabled={isTerminal}
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
                          disabled={isTerminal}
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
                            disabled={isTerminal}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Industry Segment with Lock Banner */}
                {isIndustryLocked && !isTerminal && (
                  <LockedFieldBanner 
                    lockLevel="configuration"
                    reason={configurationCheck.reason || undefined}
                  />
                )}

                <FormField
                  control={form.control}
                  name="industrySegmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Segment *</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isIndustryLocked || isTerminal}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry segment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industrySegments?.map((segment) => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Cascade Warning Dialog */}
      {industryCascadeImpact && (
        <CascadeWarningDialog
          open={cascadeDialogOpen}
          onOpenChange={setCascadeDialogOpen}
          cascadeType="industry_change"
          impact={industryCascadeImpact}
          impactSummary={{
            specialtyProofPointsCount: pendingCascadeData?.impact.specialtyProofPointsCount || 0,
            generalProofPointsCount: pendingCascadeData?.impact.generalProofPointsCount || 0,
            proficiencyAreasCount: pendingCascadeData?.impact.proficiencyAreasCount || 0,
            specialitiesCount: pendingCascadeData?.impact.specialitiesCount || 0,
          }}
          onConfirm={handleConfirmCascade}
          onCancel={handleCancelCascade}
          isProcessing={updateProfile.isPending}
        />
      )}
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
