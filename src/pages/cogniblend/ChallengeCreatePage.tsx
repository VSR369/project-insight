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
  ArrowLeft, Building2, Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

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

import {
  getAvailableGovernanceModes,
  getDefaultGovernanceMode,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Governance + Engagement Selector ── */

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
  const isLocked = availableModes.length <= 1;
  const cfg = GOVERNANCE_MODE_CONFIG[governanceMode];

  return (
    <div className="space-y-6">
      {/* Governance Mode */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Governance Mode</h3>
          <p className="text-sm text-muted-foreground">
            Controls review rigor, role separation, and compliance requirements for this challenge.
          </p>
        </div>

        {isLocked ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your tier uses{' '}
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>{' '}
              governance. Upgrade your subscription to access additional modes.
            </p>
          </div>
        ) : (
          <Select
            value={governanceMode}
            onValueChange={(v) => onGovernanceModeChange(v as GovernanceMode)}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModes.map((mode) => {
                const mc = GOVERNANCE_MODE_CONFIG[mode];
                return (
                  <SelectItem key={mode} value={mode}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: mc.color }}
                      />
                      {mc.label}
                      <span className="text-muted-foreground text-xs ml-1">
                        — {mc.tooltip.split(': ')[1] ?? mc.tooltip}
                      </span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Engagement Model */}
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
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('STRUCTURED');
  const [engagementModel, setEngagementModel] = useState<string>('MP');
  const [orgFillTrigger, setOrgFillTrigger] = useState(0);
  const [draftChallengeId, setDraftChallengeId] = useState<string | null>(null);

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();

  // ═══════ Hooks — effects ═══════
  useEffect(() => {
    const demoGov = sessionStorage.getItem('cogni_demo_governance') as GovernanceMode | null;
    sessionStorage.removeItem('cogni_demo_governance');

    if (currentOrg) {
      const available = getAvailableGovernanceModes(currentOrg.tierCode);
      if (demoGov && available.includes(demoGov)) {
        setGovernanceMode(demoGov);
      } else {
        setGovernanceMode(getDefaultGovernanceMode(currentOrg.tierCode, currentOrg.governanceProfile));
      }
    }
  }, [currentOrg]);

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
          Select your governance mode and engagement model, then fill out the challenge details.
        </p>
      </div>

      {/* Governance + Engagement Selector */}
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
        fillTrigger={orgFillTrigger}
        challengeId={draftChallengeId ?? undefined}
      />

      {/* Challenge Creator Form — governance-aware */}
      <ChallengeCreatorForm
        key={`${governanceMode}-${engagementModel}`}
        engagementModel={engagementModel}
        governanceMode={governanceMode}
        onDraftModeSync={handleDraftModeSync}
        onFillTestData={() => setOrgFillTrigger((n) => n + 1)}
        onDraftIdChange={setDraftChallengeId}
      />
    </div>
  );
}
