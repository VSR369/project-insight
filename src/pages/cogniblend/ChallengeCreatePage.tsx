/**
 * ChallengeCreatePage — Challenge creation landing page.
 * Route: /cogni/challenges/create
 *
 * CR role: 3 tracks — AI-Assisted, Manual Editor, or Simple 2-Tab Form.
 * Governance Mode and Engagement Model selected at top level.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Settings2, ArrowRight, ArrowLeft,
  Building2, ChevronLeft, Zap, Shield, Lock,
  ShieldCheck, Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';
import { ChallengeCreatorForm } from '@/components/cogniblend/creator/ChallengeCreatorForm';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';
import { cn } from '@/lib/utils';
import {
  resolveGovernanceMode,
  getAvailableGovernanceModes,
  getDefaultGovernanceMode,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { ConversationalIntakeContent } from './ConversationalIntakePage';
import ChallengeWizardPage from './ChallengeWizardPage';
import type { ChallengeTemplate } from '@/lib/challengeTemplates';
import type { GeneratedSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import { Skeleton } from '@/components/ui/skeleton';

type ActiveView = 'landing' | 'ai' | 'editor';

/** Shared state shape passed between AI intake and Advanced Editor */
export interface SharedIntakeState {
  problemStatement: string;
  maturityLevel: string;
  selectedTemplate: ChallengeTemplate | null;
  generatedSpec: GeneratedSpec | null;
}

/* ── Mode card config (shared with StepModeSelection) ── */

const MODE_CARDS: Array<{
  mode: GovernanceMode;
  icon: typeof Zap;
  features: string[];
}> = [
  {
    mode: 'QUICK',
    icon: Zap,
    features: [
      'Simplified workflow with fewer required fields',
      'Auto-completion & merged roles',
      'Auto-attached legal defaults',
      'Ideal for fast experiments & small challenges',
    ],
  },
  {
    mode: 'STRUCTURED',
    icon: Settings2,
    features: [
      'Full field set with manual curation',
      'Optional add-ons (escrow, targeting)',
      'Distinct creator & curator roles',
      'Best for standard enterprise challenges',
    ],
  },
  {
    mode: 'CONTROLLED',
    icon: ShieldCheck,
    features: [
      'Mandatory escrow & formal gates',
      'All legal documents required',
      'Strict role separation enforced',
      'Full compliance & audit trail',
    ],
  },
];

/* ── Track Card ── */
interface TrackCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'recommended' | 'mandatory' | 'optional';
  onClick: () => void;
  fullWidth?: boolean;
}

function TrackCard({ icon, title, description, badge, badgeVariant, onClick, fullWidth }: TrackCardProps) {
  const badgeColors = {
    recommended: 'bg-primary/10 text-primary border-primary/20',
    mandatory: 'bg-destructive/10 text-destructive border-destructive/20',
    optional: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex flex-col items-start gap-3 rounded-xl border border-border
        bg-card p-6 text-left transition-all hover:border-primary/40
        hover:shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.12)]
        active:scale-[0.98]
        ${fullWidth ? 'col-span-full' : ''}
      `}
    >
      {badge && (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeColors[badgeVariant ?? 'optional']}`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-1 group-hover:gap-2 transition-all">
        Get started <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* ── Governance Footer ── */
function GovernanceFooter({ mode }: { mode: string }) {
  const govMode = resolveGovernanceMode(mode);
  const config = GOVERNANCE_MODE_CONFIG[govMode];
  const icons = { QUICK: Zap, STRUCTURED: Shield, CONTROLLED: Lock };
  const Icon = icons[govMode];

  const descriptions: Record<string, string> = {
    QUICK: "After AI generation, you\u2019ll see a read-only spec review for 1-click confirmation.",
    STRUCTURED: "After AI generation, you\u2019ll review each section with Accept/Edit controls.",
    CONTROLLED: "After AI generation, you\u2019ll use a side-panel editor to manually apply or skip each AI suggestion.",
  };

  return (
    <div
      className="flex items-start gap-3 rounded-lg border px-4 py-3"
      style={{ borderColor: `${config.color}33`, backgroundColor: `${config.bg}80` }}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: config.color }} />
      <div className="text-xs" style={{ color: config.color }}>
        <span className="font-semibold">{config.label} mode:</span>{' '}
        {descriptions[govMode]}
      </div>
    </div>
  );
}

/* ── Governance & Engagement Selector (shared section) ── */

interface GovernanceEngagementSelectorProps {
  governanceMode: GovernanceMode;
  onGovernanceModeChange: (mode: GovernanceMode) => void;
  engagementModel: string;
  onEngagementModelChange: (model: string) => void;
  tierCode: string | null;
}

