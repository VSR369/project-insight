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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Users, Zap, ArrowLeft, Play, CheckCircle2, AlertCircle, Sparkles, Settings2, ShieldCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_DISPLAY, ROLE_COLORS } from '@/types/cogniRoles';
import { DemoWorkflowSteps } from '@/components/cogniblend/demo/DemoWorkflowSteps';
import { DemoUserCard } from '@/components/cogniblend/demo/DemoUserCard';
import { DemoSeedCard } from '@/components/cogniblend/demo/DemoSeedCard';
import {
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { cn } from '@/lib/utils';

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

/** Build the demo user list dynamically based on engagement model */
function getDemoUsers(engagementModel: string): DemoUser[] {
  const isMP = engagementModel === 'MP';

  return [
    // Step 1 actor: AM for Marketplace, RQ for Aggregator
    isMP
      ? {
          email: 'nh-am@testsetup.dev',
          displayName: 'Alex Morgan',
          roles: ['AM'],
          aiDescription: 'Submits a problem brief for AI-driven challenge generation',
          manualDescription: 'Submits solution requests via the 8-step editor wizard',
          aiDestination: '/cogni/challenges/create?tab=ai',
          manualDestination: '/cogni/challenges/create?tab=editor',
          stepLabel: 'Step 1',
        }
      : {
          email: 'nh-rq@testsetup.dev',
          displayName: 'Alex Morgan',
          roles: ['RQ'],
          aiDescription: 'Shares a problem idea for AI-driven challenge generation',
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
      aiDestination: '/cogni/lc-queue',
      manualDestination: '/cogni/lc-queue',
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
      roles: isMP ? ['AM', 'CR', 'CU', 'ID', 'ER', 'FC'] : ['RQ', 'CR', 'CU', 'ID', 'ER', 'FC'],
      aiDescription: 'Solo operator — walks through all AI-assisted steps sequentially',
      manualDescription: 'Solo operator — holds all roles for full wizard walkthrough',
      aiDestination: '/cogni/challenges/create?tab=ai',
      manualDestination: '/cogni/challenges/create?tab=editor',
      stepLabel: 'All Steps',
    },
  ];
}
const GOVERNANCE_CARDS: Array<{
  mode: GovernanceMode;
  icon: typeof Zap;
  summary: string;
}> = [
  { mode: 'QUICK', icon: Zap, summary: 'Simplified workflow, auto-completion, merged roles' },
  { mode: 'STRUCTURED', icon: Settings2, summary: 'Full field set, manual curation, optional add-ons' },
  { mode: 'CONTROLLED', icon: ShieldCheck, summary: 'Mandatory escrow, formal gates, full compliance' },
];

export default function DemoLoginPage() {
  const navigate = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('STRUCTURED');
  const [engagementModel, setEngagementModel] = useState<string>('MP');

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

      // Persist demo selections to sessionStorage
      sessionStorage.setItem('cogni_demo_path', path);
      sessionStorage.setItem('cogni_demo_governance', governanceMode);
      sessionStorage.setItem('cogni_demo_engagement', engagementModel);

      const destination = path === 'ai' ? demoUser.aiDestination : demoUser.manualDestination;
      toast.success(`Signed in as ${demoUser.displayName} (${demoUser.roles.join(', ')}) — ${path === 'ai' ? 'AI-Assisted' : 'Manual Editor'}`);
      navigate(destination);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(`Login failed: ${message}. Have you seeded the demo data first?`);
    } finally {
      setLoadingEmail(null);
    }
  }, [navigate, governanceMode, engagementModel]);

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

        {/* ═══ Challenge Configuration ═══ */}
        <Card className="border-primary/20 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Challenge Configuration</CardTitle>
            <CardDescription className="text-xs">
              Select Governance Mode and Engagement Model before logging in. These carry through to the creation flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Governance Mode Cards */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Governance Mode</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {GOVERNANCE_CARDS.map(({ mode, icon: Icon, summary }) => {
                  const cfg = GOVERNANCE_MODE_CONFIG[mode];
                  const isSelected = governanceMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGovernanceMode(mode)}
                      className={cn(
                        'relative text-left rounded-lg border-2 p-4 transition-all',
                        isSelected ? 'shadow-sm ring-1' : 'hover:shadow-sm',
                      )}
                      style={{
                        borderColor: isSelected ? cfg.color : 'hsl(var(--border))',
                        backgroundColor: isSelected ? cfg.bg : 'transparent',
                        ...(isSelected ? { boxShadow: `0 0 0 1px ${cfg.color}20` } : {}),
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{summary}</p>
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: cfg.color }}
                        >
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Engagement Model */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Engagement Model</h4>
              <Select value={engagementModel} onValueChange={setEngagementModel}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select engagement model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MP">Marketplace (MP) — Open competition</SelectItem>
                  <SelectItem value="AGG">Aggregator (AGG) — Curated selection</SelectItem>
                </SelectContent>
              </Select>
              <div className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-start gap-2 max-w-sm">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {engagementModel === 'AGG'
                    ? 'Aggregator: solvers are curated and invited by the platform.'
                    : 'Marketplace: solvers discover and apply openly.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
