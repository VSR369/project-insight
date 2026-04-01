/**
 * ChallengeCreatePage — Challenge creation page.
 * Route: /cogni/challenges/create
 *
 * Governance Mode + Engagement Model selected at top.
 * Then 2-tab ChallengeCreatorForm with governance-aware validation.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Zap, ShieldCheck, Info,
} from 'lucide-react';
import { Settings2 } from 'lucide-react';

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
import { CreatorOrgContextCard } from '@/components/cogniblend/creator/CreatorOrgContextCard';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { cn } from '@/lib/utils';
import {
  getAvailableGovernanceModes,
  getDefaultGovernanceMode,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Mode card config ── */

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

/* ── Governance & Engagement Selector ── */

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

  // Callback for draft resume to sync governance/engagement from loaded draft
  const handleDraftModeSync = useCallback((gov: GovernanceMode, eng: string) => {
    setGovernanceMode(gov);
    setEngagementModel(eng);
  }, []);

  // ═══════ Loading ═══════
  if (orgLoading || modelLoading) {
    return (
      <div className="space-y-6 px-6 pt-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 rounded-xl" />
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

  // ═══════ Render ═══════
  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      {/* Context Bar */}
      <CreationContextBar />

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">New Challenge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure governance and engagement, then fill out the challenge details.
        </p>
      </div>

      {/* Governance & Engagement Selectors */}
      <GovernanceEngagementSelector
        governanceMode={governanceMode}
        onGovernanceModeChange={setGovernanceMode}
        engagementModel={engagementModel}
        onEngagementModelChange={setEngagementModel}
        tierCode={currentOrg.tierCode}
      />

      {/* Organization Context Card */}
      <CreatorOrgContextCard
        organizationId={currentOrg.organizationId}
        governanceMode={governanceMode}
      />

      {/* Challenge Creator Form — governance-aware */}
      <ChallengeCreatorForm
        engagementModel={engagementModel}
        governanceMode={governanceMode}
        onDraftModeSync={useCallback((gov: GovernanceMode, eng: string) => {
          setGovernanceMode(gov);
          setEngagementModel(eng);
        }, [])}
      />
    </div>
  );
}
