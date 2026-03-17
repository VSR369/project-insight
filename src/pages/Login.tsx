import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn, Shield, User, ChevronDown, ChevronUp, ClipboardCheck, Briefcase, Building2, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Portal type for routing
type PortalType = 'admin' | 'provider' | 'reviewer' | 'organization';


// Tab configuration with icons and descriptions
const LOGIN_TABS: Array<{
  id: PortalType;
  label: string;
  shortLabel: string;
  icon: typeof Shield;
  color: string;
  borderColor: string;
  description: string;
}> = [
  {
    id: 'provider',
    label: 'Solution Provider',
    shortLabel: 'Provider',
    icon: Briefcase,
    color: 'text-primary',
    borderColor: 'border-primary/30',
    description: 'Access your provider dashboard, enrollments, and assessments',
  },
  {
    id: 'reviewer',
    label: 'Panel Reviewer',
    shortLabel: 'Reviewer',
    icon: ClipboardCheck,
    color: 'text-green-600',
    borderColor: 'border-green-600/30',
    description: 'Manage availability, review candidates, conduct interviews',
  },
  {
    id: 'admin',
    label: 'Platform Admin',
    shortLabel: 'Admin',
    icon: Shield,
    color: 'text-destructive',
    borderColor: 'border-destructive/30',
    description: 'System administration, master data, user management',
  },
  {
    id: 'organization',
    label: 'Organization',
    shortLabel: 'Org',
    icon: Building2,
    color: 'text-teal-600',
    borderColor: 'border-teal-600/30',
    description: 'Manage challenges, team, and billing for your organization',
  },
];

// Development test accounts - only visible in dev mode
const DEV_ACCOUNTS: Array<{
  role: string;
  email: string;
  password: string;
  icon: typeof Shield;
  description: string;
  color: string;
  portal: PortalType;
}> = [
  {
    role: 'Supervisor',
    email: 'admin@test.local',
    password: 'Admin123!',
    icon: Shield,
    description: 'Full system access',
    color: 'text-destructive',
    portal: 'admin',
  },
  {
    role: 'Senior Admin',
    email: 'senioradmin@test.local',
    password: 'SeniorAdmin123!',
    icon: Shield,
    description: 'Config + team view',
    color: 'text-orange-600',
    portal: 'admin',
  },
  {
    role: 'Basic Admin',
    email: 'basicadmin@test.local',
    password: 'BasicAdmin123!',
    icon: Shield,
    description: 'Core admin only',
    color: 'text-amber-600',
    portal: 'admin',
  },
  {
    role: 'Provider',
    email: 'provider@test.local',
    password: 'Provider123!',
    icon: User,
    description: 'Provider dashboard',
    color: 'text-primary',
    portal: 'provider',
  },
  {
    role: 'Reviewer',
    email: 'reviewer@test.local',
    password: 'Reviewer123!',
    icon: ClipboardCheck,
    description: 'Interview panel',
    color: 'text-green-600',
    portal: 'reviewer',
  },
  {
    role: 'Primary SO Admin',
    email: 'soadmin@test.local',
    password: 'SOAdmin123!',
    icon: Building2,
    description: 'Org admin portal',
    color: 'text-teal-600',
    portal: 'organization',
  },
];

