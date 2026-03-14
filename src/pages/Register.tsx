import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, UserPlus, GraduationCap, Briefcase, ClipboardCheck, Shield, AlertCircle, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  registerSchema, 
  studentRegisterSchema, 
  reviewerRegisterSchema,
  adminRegisterSchema,
  RegisterFormData, 
  StudentRegisterFormData,
  ReviewerRegisterFormData,
  AdminRegisterFormData 
} from '@/lib/validations/auth';
import { useCountries } from '@/hooks/queries/useMasterData';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { getStoredInvitationData, clearStoredInvitationData, type InvitationData } from '@/hooks/queries/useValidateInvitation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';

type RoleTab = 'provider' | 'reviewer' | 'admin';
type ProviderSubTab = 'experienced' | 'student';

const ROLE_INFO = {
  provider: {
    icon: Briefcase,
    title: 'Solution Provider',
    description: 'Share your expertise and connect with organizations seeking innovative solutions',
    color: 'text-primary',
  },
  reviewer: {
    icon: ClipboardCheck,
    title: 'Panel Reviewer',
    description: 'Evaluate solution providers and conduct interviews (requires admin approval)',
    color: 'text-green-600',
  },
  admin: {
    icon: Shield,
    title: 'Platform Admin',
    description: 'Manage the platform, users, and system configuration (restricted access)',
    color: 'text-destructive',
  },
};

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Calcutta', label: 'India (IST)' },
  { value: 'America/New_York', label: 'US Eastern (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (AEST/AEDT)' },
];

