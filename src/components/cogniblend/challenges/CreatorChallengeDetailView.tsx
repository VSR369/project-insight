/**
 * CreatorChallengeDetailView — Dual-tab view: My Version (snapshot) + Curator Version (live).
 * Mutations delegated to useCreatorChallengeMutations hook.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Globe, Search, BookOpen, Info, FileText,
} from 'lucide-react';
import { ChallengeConfigSummary } from './ChallengeConfigSummary';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilteredSections, type SectionDef } from './CreatorSectionRenderers';
import { buildMyVersionSections, buildCuratorSections } from './CreatorSectionBuilders';
import type { PublicChallengeData } from '@/hooks/cogniblend/usePublicChallenge';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { governanceLabel, complexityColor } from '@/lib/cogniblend/displayHelpers';
import { SECTION_LABELS } from '@/components/cogniblend/curation/context-library/types';
import { CurationProgressTracker } from '@/components/cogniblend/progress/CurationProgressTracker';
import { TieredApprovalView } from '@/components/cogniblend/approval/TieredApprovalView';
import { ChallengeQASection } from '@/components/cogniblend/solver/ChallengeQASection';

interface CreatorChallengeDetailViewProps {
  data: PublicChallengeData;
  challengeId: string;
}

export function CreatorChallengeDetailView({ data, challengeId }: CreatorChallengeDetailViewProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const effectiveGovernance = resolveGovernanceMode(
    data.governance_mode_override ?? data.governance_profile,
  );
  const snapshot = (data as unknown as Record<string, unknown>).creator_snapshot as Record<string, unknown> | null;
  const hasSnapshot = !!snapshot && Object.keys(snapshot).length > 0;
  const isPendingApproval = data.phase_status === 'CR_APPROVAL_PENDING';

  // Governance-aware content visibility
  const isQuickMode = effectiveGovernance === 'QUICK';

  const creatorKeys = useMemo(() => {
    const keys: Record<string, string[]> = {
      QUICK: ['problem_statement', 'domain_tags', 'platinum_award'],
      STRUCTURED: ['problem_statement', 'scope', 'domain_tags', 'maturity_level', 'platinum_award', 'weighted_criteria'],
      CONTROLLED: ['problem_statement', 'scope', 'domain_tags', 'maturity_level', 'platinum_award', 'weighted_criteria', 'hook', 'context_background', 'ip_model', 'expected_timeline'],
    };
    return keys[effectiveGovernance] ?? keys.STRUCTURED;
  }, [effectiveGovernance]);

  const statusMessage = useMemo(() => {
    const phase = data.current_phase ?? 1;
    if (phase === 1) return 'Draft — complete your challenge and submit';
    if (isQuickMode) {
      if (phase >= 4) return 'Published — waiting for solver submissions';
      return 'Processing — your challenge is being prepared for publication';
    }
    if (phase === 2) return 'In Curation — Curator is reviewing and enriching your challenge';
    if (phase === 3) return 'Compliance Review — Legal and financial review in progress';
    if (phase >= 4) return 'Published — your challenge is live!';
    return '';
  }, [data.current_phase, isQuickMode]);

  // Curator Version shows only AFTER curation (Phase 2) is completed:
  //   Phase 3+ means Curator finished their review
  //   isPendingApproval means Curator submitted for Creator sign-off
  const showCuratorContent = isPendingApproval
    || (data.current_phase ?? 1) >= 3;

  const myVersionSections: SectionDef[] = useMemo(() => {
    if (!snapshot) return [];
    return buildMyVersionSections(snapshot, effectiveGovernance);
  }, [snapshot, effectiveGovernance]);

  const curatorSections: SectionDef[] = useMemo(() => {
    return buildCuratorSections(data, effectiveGovernance);
  }, [data, effectiveGovernance]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/my-challenges')} className="text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> My Challenges
      </Button>

      <div className="space-y-4">
        {(data.organization_name || data.industry_name) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {(data.organization_name || data.trade_brand_name) && (
              <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{data.trade_brand_name || data.organization_name}</span>
            )}
            {data.industry_name && (
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" />{data.industry_name}</span>
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold text-primary tracking-tight leading-tight">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {data.master_status === 'IN_PREPARATION' && (
            <Badge variant="outline" className="text-xs font-semibold border-amber-300 text-amber-700 bg-amber-50">
              {data.current_phase === 1
                ? 'Draft'
                : data.phase_status === 'CR_APPROVAL_PENDING'
                  ? 'Awaiting Your Approval'
                  : isQuickMode ? 'Processing' : 'In Curation'}
            </Badge>
          )}
          {data.master_status === 'ACTIVE' && <Badge variant="outline" className="text-xs font-semibold border-emerald-300 text-emerald-700 bg-emerald-50">Published</Badge>}
          {data.master_status === 'COMPLETED' && <Badge variant="outline" className="text-xs font-semibold border-blue-300 text-blue-700 bg-blue-50">Completed</Badge>}
          {data.governance_profile && <Badge variant="secondary" className="text-xs font-semibold">{governanceLabel(data.governance_profile)}</Badge>}
          {data.complexity_level && (
            <Badge className={cn('text-xs font-semibold border', complexityColor(data.complexity_level))}>
              {data.complexity_level}{data.complexity_score != null && ` — ${Number(data.complexity_score).toFixed(1)}`}
            </Badge>
          )}
          {data.operating_model && (
            <Badge variant="outline" className="text-xs font-semibold">
              {data.operating_model === 'MP' ? 'Marketplace' : 'Aggregator'}
            </Badge>
          )}
          {data.current_phase != null && <Badge variant="outline" className="text-xs font-semibold">Phase {data.current_phase}</Badge>}
        </div>
      </div>

      <ChallengeConfigSummary
        effectiveGovernance={effectiveGovernance}
        operatingModel={data.operating_model as string | null}
        rewardStructure={data.reward_structure as Record<string, unknown> | null}
        currencyCode={data.currency_code as string | null}
        industryName={data.industry_name as string | null}
        domainTags={data.domain_tags as unknown[] | null}
        currentPhase={data.current_phase ?? null}
      />

      {!isQuickMode && data.current_phase != null && data.current_phase >= 2
        && data.current_phase <= 3 && data.phase_status !== 'CR_APPROVAL_PENDING' && (
        <CurationProgressTracker challengeId={challengeId} />
      )}

      {isPendingApproval && (
        <TieredApprovalView challengeId={challengeId} challengeData={data as unknown as Record<string, unknown>} creatorSnapshot={snapshot as Record<string, unknown> | null} governanceMode={effectiveGovernance} sectionLabels={SECTION_LABELS} />
      )}

      {isQuickMode ? (
        /* ── QUICK MODE: Single view — Creator is the Curator ── */
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          {hasSnapshot ? (
            <FilteredSections sections={myVersionSections} searchTerm={searchTerm} creatorFieldKeys={creatorKeys} />
          ) : (
            <FilteredSections sections={curatorSections} searchTerm={searchTerm} creatorFieldKeys={creatorKeys} />
          )}
        </div>
      ) : (
        /* ── STRUCTURED / CONTROLLED: Dual tabs ── */
        <Tabs defaultValue={isPendingApproval ? 'curator-version' : hasSnapshot ? 'my-version' : 'curator-version'} className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <TabsList className="w-auto">
              <TabsTrigger value="my-version" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> My Version
              </TabsTrigger>
              <TabsTrigger value="curator-version" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" /> Curator Version
              </TabsTrigger>
            </TabsList>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search sections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          </div>

          <TabsContent value="my-version" className="space-y-4">
            {hasSnapshot ? (
              <FilteredSections sections={myVersionSections} searchTerm={searchTerm} creatorFieldKeys={creatorKeys} />
            ) : (
              <Card className="border-dashed border-amber-300 bg-amber-50/50">
                <CardContent className="py-8 text-center">
                  <Info className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-amber-800">Original submission data is not available</p>
                  <p className="text-xs text-amber-600 mt-1">This challenge was created before snapshot tracking was enabled. Please view the Curator Version instead.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="curator-version" className="space-y-4">
            {showCuratorContent ? (
              <FilteredSections sections={curatorSections} searchTerm={searchTerm} creatorFieldKeys={creatorKeys} />
            ) : (
              <Card className="border-dashed border-primary/30 bg-primary/5">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                  <p className="text-base font-semibold text-foreground">Under Review by Curator</p>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                    This challenge is currently being reviewed and refined by the Curator.
                    The curated version will be available once the review is complete.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <ChallengeQASection challengeId={challengeId} />
      <div className="pb-8" />
    </div>
  );
}
