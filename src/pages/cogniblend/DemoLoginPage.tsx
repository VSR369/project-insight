/**
 * DemoLoginPage — Quick-login for CogniBlend 360° Demo.
 * Unified: all Creator destinations → /cogni/challenges/create (no tab params).
 * Route: /cogni/demo-login
 */

import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Users, Zap, ArrowLeft, Settings2, ShieldCheck, Info } from 'lucide-react';
import { logWarning } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { ROLE_DISPLAY, ROLE_COLORS } from '@/types/cogniRoles';
import { DemoWorkflowSteps } from '@/components/cogniblend/demo/DemoWorkflowSteps';
import { DemoSeedCard } from '@/components/cogniblend/demo/DemoSeedCard';
import {
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DemoUserCard } from '@/components/cogniblend/demo/DemoUserCard';

export const DEMO_TEST_PASSWORD = 'TestSetup2026!';
/** @deprecated Use DEMO_TEST_PASSWORD */
const TEST_PASSWORD = DEMO_TEST_PASSWORD;

export interface DemoUser {
  email: string;
  displayName: string;
  roles: string[];
  description: string;
  destination: string;
  stepLabel?: string;
}

const CR_DESC: Record<GovernanceMode, string> = {
  QUICK: 'Creator defines the challenge with 5 fields. Auto-published on submit.',
  STRUCTURED: 'Creator defines the challenge with 8 standard fields. AI Review recommended.',
  CONTROLLED: 'Creator defines challenge with extended 12-field form and risk assessment.',
};
const CU_DESC: Record<GovernanceMode, string> = {
  QUICK: 'Platform defaults applied — auto-completed.',
  STRUCTURED: 'Curator reviews quality with 14-point checklist.',
  CONTROLLED: 'Full 14-point checklist + mandatory AI review + dual curation.',
};
const LC_DESC: Record<GovernanceMode, string> = {
  QUICK: 'Legal templates auto-attached, no escrow — auto-completed.',
  STRUCTURED: 'Legal review on curated version. Optional escrow auto-approved.',
  CONTROLLED: 'AI-powered legal review + mandatory escrow deposit (parallel with FC).',
};
const ER_DESC: Record<GovernanceMode, string> = {
  QUICK: 'Expert evaluates submitted solutions against criteria.',
  STRUCTURED: 'Expert evaluates abstracts with documented rationale and weighted scoring.',
  CONTROLLED: 'Dual blind evaluation with anonymized scoring. Two reviewers required.',
};

const ROLE_HEADING: Record<GovernanceMode, string> = {
  QUICK: '👤 1 person — all roles merged (no role conflicts)',
  STRUCTURED: '👥 4 roles — sequential handoff (CR≠CU, CR≠ER enforced)',
  CONTROLLED: '👥 6 roles — full separation of duties (LC+FC parallel at Phase 3, dual blind ER at Phase 6)',
};

