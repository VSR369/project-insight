import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useCountries } from '@/hooks/queries/useCountries';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useCurrentProvider, useUpdateProviderBasicProfile } from '@/hooks/queries/useProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Loader2, User, GraduationCap, LogOut } from 'lucide-react';
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
  // We'll check if India is selected based on country code stored in a ref
  // For now, validate basic pin code format
  if (data.pinCode && data.pinCode.length > 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pin code must be 12 characters or less',
      path: ['pinCode'],
    });
  }
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function Registration() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: industrySegments, isLoading: segmentsLoading } = useIndustrySegments();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const updateProfile = useUpdateProviderBasicProfile();
  const [activeTab, setActiveTab] = useState<'experienced' | 'student'>('experienced');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

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

      // Set country code for PIN validation
      if (provider.country_id && countries) {
        const country = countries.find(c => c.id === provider.country_id);
        if (country) {
          setSelectedCountryCode(country.code);
        }
      }
    }
  }, [provider, countries, form]);

  // Update country code when country changes
  const handleCountryChange = (countryId: string) => {
    form.setValue('countryId', countryId);
    const country = countries?.find(c => c.id === countryId);
    setSelectedCountryCode(country?.code || '');
    
    // Clear pin code error when country changes
    form.clearErrors('pinCode');
  };

  // Validate PIN code based on country
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

  const onSubmit = async (data: RegistrationFormData) => {
    // Additional PIN validation
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
      await updateProfile.mutateAsync({
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
      
      navigate('/profile/build/choose-mode');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleStudentTab = () => {
    setActiveTab('student');
    // TODO: Navigate to student registration page
    toast.info('Student registration coming soon');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isLoading = countriesLoading || segmentsLoading || providerLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Solution Provider Registration
            </h1>
            <p className="text-muted-foreground mt-1">
              Logged in as: {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="experienced" 
              onClick={() => setActiveTab('experienced')}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              Experienced Professional
            </TabsTrigger>
            <TabsTrigger 
              value="student" 
              onClick={handleStudentTab}
              className="gap-2"
            >
              <GraduationCap className="h-4 w-4" />
              Students, Fresh Grads, Not Experienced
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Step 1 of 6</span>
              <span>•</span>
              <span>Basic Profile</span>
            </div>
            <CardTitle>Experienced Professional Registration</CardTitle>
            <CardDescription>
              Enter your basic professional details to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
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
                          <Input placeholder="Enter last name" {...field} />
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="industrySegmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Segment *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
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

                {/* Actions */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="gap-2"
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
