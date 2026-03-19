/**
 * CogniBlend Login Page
 * Route: /cogni/login
 * Redirects to /cogni/dashboard if already authenticated.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const TEST_PASSWORD = 'CogniTest2026!';

interface QuickUser {
  email: string;
  label: string;
  roles: string[];
}

const MP_QUICK_USERS: QuickUser[] = [
  { email: 'mp-solo@cognitest.dev',      label: 'Solo Founder',  roles: ['AM','CR','CU','ID','ER','LC','FC'] },
  { email: 'mp-architect@cognitest.dev',  label: 'Architect',     roles: ['CR'] },
  { email: 'mp-curator@cognitest.dev',    label: 'Curator',       roles: ['CU'] },
  { email: 'mp-director@cognitest.dev',   label: 'Director',      roles: ['ID'] },
  { email: 'mp-reviewer@cognitest.dev',   label: 'Reviewer',      roles: ['ER'] },
  { email: 'mp-finance@cognitest.dev',    label: 'Finance',       roles: ['FC'] },
  { email: 'mp-legal@cognitest.dev',      label: 'Legal',         roles: ['LC'] },
];

const AGG_QUICK_USERS: QuickUser[] = [
  { email: 'agg-solo@cognitest.dev',     label: 'Solo Founder',  roles: ['RQ','CR','CU','ID','ER','LC','FC'] },
  { email: 'agg-creator@cognitest.dev',  label: 'Creator',       roles: ['CR'] },
  { email: 'agg-curator@cognitest.dev',  label: 'Curator',       roles: ['CU'] },
  { email: 'agg-director@cognitest.dev', label: 'Director',      roles: ['ID'] },
  { email: 'agg-reviewer@cognitest.dev', label: 'Reviewer',      roles: ['ER'] },
  { email: 'agg-finance@cognitest.dev',  label: 'Finance',       roles: ['FC'] },
  { email: 'agg-legal@cognitest.dev',    label: 'Legal',         roles: ['LC'] },
];

export default function CogniLoginPage() {
  // ═══════════════════════════════════════════
  // SECTION 1: useState
  // ═══════════════════════════════════════════
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMasterSeeding, setIsMasterSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState<string[] | null>(null);
  const [masterSeedLog, setMasterSeedLog] = useState<string[] | null>(null);
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);

  // ═══════════════════════════════════════════
  // SECTION 2: Context and custom hooks
  // ═══════════════════════════════════════════
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();

  // ═══════════════════════════════════════════
  // SECTION 3: Form hooks
  // ═══════════════════════════════════════════
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // ═══════════════════════════════════════════
  // SECTION 6: Conditional returns (AFTER ALL HOOKS)
  // ═══════════════════════════════════════════
  if (!loading && user) {
    navigate('/cogni/dashboard', { replace: true });
    return null;
  }

  // ═══════════════════════════════════════════
  // SECTION 7: Event handlers
  // ═══════════════════════════════════════════
  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        setServerError('Invalid email or password. Please try again.');
      } else {
        navigate('/cogni/dashboard', { replace: true });
      }
    } catch {
      setServerError('Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedLog(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-cogni-test-data');
      if (error) {
        toast.error(`Seed failed: ${error.message}`);
        return;
      }
      if (data?.success) {
        setSeedLog(data.data.results);
        toast.success('CogniBlend test data seeded successfully!');
      } else {
        toast.error(data?.error?.message ?? 'Seeding failed');
      }
    } catch (err: unknown) {
      toast.error(`Seed error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleMasterSeed = async () => {
    setIsMasterSeeding(true);
    setMasterSeedLog(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-cogni-master');
      if (error) {
        toast.error(`Master seed failed: ${error.message}`);
        return;
      }
      if (data?.success) {
        setMasterSeedLog(data.data.results);
        toast.success(`Master seed complete! ${data.data.userCount} users, ${data.data.challengeCount} challenges created.`);
      } else {
        toast.error(data?.error?.message ?? 'Master seeding failed');
      }
    } catch (err: unknown) {
      toast.error(`Seed error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsMasterSeeding(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setServerError(null);
    setIsSubmitting(true);
    setValue('email', email);
    setValue('password', TEST_PASSWORD);

    try {
      const { error } = await signIn(email, TEST_PASSWORD);
      if (error) {
        setServerError(`Quick login failed for ${email}. Seed data first.`);
      } else {
        navigate('/cogni/dashboard', { replace: true });
      }
    } catch {
      setServerError(`Quick login failed for ${email}. Seed data first.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = !!serverError;

  // ═══════════════════════════════════════════
  // SECTION 8: Render
  // ═══════════════════════════════════════════
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[480px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1
            className="font-bold text-[28px]"
            style={{ color: '#1F3864' }}
          >
            CogniBlend
          </h1>
          <p className="italic text-muted-foreground mt-1 text-sm">
            Open Innovation Platform
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <Input
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className={`h-11 text-base ${
                errors.email || hasError
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className={`h-11 text-base ${
                errors.password || hasError
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-destructive text-sm">{serverError}</p>
          )}

          {/* Sign In button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-bold text-sm"
            style={{
              height: 44,
              borderRadius: 8,
              backgroundColor: '#378ADD',
              color: '#FFFFFF',
              fontSize: 14,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Forgot password */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-primary hover:underline text-[13px]"
            >
              Forgot password?
            </button>
          </div>

          {/* Switch to Platform login */}
          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-primary hover:underline text-sm font-medium"
            >
              Switch to Platform Login (Admin / Provider / Reviewer) →
            </Link>
          </div>
        </form>

        {/* Dev-only: Developer Tools */}
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground text-center mb-3">Developer Tools</p>

          {/* Master Seed */}
          <Button
            type="button"
            variant="outline"
            disabled={isMasterSeeding}
            onClick={handleMasterSeed}
            className="w-full text-sm mb-2"
          >
            {isMasterSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding master data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Seed Master Test Data (MP + AGG)
              </>
            )}
          </Button>

          {masterSeedLog && (
            <div className="mt-2 mb-3 rounded-md bg-muted p-3 text-xs font-mono max-h-60 overflow-y-auto">
              {masterSeedLog.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">{line}</div>
              ))}
            </div>
          )}

          {/* Legacy Seed */}
          <Button
            type="button"
            variant="outline"
            disabled={isSeeding}
            onClick={handleSeedData}
            className="w-full text-sm"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding legacy data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Seed Legacy Test Data
              </>
            )}
          </Button>

          {seedLog && (
            <div className="mt-2 rounded-md bg-muted p-3 text-xs font-mono max-h-60 overflow-y-auto">
              {seedLog.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">{line}</div>
              ))}
            </div>
          )}

          {/* Quick Login */}
          <Collapsible open={quickLoginOpen} onOpenChange={setQuickLoginOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm">
                Quick Login (Test Users)
                {quickLoginOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Tabs defaultValue="mp" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="mp" className="text-xs">🔵 MP Users</TabsTrigger>
                  <TabsTrigger value="agg" className="text-xs">🟣 AGG Users</TabsTrigger>
                </TabsList>

                <TabsContent value="mp" className="space-y-1.5 mt-2">
                  {MP_QUICK_USERS.map((u) => (
                    <QuickLoginButton
                      key={u.email}
                      user={u}
                      variant="mp"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(u.email)}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="agg" className="space-y-1.5 mt-2">
                  {AGG_QUICK_USERS.map((u) => (
                    <QuickLoginButton
                      key={u.email}
                      user={u}
                      variant="agg"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(u.email)}
                    />
                  ))}
                </TabsContent>
              </Tabs>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Password: <code className="bg-muted px-1 rounded">CogniTest2026!</code>
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Sub-component: Quick Login Button
// ═══════════════════════════════════════════
function QuickLoginButton({
  user,
  variant,
  disabled,
  onClick,
}: {
  user: QuickUser;
  variant: 'mp' | 'agg';
  disabled: boolean;
  onClick: () => void;
}) {
  const borderColor = variant === 'mp' ? 'border-blue-300' : 'border-purple-300';
  const hoverBg = variant === 'mp' ? 'hover:bg-blue-50' : 'hover:bg-purple-50';
  const badgeBg = variant === 'mp' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left text-xs transition-colors disabled:opacity-50 ${borderColor} ${hoverBg}`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{user.label}</span>
        <span className="text-muted-foreground text-[10px]">{user.email}</span>
      </div>
      <div className="flex flex-wrap gap-1 max-w-[180px] justify-end">
        {user.roles.map((r) => (
          <span key={r} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${badgeBg}`}>
            {r}
          </span>
        ))}
      </div>
    </button>
  );
}