// Portal home routes
const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/pulse/feed',
  reviewer: '/reviewer/dashboard',
  organization: '/org/dashboard',
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDevAccounts, setShowDevAccounts] = useState(true);
  const [selectedRole, setSelectedRole] = useState<PortalType>('provider');
  
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // IMPORTANT: All hooks must be called before any conditional returns
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Check if already logged in and redirect based on roles (async)
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!user) {
        setIsCheckingSession(false);
        return;
      }

      // Check sessionStorage first for cached portal
      const cachedPortal = sessionStorage.getItem('activePortal') as PortalType | null;
      
      // Fetch roles and records to validate or determine portal
      const [rolesResult, providerResult, reviewerResult, orgUserResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('solution_providers').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('panel_reviewers').select('id, approval_status').eq('user_id', user.id).maybeSingle(),
        supabase.from('org_users').select('id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle()
      ]);

      const roles = rolesResult.data;
      const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
      const isPanelReviewer = roles?.some(r => r.role === 'panel_reviewer') || !!reviewerResult.data;
      const isPendingReviewer = reviewerResult.data?.approval_status === 'pending';
      const hasProviderRecord = !!providerResult.data;
      const hasOrgUserRecord = !!orgUserResult.data;

      // Validate cached portal
      if (cachedPortal) {
        const canAccessCached =
          (cachedPortal === 'admin' && isPlatformAdmin) ||
          (cachedPortal === 'provider' && hasProviderRecord) ||
          (cachedPortal === 'reviewer' && isPanelReviewer) ||
          (cachedPortal === 'organization' && hasOrgUserRecord);

        if (canAccessCached) {
          if (cachedPortal === 'reviewer' && isPendingReviewer) {
            navigate('/reviewer/pending-approval', { replace: true });
            return;
          }
          navigate(PORTAL_ROUTES[cachedPortal], { replace: true });
          return;
        }
        sessionStorage.removeItem('activePortal');
      }

      // Determine by role priority: Admin > Reviewer > Organization > Provider
      let targetPortal: PortalType = 'provider';
      if (isPlatformAdmin) targetPortal = 'admin';
      else if (isPanelReviewer) targetPortal = 'reviewer';
      else if (hasOrgUserRecord) targetPortal = 'organization';
      else if (hasProviderRecord) targetPortal = 'provider';

      sessionStorage.setItem('activePortal', targetPortal);

      if (targetPortal === 'reviewer' && isPendingReviewer) {
        navigate('/reviewer/pending-approval', { replace: true });
        return;
      }

      navigate(PORTAL_ROUTES[targetPortal], { replace: true });
    };

    checkAndRedirect();
  }, [user, navigate]);

  // Show loading spinner while user is logged in (redirecting)
  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData, portalOverride?: PortalType) => {
    const effectiveRole = portalOverride ?? selectedRole;
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in');
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      // Fetch user roles to determine redirect destination
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const userId = session.session.user.id;
        
        // Fetch roles, provider record, reviewer record, and enrollments in parallel
        const [rolesResult, providerResult, reviewerResult, orgUserResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId),
          supabase
            .from('solution_providers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('panel_reviewers')
            .select('id, approval_status, is_active')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('org_users')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
        ]);
        
        const roles = rolesResult.data;
        const providerRecord = providerResult.data;
        const reviewerRecord = reviewerResult.data;
        const orgUserRecord = orgUserResult.data;
        
        const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
        const isPanelReviewer = roles?.some(r => r.role === 'panel_reviewer') || !!reviewerRecord;
        const isPendingReviewer = reviewerRecord?.approval_status === 'pending';
        const hasProviderRecord = !!providerRecord;
        const hasOrgUserRecord = !!orgUserRecord;
        
        // Clear stale session storage on fresh login
        sessionStorage.removeItem('activeEnrollmentId');
        
        // Check if first-time provider (has provider record but no enrollments)
        let isFirstTimeProvider = false;
        if (hasProviderRecord && effectiveRole === 'provider' && !isPlatformAdmin && !isPanelReviewer) {
          const { data: enrollments } = await supabase
            .from('provider_industry_enrollments')
            .select('id')
            .eq('provider_id', providerRecord.id)
            .limit(1);
          
          isFirstTimeProvider = !enrollments || enrollments.length === 0;
        }
        
        // First-time providers go to Pulse feed for onboarding
        if (isFirstTimeProvider) {
          toast.success('Welcome! Explore Industry Pulse and build your profile.');
          navigate('/pulse/feed', { replace: true });
          return;
        }
        
        // Validate user has access to selected portal
        const canAccessSelected = 
          (effectiveRole === 'admin' && isPlatformAdmin) ||
          (effectiveRole === 'provider' && hasProviderRecord) ||
          (effectiveRole === 'reviewer' && isPanelReviewer) ||
          (effectiveRole === 'organization' && hasOrgUserRecord);
        
        let targetPortal: PortalType = effectiveRole;
        
        if (!canAccessSelected) {
          // Show specific error based on selected role
          const roleLabel = LOGIN_TABS.find(t => t.id === effectiveRole)?.label || effectiveRole;
          
          if (effectiveRole === 'admin' && !isPlatformAdmin) {
            toast.error(`You don't have ${roleLabel} access. Contact your administrator.`);
          } else if (effectiveRole === 'reviewer' && !isPanelReviewer) {
            toast.error(`No reviewer account found. Would you like to register as a reviewer?`);
          } else if (effectiveRole === 'organization' && !hasOrgUserRecord) {
            toast.error(`No organization account found. Please register your organization first.`);
          } else if (effectiveRole === 'provider' && !hasProviderRecord) {
            toast.error(`No provider account found. Would you like to register as a provider?`);
          }
          
          // Fallback to available portal: Admin > Reviewer > Organization > Provider
          if (isPlatformAdmin) targetPortal = 'admin';
          else if (isPanelReviewer) targetPortal = 'reviewer';
          else if (hasOrgUserRecord) targetPortal = 'organization';
          else if (hasProviderRecord) targetPortal = 'provider';
          else {
            toast.error('No valid account found. Please register first.');
            await supabase.auth.signOut();
            return;
          }
          
          toast.info(`Redirecting to ${LOGIN_TABS.find(t => t.id === targetPortal)?.label || targetPortal} portal instead.`);
        }
        
        // Persist portal choice and admin tier for future sessions/refreshes
        sessionStorage.setItem('activePortal', targetPortal);
        
        // Handle pending reviewers - redirect to pending approval page
        if (targetPortal === 'reviewer' && isPendingReviewer) {
          toast.info('Your reviewer application is pending admin approval.');
          navigate('/reviewer/pending-approval', { replace: true });
          return;
        }
        
        toast.success('Welcome back!');
        navigate(PORTAL_ROUTES[targetPortal], { replace: true });
      } else {
        toast.success('Welcome back!');
        navigate('/pulse/feed', { replace: true });
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current tab config for dynamic styling
  const currentTab = LOGIN_TABS.find(t => t.id === selectedRole) || LOGIN_TABS[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">CogniBlend</h1>
          <p className="text-muted-foreground mt-2">Co-Innovation Platform</p>
        </div>

        {/* Role Selection Tabs */}
        <Tabs 
          value={selectedRole} 
          onValueChange={(v) => setSelectedRole(v as PortalType)}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            {LOGIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:shadow-md transition-all",
                    tab.id === selectedRole && tab.color
                  )}
                >
                  <Icon className={cn("h-5 w-5", tab.id === selectedRole ? tab.color : "text-muted-foreground")} />
                  <span className="text-xs font-medium hidden sm:block">{tab.shortLabel}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Card className={cn(
          "shadow-lg transition-colors duration-200",
          currentTab.borderColor
        )}>
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center gap-2">
              <currentTab.icon className={cn("h-5 w-5", currentTab.color)} />
              <CardTitle className="text-xl font-semibold">
                Sign in as {currentTab.label}
              </CardTitle>
            </div>
            <CardDescription className="text-center text-sm">
              {currentTab.description}
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => onSubmit(data))}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            autoComplete="current-password"
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

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className={cn(
                    "w-full",
                  selectedRole === 'admin' && "bg-destructive hover:bg-destructive/90",
                    selectedRole === 'reviewer' && "bg-green-600 hover:bg-green-700",
                    selectedRole === 'organization' && "bg-teal-600 hover:bg-teal-700"
                  )} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Sign In as {currentTab.shortLabel}
                </Button>

                <p className="text-sm text-center text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
                <p className="text-sm text-center text-muted-foreground">
                  <Link to="/registration/organization-identity?new=1" className="text-teal-600 hover:underline font-medium">
                    Registering an organization? Start here →
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Quick Login Section - Test Accounts */}
        <Card className="border-dashed border-amber-500/50 bg-amber-500/5 mt-4">
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setShowDevAccounts(!showDevAccounts)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <CardTitle className="text-sm font-medium text-amber-600">
                  Quick Login (Test Accounts)
                </CardTitle>
                <CardDescription className="text-xs">
                  Click to auto-fill and sign in
                </CardDescription>
              </div>
              {showDevAccounts ? (
                <ChevronUp className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              )}
            </button>
          </CardHeader>
          {showDevAccounts && (
             <CardContent className="pt-2 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform Admins</p>
                <div className="grid grid-cols-3 gap-3">
                  {DEV_ACCOUNTS.filter(a => a.portal === 'admin').map((account) => {
                    const Icon = account.icon;
                    return (
                      <button
                        key={account.role}
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setSelectedRole(account.portal);
                          form.setValue('email', account.email);
                          form.setValue('password', account.password);
                          form.handleSubmit((data) => onSubmit(data, account.portal))();
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <Icon className={`h-5 w-5 ${account.color}`} />
                        <div className="text-center">
                          <p className="text-xs font-medium">{account.role}</p>
                          <p className="text-[10px] text-muted-foreground">{account.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Portal Accounts</p>
                <div className="grid grid-cols-3 gap-3">
                  {DEV_ACCOUNTS.filter(a => a.portal !== 'admin').map((account) => {
                    const Icon = account.icon;
                    return (
                      <button
                        key={account.role}
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setSelectedRole(account.portal);
                          form.setValue('email', account.email);
                          form.setValue('password', account.password);
                          form.handleSubmit((data) => onSubmit(data, account.portal))();
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <Icon className={`h-5 w-5 ${account.color}`} />
                        <div className="text-center">
                          <p className="text-xs font-medium">{account.role}</p>
                          <p className="text-[10px] text-muted-foreground">{account.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
