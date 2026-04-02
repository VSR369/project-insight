import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, ClipboardCheck, Shield, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  registerSchema, studentRegisterSchema, reviewerRegisterSchema, adminRegisterSchema,
  RegisterFormData, StudentRegisterFormData, ReviewerRegisterFormData, AdminRegisterFormData 
} from '@/lib/validations/auth';
import { getStoredInvitationData, clearStoredInvitationData, type InvitationData } from '@/hooks/queries/useValidateInvitation';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { ROLE_INFO, type RoleTab, type ProviderSubTab } from './register/registerConstants';
import { RegisterProviderForm } from './register/RegisterProviderForm';
import { RegisterReviewerForm } from './register/RegisterReviewerForm';
import { RegisterAdminForm } from './register/RegisterAdminForm';

export default function Register() {
  // ═══ SECTION 1: useState ═══
  const [isLoading, setIsLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleTab>('provider');
  const [providerSubTab, setProviderSubTab] = useState<ProviderSubTab>('experienced');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  // ═══ SECTION 2: Context/hooks ═══
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ═══ SECTION 3: Form hooks ═══
  const experiencedForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', address: '', pinCode: '', countryId: '' },
  });
  const studentForm = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', address: '', pinCode: '', countryId: '', institution: '', graduationYear: new Date().getFullYear() + 1 },
  });
  const reviewerForm = useForm<ReviewerRegisterFormData>({
    resolver: zodResolver(reviewerRegisterSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', industrySegmentIds: [], expertiseLevelIds: [], yearsExperience: undefined, timezone: 'Asia/Calcutta', whyJoinStatement: '' },
  });
  const adminForm = useForm<AdminRegisterFormData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', accessCode: '' },
  });

  // ═══ SECTION 4: useEffect ═══
  useEffect(() => {
    const isInvitation = searchParams.get('invitation') === 'true';
    if (isInvitation) {
      const stored = getStoredInvitationData();
      if (stored) {
        setInvitationData(stored);
        experiencedForm.setValue('email', stored.email);
        if (stored.first_name) experiencedForm.setValue('firstName', stored.first_name);
        if (stored.last_name) experiencedForm.setValue('lastName', stored.last_name);
        setActiveRole('provider');
      }
    }
  }, [searchParams, experiencedForm]);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // ═══ SECTION 5: Conditional returns ═══
  if (user) return null;

  // ═══ SECTION 6: Handlers ═══
  const onProviderSubmit = async (data: RegisterFormData | StudentRegisterFormData) => {
    setIsLoading(true);
    try {
      const metadata: Record<string, unknown> = {
        first_name: data.firstName, last_name: data.lastName, is_student: providerSubTab === 'student',
        role_type: 'provider', address: data.address || null, pin_code: data.pinCode || null, country_id: data.countryId || null,
      };
      if (invitationData) {
        metadata.invitation_id = invitationData.id;
        if (invitationData.industry_segment_id) metadata.industry_segment_id = invitationData.industry_segment_id;
      }
      const { error } = await signUp(data.email, data.password, metadata);
      if (error) { toast.error(error.message.includes('User already registered') ? 'An account with this email already exists' : error.message); return; }
      if (invitationData) clearStoredInvitationData();
      toast.success('Account created! Please check your email to verify your account.');
      navigate('/login');
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), { operation: 'register_provider' });
      toast.error('An unexpected error occurred');
    } finally { setIsLoading(false); }
  };

  const onReviewerSubmit = async (data: ReviewerRegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("register-reviewer-application", {
        body: { firstName: data.firstName, lastName: data.lastName, email: data.email, password: data.password, phone: data.phone || undefined, industrySegmentIds: data.industrySegmentIds, expertiseLevelIds: data.expertiseLevelIds, yearsExperience: data.yearsExperience || undefined, timezone: data.timezone, whyJoinStatement: data.whyJoinStatement },
      });
      if (response.error) { toast.error(response.error.message || 'Failed to submit application'); return; }
      if (!response.data?.success) { toast.error(response.data?.error || 'Failed to submit application'); return; }
      toast.success('Application submitted! Your reviewer application is pending admin approval.');
      navigate('/login');
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), { operation: 'register_reviewer' });
      toast.error('An unexpected error occurred');
    } finally { setIsLoading(false); }
  };

  const onAdminSubmit = async (data: AdminRegisterFormData) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('register-platform-admin', {
        body: { email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName, accessCode: data.accessCode },
      });
      if (error) { toast.error(error.message || 'Registration failed'); return; }
      if (!response?.success) { toast.error(response?.error || 'Registration failed'); return; }
      toast.success('Admin account created successfully. You can now log in.');
      navigate('/login');
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), { operation: 'register_admin' });
      toast.error('An unexpected error occurred');
    } finally { setIsLoading(false); }
  };

  const currentRoleInfo = ROLE_INFO[activeRole];
  const RoleIcon = currentRoleInfo.icon;
  const isVipInvitation = invitationData?.invitation_type === 'vip_expert';

  // ═══ SECTION 7: Render ═══
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
            <CardDescription className="text-center">Select your role to get started</CardDescription>
          </CardHeader>

          <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as RoleTab)} className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="provider" className="flex items-center gap-2"><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">Provider</span></TabsTrigger>
                <TabsTrigger value="reviewer" className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">Reviewer</span></TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Admin</span></TabsTrigger>
              </TabsList>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <RoleIcon className={`h-5 w-5 ${currentRoleInfo.color}`} />
                <div>
                  <p className="font-medium text-sm">{currentRoleInfo.title}</p>
                  <p className="text-xs text-muted-foreground">{currentRoleInfo.description}</p>
                </div>
              </div>
            </div>

            <TabsContent value="provider" className="mt-0">
              {isVipInvitation && (
                <div className="px-6 mb-4">
                  <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-3">
                    <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">VIP Expert Invitation — priority onboarding enabled</p>
                  </div>
                </div>
              )}
              <RegisterProviderForm
                experiencedForm={experiencedForm}
                studentForm={studentForm}
                providerSubTab={providerSubTab}
                setProviderSubTab={setProviderSubTab}
                onProviderSubmit={onProviderSubmit}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="reviewer" className="mt-0">
              <RegisterReviewerForm reviewerForm={reviewerForm} onReviewerSubmit={onReviewerSubmit} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="admin" className="mt-0">
              <RegisterAdminForm adminForm={adminForm} onAdminSubmit={onAdminSubmit} isLoading={isLoading} />
            </TabsContent>
          </Tabs>

          <CardFooter className="flex justify-center pb-6 pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