export default function Register() {
  // ═══════════════════════════════════════════
  // SECTION 1: All useState hooks FIRST
  // ═══════════════════════════════════════════
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleTab>('provider');
  const [providerSubTab, setProviderSubTab] = useState<ProviderSubTab>('experienced');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  // ═══════════════════════════════════════════
  // SECTION 2: Context and custom hooks
  // ═══════════════════════════════════════════
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch master data
  const { data: countries } = useCountries();
  const { data: industrySegments } = useIndustrySegments();
  const { data: expertiseLevels } = useExpertiseLevels();

  // ═══════════════════════════════════════════
  // SECTION 3: Form hooks (React Hook Form)
  // ═══════════════════════════════════════════
  // Provider forms
  const experiencedForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      address: '',
      pinCode: '',
      countryId: '',
    },
  });

  const studentForm = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      address: '',
      pinCode: '',
      countryId: '',
      institution: '',
      graduationYear: new Date().getFullYear() + 1,
    },
  });

  // Reviewer form
  const reviewerForm = useForm<ReviewerRegisterFormData>({
    resolver: zodResolver(reviewerRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      industrySegmentIds: [],
      expertiseLevelIds: [],
      yearsExperience: undefined,
      timezone: 'Asia/Calcutta',
      whyJoinStatement: '',
    },
  });

  // Admin form
  const adminForm = useForm<AdminRegisterFormData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      accessCode: '',
    },
  });

  // ═══════════════════════════════════════════
  // SECTION 4: useEffect hooks
  // ═══════════════════════════════════════════
  // Check for invitation context from URL
  useEffect(() => {
    const isInvitation = searchParams.get('invitation') === 'true';
    if (isInvitation) {
      const stored = getStoredInvitationData();
      if (stored) {
        setInvitationData(stored);
        // Pre-fill form with invitation data
        experiencedForm.setValue('email', stored.email);
        if (stored.first_name) {
          experiencedForm.setValue('firstName', stored.first_name);
        }
        if (stored.last_name) {
          experiencedForm.setValue('lastName', stored.last_name);
        }
        // Force provider tab for invitations
        setActiveRole('provider');
      }
    }
  }, [searchParams, experiencedForm]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // ═══════════════════════════════════════════
  // SECTION 5: Conditional returns (AFTER ALL HOOKS)
  // ═══════════════════════════════════════════
  // Early return for logged in user (after useEffect handles navigation)
  if (user) {
    return null;
  }

  // Derived state
  const isVipInvitation = invitationData?.invitation_type === 'vip_expert';
  const hasInvitation = !!invitationData;

  // ═══════════════════════════════════════════
  // SECTION 6: Event handlers
  // ═══════════════════════════════════════════
  const onProviderSubmit = async (data: RegisterFormData | StudentRegisterFormData) => {
    setIsLoading(true);
    try {
      const metadata: Record<string, unknown> = {
        first_name: data.firstName,
        last_name: data.lastName,
        is_student: providerSubTab === 'student',
        role_type: 'provider',
        address: data.address || null,
        pin_code: data.pinCode || null,
        country_id: data.countryId || null,
      };

      // Add invitation context if present
      if (invitationData) {
        metadata.invitation_id = invitationData.id;
        if (invitationData.industry_segment_id) {
          metadata.industry_segment_id = invitationData.industry_segment_id;
        }
      }

      const { error } = await signUp(data.email, data.password, metadata);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('An account with this email already exists');
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      // Clear invitation data after successful signup
      if (invitationData) {
        clearStoredInvitationData();
      }
      
      toast.success('Account created! Please check your email to verify your account.');
      navigate('/login');
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), { operation: 'register_provider' });
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const onReviewerSubmit = async (data: ReviewerRegisterFormData) => {
    setIsLoading(true);
    try {
      // Call edge function to create user and panel_reviewers record
      const response = await supabase.functions.invoke("register-reviewer-application", {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          phone: data.phone || undefined,
          industrySegmentIds: data.industrySegmentIds,
          expertiseLevelIds: data.expertiseLevelIds,
          yearsExperience: data.yearsExperience || undefined,
          timezone: data.timezone,
          whyJoinStatement: data.whyJoinStatement,
        },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to submit application');
        return;
      }

      if (!response.data?.success) {
        toast.error(response.data?.error || 'Failed to submit application');
        return;
      }

      toast.success('Application submitted! Your reviewer application is pending admin approval.');
      navigate('/login');
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), { operation: 'register_reviewer' });
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const onAdminSubmit = async (data: AdminRegisterFormData) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('register-platform-admin', {
        body: {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          accessCode: data.accessCode,
        },
      });

      if (error) {
        toast.error(error.message || 'Registration failed');
        return;
      }

      if (!response?.success) {
        toast.error(response?.error || 'Registration failed');
        return;
      }

      toast.success('Admin account created successfully. You can now log in.');
      navigate('/login');
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), { operation: 'register_admin' });
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordFields = (form: ReturnType<typeof useForm<RegisterFormData>>) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <div className="relative">
              <FormControl>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm Password</FormLabel>
            <div className="relative">
              <FormControl>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderCommonFields = (form: ReturnType<typeof useForm<RegisterFormData>>) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="John" disabled={isLoading} {...field} />
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
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Doe" disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="you@example.com" autoComplete="email" disabled={isLoading} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {renderPasswordFields(form)}

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Your address" rows={2} disabled={isLoading} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="pinCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pin Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="123456" disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="countryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
      </div>
    </>
  );

  const renderStudentFields = (form: ReturnType<typeof useForm<StudentRegisterFormData>>) => (
    <>
      <FormField
        control={form.control}
        name="institution"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Institution Name</FormLabel>
            <FormControl>
              <Input placeholder="University / College name" disabled={isLoading} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="graduationYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Graduation Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2025"
                  disabled={isLoading}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

      </div>
    </>
  );

  const renderReviewerForm = () => (
    <Form {...reviewerForm}>
      <form onSubmit={reviewerForm.handleSubmit(onReviewerSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Reviewer applications require admin approval. You'll be notified by email once approved.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={reviewerForm.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={reviewerForm.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={reviewerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={reviewerForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {renderPasswordFields(reviewerForm as unknown as ReturnType<typeof useForm<RegisterFormData>>)}

          <FormField
            control={reviewerForm.control}
            name="industrySegmentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry Segments</FormLabel>
                <FormDescription>Select the industries you have expertise in</FormDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  {industrySegments?.map((segment) => (
                    <label
                      key={segment.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                        field.value?.includes(segment.id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={field.value?.includes(segment.id)}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, segment.id]);
                          } else {
                            field.onChange(current.filter((id) => id !== segment.id));
                          }
                        }}
                      />
                      <span className="text-sm">{segment.name}</span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={reviewerForm.control}
            name="expertiseLevelIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expertise Levels</FormLabel>
                <FormDescription>Select the levels you can evaluate</FormDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  {expertiseLevels?.map((level) => (
                    <label
                      key={level.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                        field.value?.includes(level.id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={field.value?.includes(level.id)}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, level.id]);
                          } else {
                            field.onChange(current.filter((id) => id !== level.id));
                          }
                        }}
                      />
                      <span className="text-sm">{level.name}</span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={reviewerForm.control}
              name="yearsExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10"
                      disabled={isLoading}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={reviewerForm.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={reviewerForm.control}
            name="whyJoinStatement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Why do you want to be a reviewer?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Share your motivation and what you can contribute as a panel reviewer..."
                    rows={4}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/500 characters (minimum 50)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Submit Application
          </Button>
        </CardFooter>
      </form>
    </Form>
  );

  const renderAdminForm = () => (
    <Form {...adminForm}>
      <form onSubmit={adminForm.handleSubmit(onAdminSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Admin registration is restricted. You must have a valid access code provided by an existing administrator.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={adminForm.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={adminForm.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={adminForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="admin@company.com" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {renderPasswordFields(adminForm as unknown as ReturnType<typeof useForm<RegisterFormData>>)}

          <FormField
            control={adminForm.control}
            name="accessCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Code</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Enter your access code" 
                    disabled={isLoading} 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Contact your organization's administrator for an access code
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Register as Admin
          </Button>
        </CardFooter>
      </form>
    </Form>
  );

  const currentRoleInfo = ROLE_INFO[activeRole];
  const RoleIcon = currentRoleInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 py-8">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">CogniBlend</h1>
          <p className="text-muted-foreground mt-2">Co-Innovation Platform</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">Join CogniBlend</CardTitle>
            <CardDescription className="text-center">
              Select your role to get started
            </CardDescription>
          </CardHeader>

          {/* Role Selection Tabs */}
          <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as RoleTab)} className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="provider" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Provider</span>
                </TabsTrigger>
                <TabsTrigger value="reviewer" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Reviewer</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Role Description */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <RoleIcon className={`h-5 w-5 ${currentRoleInfo.color}`} />
                <div>
                  <p className="font-medium text-sm">{currentRoleInfo.title}</p>
                  <p className="text-xs text-muted-foreground">{currentRoleInfo.description}</p>
                </div>
              </div>
            </div>

            {/* Provider Tab Content */}
            <TabsContent value="provider" className="mt-0">
              <div className="px-6">
                <Tabs value={providerSubTab} onValueChange={(v) => setProviderSubTab(v as ProviderSubTab)}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="experienced" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Experienced
                    </TabsTrigger>
                    <TabsTrigger value="student" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Student
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="experienced" className="mt-0">
                    <Form {...experiencedForm}>
                      <form onSubmit={experiencedForm.handleSubmit(onProviderSubmit)}>
                        <CardContent className="space-y-4 px-0">
                          {renderCommonFields(experiencedForm)}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 px-0">
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-2" />
                            )}
                            Create Account
                          </Button>
                        </CardFooter>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="student" className="mt-0">
                    <Form {...studentForm}>
                      <form onSubmit={studentForm.handleSubmit(onProviderSubmit)}>
                        <CardContent className="space-y-4 px-0">
                          {renderCommonFields(studentForm as unknown as ReturnType<typeof useForm<RegisterFormData>>)}
                          {renderStudentFields(studentForm)}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 px-0">
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-2" />
                            )}
                            Create Account
                          </Button>
                        </CardFooter>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* Reviewer Tab Content */}
            <TabsContent value="reviewer" className="mt-0">
              {renderReviewerForm()}
            </TabsContent>

            {/* Admin Tab Content */}
            <TabsContent value="admin" className="mt-0">
              {renderAdminForm()}
            </TabsContent>
          </Tabs>

          <div className="px-6 pb-6">
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
