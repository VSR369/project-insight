import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WizardLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useCountries } from '@/hooks/queries/useCountries';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useCurrentProvider, useUpdateProviderBasicProfile } from '@/hooks/queries/useProvider';
import { useProviderEnrollments, useCreateEnrollment } from '@/hooks/queries/useProviderEnrollments';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useCanModifyField, useIsTerminalState, useCascadeImpact } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner, CascadeWarningDialog } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, GraduationCap, Factory, Building2, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

const addIndustrySchema = z.object({
  industrySegmentId: z.string().min(1, 'Industry Segment is required'),
  setAsPrimary: z.boolean().default(false),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;
type AddIndustryFormData = z.infer<typeof addIndustrySchema>;

function RegistrationContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: industrySegments, isLoading: segmentsLoading } = useIndustrySegments();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  const { setActiveEnrollment } = useEnrollmentContext();
  const updateProfile = useUpdateProviderBasicProfile();
  const createEnrollment = useCreateEnrollment();
  
  const [activeTab, setActiveTab] = useState<'experienced' | 'student'>('experienced');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

  // Determine if we're in "Add Industry" mode
  const isAddIndustryMode = searchParams.get('mode') === 'add-industry';
  const hasExistingEnrollments = enrollments.length > 0;
  const isExistingProvider = provider?.onboarding_status === 'completed' || hasExistingEnrollments;

  // Get already enrolled industry IDs
  const enrolledIndustryIds = useMemo(() => {
    return new Set(enrollments.map(e => e.industry_segment_id));
  }, [enrollments]);

  // Filter available industries (exclude already enrolled ones in add-industry mode)
  const availableIndustries = useMemo(() => {
    if (!industrySegments) return [];
    if (isAddIndustryMode) {
      return industrySegments.filter(s => !enrolledIndustryIds.has(s.id));
    }
    return industrySegments;
  }, [industrySegments, isAddIndustryMode, enrolledIndustryIds]);

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

  // Registration form
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

  // Add Industry form
  const addIndustryForm = useForm<AddIndustryFormData>({
    resolver: zodResolver(addIndustrySchema),
    defaultValues: {
      industrySegmentId: '',
      setAsPrimary: false,
    },
  });

  // Pre-fill registration form from existing provider data
  useEffect(() => {
    if (provider && !isAddIndustryMode) {
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
  }, [provider, countries, form, isAddIndustryMode]);

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

  // Handle Add Industry submission
  const handleAddIndustry = async () => {
    const isValid = await addIndustryForm.trigger();
    if (!isValid) return;

    const data = addIndustryForm.getValues();

    if (!provider?.id) {
      toast.error('Provider profile not found. Please try again.');
      return;
    }

    // Check if already enrolled in this industry
    if (enrolledIndustryIds.has(data.industrySegmentId)) {
      toast.error('You are already enrolled in this industry.');
      return;
    }

    try {
      const newEnrollment = await createEnrollment.mutateAsync({
        providerId: provider.id,
        industrySegmentId: data.industrySegmentId,
        isPrimary: data.setAsPrimary,
      });

      // Switch to the new enrollment and navigate to expertise selection
      setActiveEnrollment(newEnrollment.id);
      toast.success(`Enrolled in ${newEnrollment.industry_segment?.name || 'new industry'} successfully!`);
      navigate('/enroll/expertise');
    } catch {
      // Error handled by mutation
    }
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

  const isLoading = countriesLoading || segmentsLoading || providerLoading || enrollmentsLoading;
  // Only lock if provider exists AND lifecycle doesn't allow configuration changes
  // New users (no provider) should be able to edit freely
  const isIndustryLocked = !!provider && !configurationCheck.allowed;

  if (isLoading) {
    return (
      <WizardLayout currentStep={1} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // Render Add Industry Mode
  if (isAddIndustryMode && isExistingProvider) {
    return (
      <WizardLayout
        currentStep={1}
        onContinue={handleAddIndustry}
        isSubmitting={createEnrollment.isPending}
        continueLabel="Add Industry"
        onBack={() => navigate('/dashboard')}
      >
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="p-0 h-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Factory className="h-8 w-8 text-primary" />
              Add New Industry
            </h1>
            <p className="text-muted-foreground mt-1">
              Expand your professional profile by enrolling in a new industry segment.
            </p>
          </div>

          {/* Current Enrollments Summary */}
          {enrollments.length > 0 && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Current Industries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {enrollments.map((enrollment) => (
                    <Badge 
                      key={enrollment.id} 
                      variant={enrollment.is_primary ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      <Building2 className="h-3 w-3" />
                      {enrollment.industry_segment?.name}
                      {enrollment.is_primary && (
                        <span className="text-xs opacity-75">(Primary)</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Industry Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Select New Industry
              </CardTitle>
              <CardDescription>
                Choose an industry segment to add to your profile. You can add multiple industries
                and manage them independently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableIndustries.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    You are already enrolled in all available industry segments.
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...addIndustryForm}>
                  <form className="space-y-6">
                    <FormField
                      control={addIndustryForm.control}
                      name="industrySegmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry Segment *</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry segment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableIndustries.map((segment) => (
                                <SelectItem key={segment.id} value={segment.id}>
                                  {segment.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This will create a new enrollment with its own expertise level, 
                            proof points, and assessment progress.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addIndustryForm.control}
                      name="setAsPrimary"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-input"
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel className="font-medium">Set as Primary Industry</FormLabel>
                            <FormDescription>
                              Your primary industry is displayed first in your profile and used as the default.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </WizardLayout>
    );
  }

  // Render normal registration form
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

        {/* Existing Provider - Option to Add Industry */}
        {isExistingProvider && !isTerminal && (
          <Alert className="bg-primary/5 border-primary/20">
            <Factory className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Want to expand into a new industry? You can add additional industry enrollments.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/enroll/registration?mode=add-industry')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Industry
              </Button>
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