/** Build the demo user list dynamically based on engagement model and governance */
function buildDemoUsers(_engagementModel: string, mode: GovernanceMode = 'STRUCTURED'): DemoUser[] {
  if (mode === 'QUICK') {
    return [
      {
        email: 'nh-solo@testsetup.dev',
        displayName: 'Sam Solo',
        roles: ['CR', 'CU', 'ER', 'LC', 'FC'],
        description: 'All 5 roles merged to one person. Creates, auto-curates, auto-completes legal, and publishes in one flow.',
        destination: '/cogni/challenges/create',
        stepLabel: 'All Steps',
      },
    ];
  }

  if (mode === 'CONTROLLED') {
    return [
      {
        email: 'nh-cr@testsetup.dev',
        displayName: 'Chris Rivera',
        roles: ['CR'],
        description: CR_DESC.CONTROLLED,
        destination: '/cogni/challenges/create',
        stepLabel: 'Phase 1',
      },
      {
        email: 'nh-cu@testsetup.dev',
        displayName: 'Casey Underwood',
        roles: ['CU'],
        description: CU_DESC.CONTROLLED,
        destination: '/cogni/curation',
        stepLabel: 'Phase 2',
      },
      {
        email: 'nh-lc@testsetup.dev',
        displayName: 'Leslie Chen',
        roles: ['LC'],
        description: 'AI-powered legal review. Runs in parallel with escrow.',
        destination: '/cogni/lc-queue',
        stepLabel: 'Phase 3a',
      },
      {
        email: 'nh-fc@testsetup.dev',
        displayName: 'Frank Coleman',
        roles: ['FC'],
        description: 'Mandatory escrow deposit. Runs in parallel with legal review.',
        destination: '/cogni/escrow',
        stepLabel: 'Phase 3b',
      },
      {
        email: 'nh-er1@testsetup.dev',
        displayName: 'Evelyn Rhodes',
        roles: ['ER'],
        description: 'Dual blind evaluation — first reviewer. Solver identities hidden.',
        destination: '/cogni/review',
        stepLabel: 'Phase 6a',
      },
      {
        email: 'nh-er2@testsetup.dev',
        displayName: 'Ethan Russell',
        roles: ['ER'],
        description: 'Dual blind evaluation — second reviewer. Independent scoring required.',
        destination: '/cogni/review',
        stepLabel: 'Phase 6b',
      },
    ];
  }

  // STRUCTURED (default)
  return [
    {
      email: 'nh-cr@testsetup.dev',
      displayName: 'Chris Rivera',
      roles: ['CR'],
      description: CR_DESC.STRUCTURED,
      destination: '/cogni/challenges/create',
      stepLabel: 'Phase 1',
    },
    {
      email: 'nh-cu@testsetup.dev',
      displayName: 'Casey Underwood',
      roles: ['CU'],
      description: CU_DESC.STRUCTURED,
      destination: '/cogni/curation',
      stepLabel: 'Phase 2',
    },
    {
      email: 'nh-lc@testsetup.dev',
      displayName: 'Leslie Chen',
      roles: ['LC'],
      description: LC_DESC.STRUCTURED,
      destination: '/cogni/lc-queue',
      stepLabel: 'Phase 3',
    },
    {
      email: 'nh-er1@testsetup.dev',
      displayName: 'Evelyn Rhodes',
      roles: ['ER'],
      description: ER_DESC.STRUCTURED,
      destination: '/cogni/review',
      stepLabel: 'Phase 6',
    },
  ];
}

/** Static demo users list for dev quick-switch (uses default engagement model) */
export const DEMO_USERS: DemoUser[] = buildDemoUsers('MP', 'STRUCTURED');

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
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('QUICK');
  const [engagementModel, setEngagementModel] = useState<string>('MP');

  const handleLogin = useCallback(async (demoUser: DemoUser) => {
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
          .select('id, organization_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!orgRow) {
          await supabase.auth.signOut();
          toast.error('User not linked to any organization. Please click "Seed Demo Scenario" first, then try again.');
          return;
        }

        // Sync org operating_model to match selected engagement model
        try {
          const { error: updateErr } = await supabase
            .from('seeker_organizations')
            .update({ operating_model: engagementModel === 'MP' ? 'MP' : 'AGG' })
            .eq('id', orgRow.organization_id);
          if (updateErr) {
            logWarning('Operating model sync failed (RLS), will use edge function fallback', { operation: 'demo_login', component: 'DemoLoginPage', additionalData: { message: updateErr.message } });
            await supabase.functions.invoke('setup-test-scenario', {
              body: { action: 'sync_operating_model', orgId: orgRow.organization_id, operatingModel: engagementModel },
            });
          }
        } catch (syncErr) {
          logWarning('Operating model sync failed entirely, continuing login', { operation: 'demo_login', component: 'DemoLoginPage', additionalData: { syncErr: String(syncErr) } });
          toast.warning('Could not sync engagement model. The org may use its default model.');
        }
      }

      sessionStorage.setItem('cogni_demo_governance', governanceMode);
      sessionStorage.setItem('cogni_demo_engagement', engagementModel);
      localStorage.setItem('cogni_active_role', demoUser.roles[0]);

      toast.success(`Signed in as ${demoUser.displayName} (${demoUser.roles.join(', ')})`);
      navigate(demoUser.destination);
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

  const demoUsers = buildDemoUsers(engagementModel, governanceMode);

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
              New Horizon Company — Configure settings, then pick a role
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

        {/* Workflow Steps */}
        <DemoWorkflowSteps governanceMode={governanceMode} />

        {/* Role Cards */}
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" />
          Pick a Role to Login
        </h2>
        <p className="text-sm text-muted-foreground -mt-4">
          {ROLE_HEADING[governanceMode]}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {demoUsers.map((user) => (
            <DemoUserCard
              key={user.email}
              user={user}
              isLoading={loadingEmail === user.email}
              disabled={!!loadingEmail}
              onLogin={() => handleLogin(user)}
              getRoleBadge={getRoleBadge}
            />
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          All demo accounts use password: <code className="bg-muted px-1 rounded">TestSetup2026!</code>
        </p>
      </div>
    </div>
  );
}
