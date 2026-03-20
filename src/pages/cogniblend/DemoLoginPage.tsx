/**
 * DemoLoginPage — Two-tab quick-login for CogniBlend 360° Demo.
 * Tab 1: AI-Assisted Path (AI generates, roles review)
 * Tab 2: Manual Editor Path (8-step wizard, full control)
 * Route: /cogni/demo-login
 */

import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Users, Zap, ArrowLeft, Play, CheckCircle2, AlertCircle, Sparkles, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_DISPLAY, ROLE_COLORS } from '@/types/cogniRoles';
import { DemoWorkflowSteps } from '@/components/cogniblend/demo/DemoWorkflowSteps';
import { DemoUserCard } from '@/components/cogniblend/demo/DemoUserCard';
import { DemoSeedCard } from '@/components/cogniblend/demo/DemoSeedCard';

const TEST_PASSWORD = 'TestSetup2026!';

export type DemoPath = 'ai' | 'manual';

export interface DemoUser {
  email: string;
  displayName: string;
  roles: string[];
  aiDescription: string;
  manualDescription: string;
  aiDestination: string;
  manualDestination: string;
  stepLabel?: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'nh-rq@testsetup.dev',
    displayName: 'Alex Morgan',
    roles: ['RQ'],
    aiDescription: 'Submits problem details for AI-driven challenge generation',
    manualDescription: 'Submits innovation requests via the 8-step editor wizard',
    aiDestination: '/cogni/challenges/create?tab=ai',
    manualDestination: '/cogni/challenges/create?tab=editor',
    stepLabel: 'Step 1',
  },
  {
    email: 'nh-cr@testsetup.dev',
    displayName: 'Chris Rivera',
    roles: ['CR'],
    aiDescription: 'Triggers AI to generate full challenge spec, then reviews each section',
    manualDescription: 'Builds challenge spec manually using the 8-step wizard',
    aiDestination: '/cogni/challenges/create?tab=ai',
    manualDestination: '/cogni/challenges/create?tab=editor',
    stepLabel: 'Step 1–2',
  },
  {
    email: 'nh-lc@testsetup.dev',
    displayName: 'Leslie Chen',
    roles: ['LC'],
    aiDescription: 'Receives challenge from Creator; AI suggests legal docs to review, modify, and attach',
    manualDescription: 'Reviews challenge spec + uploads NDA/IP legal documents',
    aiDestination: '/cogni/legal-review',
    manualDestination: '/cogni/legal-review',
    stepLabel: 'Step 3',
  },
  {
    email: 'nh-cu@testsetup.dev',
    displayName: 'Casey Underwood',
    roles: ['CU'],
    aiDescription: 'AI reviews spec + legal docs as a package; Curator accepts/declines findings',
    manualDescription: 'Reviews challenge quality via 14-point checklist',
    aiDestination: '/cogni/curation',
    manualDestination: '/cogni/curation',
    stepLabel: 'Step 4',
  },
  {
    email: 'nh-id@testsetup.dev',
    displayName: 'Dana Irving',
    roles: ['ID'],
    aiDescription: 'Final approval of AI-curated challenge package before publication',
    manualDescription: 'Final approval of challenge before publication',
    aiDestination: '/cogni/approval',
    manualDestination: '/cogni/approval',
    stepLabel: 'Step 5',
  },
  {
    email: 'nh-er1@testsetup.dev',
    displayName: 'Evelyn Rhodes',
    roles: ['ER'],
    aiDescription: 'Evaluates submitted solutions with AI-assisted scoring',
    manualDescription: 'Evaluates submitted solutions against criteria',
    aiDestination: '/cogni/review',
    manualDestination: '/cogni/review',
    stepLabel: 'Step 6',
  },
  {
    email: 'nh-er2@testsetup.dev',
    displayName: 'Ethan Russell',
    roles: ['ER'],
    aiDescription: 'Second reviewer for dual-review governance (AI-assisted)',
    manualDescription: 'Second reviewer for dual-review governance',
    aiDestination: '/cogni/review',
    manualDestination: '/cogni/review',
    stepLabel: 'Step 6',
  },
  {
    email: 'nh-fc@testsetup.dev',
    displayName: 'Frank Coleman',
    roles: ['FC'],
    aiDescription: 'Confirms escrow creation & prize disbursement per business rules',
    manualDescription: 'Manages escrow funding and prize disbursement',
    aiDestination: '/cogni/escrow',
    manualDestination: '/cogni/escrow',
    stepLabel: 'Finance',
  },
  {
    email: 'nh-solo@testsetup.dev',
    displayName: 'Sam Solo',
    roles: ['RQ', 'CR', 'CU', 'ID', 'ER', 'FC'],
    aiDescription: 'Solo operator — walks through all AI-assisted steps sequentially',
    manualDescription: 'Solo operator — holds all roles for full wizard walkthrough',
    aiDestination: '/cogni/challenges/create?tab=ai',
    manualDestination: '/cogni/challenges/create?tab=editor',
    stepLabel: 'All Steps',
  },
];

export default function DemoLoginPage() {
  const navigate = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleLogin = useCallback(async (demoUser: DemoUser, path: DemoPath) => {
    setLoadingEmail(demoUser.email);
    try {
      await supabase.auth.signOut();
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: demoUser.email,
        password: TEST_PASSWORD,
      });
      if (error) throw error;

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
          toast.error('No organization linked. Seed the demo scenario first.');
          return;
        }
      }

      sessionStorage.setItem('cogni_demo_path', path);
      const destination = path === 'ai' ? demoUser.aiDestination : demoUser.manualDestination;
      toast.success(`Signed in as ${demoUser.displayName} (${demoUser.roles.join(', ')}) — ${path === 'ai' ? 'AI-Assisted' : 'Manual Editor'}`);
      navigate(destination);
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
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/cogni/login" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">CogniBlend 360° Demo</h1>
            <p className="text-sm text-muted-foreground">
              New Horizon Company — Choose your workflow path, then pick a role
            </p>
          </div>
        </div>

        {/* Seed Data Card */}
        <DemoSeedCard />

        {/* Tabbed Login */}
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="ai" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10">
              <Sparkles className="h-4 w-4" />
              <div className="text-left">
                <div className="text-sm font-semibold">AI-Assisted Path</div>
                <div className="text-[10px] text-muted-foreground font-normal">AI generates, roles review</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/10">
              <Settings2 className="h-4 w-4" />
              <div className="text-left">
                <div className="text-sm font-semibold">Manual Editor Path</div>
                <div className="text-[10px] text-muted-foreground font-normal">8-step wizard, full control</div>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <DemoWorkflowSteps variant="ai" />
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pick a Role to Login
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {DEMO_USERS.map((user) => (
                <DemoUserCard
                  key={user.email}
                  user={user}
                  path="ai"
                  isLoading={loadingEmail === user.email}
                  disabled={!!loadingEmail}
                  onLogin={() => handleLogin(user, 'ai')}
                  getRoleBadge={getRoleBadge}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <DemoWorkflowSteps variant="manual" />
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pick a Role to Login
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {DEMO_USERS.map((user) => (
                <DemoUserCard
                  key={user.email}
                  user={user}
                  path="manual"
                  isLoading={loadingEmail === user.email}
                  disabled={!!loadingEmail}
                  onLogin={() => handleLogin(user, 'manual')}
                  getRoleBadge={getRoleBadge}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          All demo accounts use password: <code className="bg-muted px-1 rounded">TestSetup2026!</code>
        </p>
      </div>
    </div>
  );
}
