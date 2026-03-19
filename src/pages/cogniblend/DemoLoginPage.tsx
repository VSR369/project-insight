/**
 * DemoLoginPage — Quick-login page for CogniBlend 360° Demo.
 * Provides one-click role switching for the "New Horizon Company" demo scenario.
 * Route: /cogni/demo-login
 */

import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Zap, ArrowLeft, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_DISPLAY, ROLE_COLORS } from '@/types/cogniRoles';

const TEST_PASSWORD = 'TestSetup2026!';

interface DemoUser {
  email: string;
  displayName: string;
  roles: string[];
  description: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'nh-rq@testsetup.dev',
    displayName: 'Alex Morgan',
    roles: ['RQ'],
    description: 'Submits innovation requests (Requestor role in AGG model)',
  },
  {
    email: 'nh-cr@testsetup.dev',
    displayName: 'Chris Rivera',
    roles: ['CR'],
    description: 'Transforms requests into challenge specs via AI',
  },
  {
    email: 'nh-cu@testsetup.dev',
    displayName: 'Casey Underwood',
    roles: ['CU'],
    description: 'Reviews challenge quality, triggers AI curation panel',
  },
  {
    email: 'nh-id@testsetup.dev',
    displayName: 'Dana Irving',
    roles: ['ID'],
    description: 'Approves challenges, oversees evaluation & selection',
  },
  {
    email: 'nh-er1@testsetup.dev',
    displayName: 'Evelyn Rhodes',
    roles: ['ER'],
    description: 'Evaluates submitted solutions against criteria',
  },
  {
    email: 'nh-er2@testsetup.dev',
    displayName: 'Ethan Russell',
    roles: ['ER'],
    description: 'Second reviewer for dual-review governance',
  },
  {
    email: 'nh-lc@testsetup.dev',
    displayName: 'Leslie Chen',
    roles: ['LC'],
    description: 'Reviews NDA/IP documents, legal compliance',
  },
  {
    email: 'nh-fc@testsetup.dev',
    displayName: 'Frank Coleman',
    roles: ['FC'],
    description: 'Manages escrow funding and prize disbursement',
  },
  {
    email: 'nh-solo@testsetup.dev',
    displayName: 'Sam Solo',
    roles: ['RQ', 'CR', 'CU', 'ID', 'ER', 'FC'],
    description: 'Solo operator — holds all roles for lightweight demo',
  },
];

export default function DemoLoginPage() {
  const navigate = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'seeding' | 'done' | 'error'>('idle');
  const [seedLog, setSeedLog] = useState<string[]>([]);

  const handleSeedScenario = useCallback(async () => {
    setSeedStatus('seeding');
    setSeedLog(['⏳ Setting up New Horizon Company demo scenario...']);
    try {
      const { data, error } = await supabase.functions.invoke('setup-test-scenario', {
        body: { scenario: 'new_horizon_demo' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error?.message ?? 'Unknown error');
      setSeedLog(data.data.results);
      setSeedStatus('done');
      toast.success('Demo scenario seeded successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Seed failed';
      setSeedLog((prev) => [...prev, `❌ ${message}`]);
      setSeedStatus('error');
      toast.error(`Seed failed: ${message}`);
    }
  }, []);

  const handleLogin = useCallback(async (demoUser: DemoUser) => {
    setLoadingEmail(demoUser.email);
    try {
      // Sign out first to clear any existing session
      await supabase.auth.signOut();
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: demoUser.email,
        password: TEST_PASSWORD,
      });
      if (error) throw error;

      // Preflight: verify user has an active org_users row
      const userId = signInData.user?.id;
      if (userId) {
        const { data: orgRow } = await supabase
          .from('org_users')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!orgRow) {
          await supabase.auth.signOut();
          toast.error(
            'This account has no organization linked. Please seed the demo scenario first, then try again.',
          );
          return;
        }
      }

      toast.success(`Signed in as ${demoUser.displayName} (${demoUser.roles.join(', ')})`);
      navigate('/cogni/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(`Login failed: ${message}. Have you seeded the demo data first?`);
    } finally {
      setLoadingEmail(null);
    }
  }, [navigate]);

  const getRoleBadge = (code: string) => {
    const color = ROLE_COLORS[code];
    if (!color) return null;
    return (
      <span
        key={code}
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: color.bg, color: color.color }}
      >
        {code} — {ROLE_DISPLAY[code] ?? code}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-muted p-4 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/cogni/login" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">CogniBlend 360° Demo</h1>
            <p className="text-sm text-muted-foreground">
              New Horizon Company — Enterprise AGG model with 8-role governance
            </p>
          </div>
        </div>

        {/* Seed Data Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Step 1: Seed Demo Data
            </CardTitle>
            <CardDescription>
              Creates the "New Horizon Company" org, 9 test users, and assigns challenge roles.
              Run this once — it's safe to re-run (resets existing users).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSeedScenario}
              disabled={seedStatus === 'seeding'}
              variant={seedStatus === 'done' ? 'secondary' : 'default'}
              className="w-full lg:w-auto"
            >
              {seedStatus === 'seeding' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {seedStatus === 'done' && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {seedStatus === 'error' && <AlertCircle className="mr-2 h-4 w-4" />}
              {seedStatus === 'idle' && <Play className="mr-2 h-4 w-4" />}
              {seedStatus === 'seeding' ? 'Seeding...' : seedStatus === 'done' ? 'Seeded ✓ (Re-run)' : 'Seed Demo Scenario'}
            </Button>
            {seedLog.length > 0 && (
              <div className="mt-3 rounded-md bg-muted p-3 text-xs font-mono max-h-48 overflow-y-auto border">
                {seedLog.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Login Grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            Step 2: Pick a Role to Login
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {DEMO_USERS.map((user) => (
              <Card
                key={user.email}
                className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-shadow"
                onClick={() => !loadingEmail && handleLogin(user)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{user.displayName}</span>
                    {loadingEmail === user.email && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((r) => getRoleBadge(r))}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.description}</p>
                  <p className="text-[11px] text-muted-foreground/60 font-mono">{user.email}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          All demo accounts use password: <code className="bg-muted px-1 rounded">TestSetup2026!</code>
        </p>
      </div>
    </div>
  );
}