function GovernanceEngagementSelector({
  governanceMode,
  onGovernanceModeChange,
  engagementModel,
  onEngagementModelChange,
  tierCode,
}: GovernanceEngagementSelectorProps) {
  const availableModes = getAvailableGovernanceModes(tierCode);
  const disabledModes: GovernanceMode[] = (['QUICK', 'STRUCTURED', 'CONTROLLED'] as GovernanceMode[]).filter(
    (m) => !availableModes.includes(m),
  );

  return (
    <div className="space-y-8">
      {/* ═══ Governance Mode ═══ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Governance Mode</h3>
          <p className="text-sm text-muted-foreground">
            Choose how much structure and compliance this challenge requires.
            {tierCode && (
              <span className="ml-1 text-xs text-muted-foreground">
                (Your tier: <span className="font-medium capitalize">{tierCode}</span>)
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MODE_CARDS.map(({ mode, icon: Icon, features }) => {
            const cfg = GOVERNANCE_MODE_CONFIG[mode];
            const isSelected = governanceMode === mode;
            const isDisabled = disabledModes.includes(mode);

            return (
              <button
                key={mode}
                type="button"
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) onGovernanceModeChange(mode); }}
                className={cn(
                  'relative w-full text-left rounded-xl border-2 p-5 transition-all',
                  isSelected ? 'shadow-md ring-1' : 'hover:shadow-sm',
                  isDisabled && 'opacity-40 cursor-not-allowed',
                )}
                style={{
                  borderColor: isSelected ? cfg.color : 'hsl(var(--border))',
                  backgroundColor: isSelected ? cfg.bg : 'transparent',
                  ...(isSelected ? { boxShadow: `0 0 0 1px ${cfg.color}20` } : {}),
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {isSelected && (
                  <div
                    className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.color }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {isDisabled && (
                  <Badge variant="secondary" className="absolute top-2.5 right-2.5 text-[9px]">
                    Upgrade required
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Engagement Model ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Engagement Model</h3>
          <p className="text-sm text-muted-foreground">
            Select the engagement model for this challenge. This determines how solvers are engaged and managed.
          </p>
        </div>

        <Select value={engagementModel} onValueChange={onEngagementModelChange}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select engagement model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MP">Marketplace (MP) — Open competition</SelectItem>
            <SelectItem value="AGG">Aggregator (AGG) — Curated selection</SelectItem>
          </SelectContent>
        </Select>

        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5 max-w-sm">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {engagementModel === 'AGG'
              ? 'Aggregator model: solvers are curated and invited. Creator submits directly to Curator.'
              : 'Marketplace model: solvers discover and apply. Creator submits to platform Curator.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ChallengeCreatePage() {
  // ═══════ Hooks — state ═══════
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sharedState, setSharedState] = useState<SharedIntakeState>({
    problemStatement: '',
    maturityLevel: '',
    selectedTemplate: null,
    generatedSpec: null,
  });

  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('QUICK');
  const [engagementModel, setEngagementModel] = useState<string>('MP');

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();

  // ═══════ Hooks — effects ═══════
  useEffect(() => {
    const demoGov = sessionStorage.getItem('cogni_demo_governance') as GovernanceMode | null;
    if (demoGov && ['QUICK', 'STRUCTURED', 'CONTROLLED'].includes(demoGov)) {
      setGovernanceMode(demoGov);
      sessionStorage.removeItem('cogni_demo_governance');
    } else if (currentOrg) {
      setGovernanceMode(getDefaultGovernanceMode(currentOrg.tierCode, currentOrg.governanceProfile));
    }
  }, [currentOrg?.governanceProfile]);

  useEffect(() => {
    const demoEng = sessionStorage.getItem('cogni_demo_engagement');
    if (demoEng && ['MP', 'AGG'].includes(demoEng)) {
      setEngagementModel(demoEng);
      sessionStorage.removeItem('cogni_demo_engagement');
    } else if (orgContext?.operatingModel) {
      setEngagementModel(orgContext.operatingModel === 'AGG' ? 'AGG' : 'MP');
    }
  }, [orgContext?.operatingModel]);

  // ═══════ Handlers ═══════
  const handleSpecGenerated = useCallback((spec: GeneratedSpec) => {
    setSharedState((prev) => ({
      ...prev,
      generatedSpec: {
        ...spec,
        solver_eligibility_codes: spec.solver_eligibility_codes ?? [],
        solver_eligibility_details: spec.solver_eligibility_details ?? [],
        eligibility_notes: spec.eligibility_notes ?? '',
      },
    }));
  }, []);

  const handleIntakeStateChange = useCallback((partial: Partial<SharedIntakeState>) => {
    setSharedState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ═══════ Derived ═══════
  const demoPath = sessionStorage.getItem('cogni_demo_path');
  const paramTab = searchParams.get('tab');

  // Enforce path lock: if demoPath is set, block the opposite tab
  const resolvedTab = (() => {
    if (demoPath === 'ai' && paramTab === 'editor') return 'ai';
    if (demoPath === 'manual' && paramTab === 'ai') return 'editor';
    return paramTab;
  })();
  const activeView: ActiveView = resolvedTab === 'editor' ? 'editor' : resolvedTab === 'ai' ? 'ai' : 'landing';

  // Auto-redirect if path is locked and URL disagrees
  useEffect(() => {
    if (demoPath === 'ai' && paramTab === 'editor') {
      setSearchParams({ tab: 'ai' }, { replace: true });
    } else if (demoPath === 'manual' && paramTab === 'ai') {
      setSearchParams({ tab: 'editor' }, { replace: true });
    }
  }, [demoPath, paramTab, setSearchParams]);

  const setView = useCallback((view: ActiveView) => {
    if (view === 'landing') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: view }, { replace: true });
    }
  }, [setSearchParams]);

  const switchToEditor = useCallback(() => setView('editor'), [setView]);
  const switchToAI = useCallback(() => setView('ai'), [setView]);
  const backToLanding = useCallback(() => setView('landing'), [setView]);

  // Role-based auto-routing (via centralized permission hook)
  const { isSpecRole: isCreatorRole } = useCogniPermissions();

  // ═══════ Loading ═══════
  if (orgLoading || modelLoading) {
    return (
      <div className="space-y-6 px-6 pt-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  // ═══════ Hard guard: no org ═══════
  if (!currentOrg) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold text-foreground">Organization Not Found</h2>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to an organization yet. If you're using the demo, please seed
            the scenario first, then log in with a seeded role account.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline" size="sm">
              <Link to="/cogni/demo-login">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Go to Demo Login
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/cogni/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════ Shared selector props ═══════
  const selectorProps: GovernanceEngagementSelectorProps = {
    governanceMode,
    onGovernanceModeChange: setGovernanceMode,
    engagementModel,
    onEngagementModelChange: setEngagementModel,
    tierCode: currentOrg.tierCode,
  };

  // All creators now use the same flow (no separate AM/RQ intake)

  // ═══════ Inline views (AI / Editor) ═══════
  if (activeView === 'ai') {
    return (
      <div className="w-full">
        <div className="px-6 pt-2 pb-4 space-y-3">
          <Button variant="ghost" size="sm" onClick={backToLanding} className="gap-1.5 -ml-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <CreationContextBar />
        </div>
        <ConversationalIntakeContent
          onSwitchToEditor={demoPath === 'ai' ? undefined : switchToEditor}
          sharedState={sharedState}
          onStateChange={handleIntakeStateChange}
          onSpecGenerated={handleSpecGenerated}
          governanceMode={governanceMode}
          engagementModel={engagementModel}
        />
      </div>
    );
  }

  if (activeView === 'editor') {
    return (
      <div className="w-full">
        <div className="px-6 pt-2 pb-4 space-y-3">
          <Button variant="ghost" size="sm" onClick={backToLanding} className="gap-1.5 -ml-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <CreationContextBar />
        </div>
        <ChallengeWizardPage
          embedded
          onSwitchToSimple={demoPath === 'manual' ? undefined : switchToAI}
          initialFromIntake={sharedState}
          governanceMode={governanceMode}
          engagementModel={engagementModel}
        />
      </div>
    );
  }

  // ═══════ Landing View (CR cards) ═══════
  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      {/* Context Bar */}
      <CreationContextBar />

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">New Challenge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you'd like to get started.
        </p>
      </div>

      {/* Governance & Engagement Selectors */}
      <GovernanceEngagementSelector {...selectorProps} />

      {/* Track Cards — CR see 2 cards, filtered by demo path */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {demoPath !== 'manual' && (
          <TrackCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Describe Your Problem"
            description="Tell us about your challenge and AI generates a complete specification for you to review and refine."
            badge="Recommended"
            badgeVariant="recommended"
            onClick={() => setView('ai')}
          />
        )}
        {demoPath !== 'ai' && (
          <TrackCard
            icon={<Settings2 className="h-5 w-5" />}
            title="Build Spec Manually"
            description="Full control. Build your challenge step-by-step using the advanced editor with all fields and configurations."
            onClick={() => setView('editor')}
          />
        )}
      </div>

      {/* Governance Mode Explanation */}
      <GovernanceFooter mode={governanceMode} />
    </div>
  );
}
