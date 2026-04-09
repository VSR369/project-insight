/**
 * ChallengeCreatePage — Challenge creation page.
 * Route: /cogni/challenges/create
 *
 * Step 1: ChallengeConfigurationPanel (Industry + Governance + Engagement)
 * Step 2: ChallengeCreatorForm (governance-aware 2-tab form)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { Button } from '@/components/ui/button';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';
import { ChallengeCreatorForm } from '@/components/cogniblend/creator/ChallengeCreatorForm';
import { CreatorOrgContextCard } from '@/components/cogniblend/creator/CreatorOrgContextCard';
import { ChallengeConfigurationPanel } from '@/components/cogniblend/creator/ChallengeConfigurationPanel';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useOrgContext';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import {
  getAvailableGovernanceModes,
  getDefaultGovernanceMode,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const FIELD_COUNTS: Record<GovernanceMode, number> = { QUICK: 5, STRUCTURED: 8, CONTROLLED: 12 };

export default function ChallengeCreatePage() {
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('STRUCTURED');
  const [engagementModel, setEngagementModel] = useState<string>('MP');
  const [industrySegmentId, setIndustrySegmentId] = useState<string>('');
  const [orgFillTrigger, setOrgFillTrigger] = useState(0);
  const [draftChallengeId, setDraftChallengeId] = useState<string | null>(null);

  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();

  useEffect(() => {
    if (!orgContext || industrySegmentId) return;
    const ctx = orgContext as unknown as Record<string, unknown>;
    const orgIndustry = ctx?.primaryIndustryId as string | undefined;
    if (orgIndustry) setIndustrySegmentId(orgIndustry);
  }, [orgContext]);

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

  const handleDraftModeSync = useCallback((gov: GovernanceMode, eng: string, industry?: string) => {
    setGovernanceMode(gov);
    setEngagementModel(eng);
    if (industry) setIndustrySegmentId(industry);
  }, []);

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

  if (!currentOrg) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold text-foreground">Organization Not Found</h2>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to an organization yet. Use the demo to seed a scenario first.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline" size="sm">
              <Link to="/cogni/demo-login"><ArrowLeft className="h-4 w-4 mr-1.5" />Demo Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      <CreationContextBar />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">New Challenge</h1>
          <span className="text-muted-foreground font-medium">::</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Org level:</span>
          <GovernanceProfileBadge profile={currentOrg.governanceProfile} compact />
          <span className="text-muted-foreground font-medium">;</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Challenge level:</span>
          <GovernanceProfileBadge profile={governanceMode} compact />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your challenge settings, then fill out the details below.
        </p>
      </div>

      {/* ═══ STEP 1 — CONFIGURE ═══ */}
      <div className="rounded-xl border-2 border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-bold">Step 1</Badge>
          <span className="text-sm font-semibold text-foreground">Configure</span>
          <GovernanceProfileBadge profile={governanceMode} compact />
        </div>
        <ChallengeConfigurationPanel
          industrySegmentId={industrySegmentId}
          onIndustrySegmentChange={setIndustrySegmentId}
          industrySegments={industrySegments}
          governanceMode={governanceMode}
          onGovernanceModeChange={setGovernanceMode}
          engagementModel={engagementModel}
          onEngagementModelChange={setEngagementModel}
          tierCode={currentOrg.tierCode}
        />
      </div>

      <CreatorOrgContextCard
        organizationId={currentOrg.organizationId}
        governanceMode={governanceMode}
        fillTrigger={orgFillTrigger}
        challengeId={draftChallengeId ?? undefined}
      />

      {/* ═══ STEP 2 — CREATE ═══ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-bold">Step 2</Badge>
          <span className="text-sm font-semibold text-foreground">Create</span>
          <Badge variant="secondary" className="text-[10px]">{FIELD_COUNTS[governanceMode]} required fields</Badge>
        </div>
        <ChallengeCreatorForm
          key={`${governanceMode}-${engagementModel}`}
          engagementModel={engagementModel}
          governanceMode={governanceMode}
          industrySegmentId={industrySegmentId}
          onDraftModeSync={handleDraftModeSync}
          onFillTestData={() => setOrgFillTrigger((n) => n + 1)}
          onDraftIdChange={setDraftChallengeId}
        />
      </div>
    </div>
  );
}
