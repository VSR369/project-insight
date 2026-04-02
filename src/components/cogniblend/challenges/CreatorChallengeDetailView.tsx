/**
 * CreatorChallengeDetailView — Dual-tab view: My Version (snapshot) + Curator Version (live).
 * Vertical scrolling with search filter on section headings.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Building2, Globe, Search, Target, Layers, BookOpen,
  Info, Trophy, Clock, Tag, Briefcase, MapPin, ListChecks, BarChart3,
  FileText, Scale, ShieldCheck, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  parseItems,
  parseStakeholders,
  RichTextSection,
  BadgeSection,
  ListSection,
  WeightedCriteriaSection,
  TagsSection,
  FilteredSections,
  type SectionDef,
} from './CreatorSectionRenderers';
import { buildMyVersionSections, buildCuratorSections } from './CreatorSectionBuilders';
import type { PublicChallengeData } from '@/hooks/cogniblend/usePublicChallenge';
import { getMaturityLabel } from '@/lib/maturityLabels';
import { ChallengeQASection } from '@/components/cogniblend/solver/ChallengeQASection';
import { useGovernanceFieldRules } from '@/hooks/queries/useGovernanceFieldRules';
import { resolveChallengeGovernance } from '@/lib/governanceMode';
import { formatCurrency, governanceLabel, complexityColor } from '@/lib/cogniblend/displayHelpers';
import { SECTION_LABELS } from '@/components/cogniblend/curation/context-library/types';
import { CurationProgressTracker } from '@/components/cogniblend/progress/CurationProgressTracker';
import { TieredApprovalView } from '@/components/cogniblend/approval/TieredApprovalView';

/* ─── Main Component ─────────────────────────────────────── */

interface CreatorChallengeDetailViewProps {
  data: PublicChallengeData;
  challengeId: string;
}

export function CreatorChallengeDetailView({ data, challengeId }: CreatorChallengeDetailViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve effective governance mode and fetch field rules
  const effectiveGovernance = resolveChallengeGovernance(
    data.governance_mode_override,
    data.governance_profile,
    null // tier ceiling not needed for display filtering
  );
  const { data: fieldRules } = useGovernanceFieldRules(effectiveGovernance);

  const snapshot = (data as any).creator_snapshot as Record<string, unknown> | null;
  const hasSnapshot = !!snapshot && Object.keys(snapshot).length > 0;
  const isPendingApproval = data.phase_status === 'CR_APPROVAL_PENDING';

  // Approve mutation — advances from CR_APPROVAL_PENDING to phase 4
  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('challenges')
        .update({ phase_status: 'COMPLETED' } as any)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Audit
      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'CR_APPROVED_CURATION',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: {} as any,
      });
    },
    onSuccess: () => {
      toast.success('Challenge approved — proceeding to publication.');
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge'] });
    },
    onError: (err: Error) => toast.error(`Approval failed: ${err.message}`),
  });

  // Request Changes mutation — set back to RETURNED
  const requestChangesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('challenges')
        .update({ phase_status: 'RETURNED' } as any)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'CR_REQUESTED_CHANGES',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: {} as any,
      });
    },
    onSuccess: () => {
      toast.success('Returned to Curator for further refinement.');
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge'] });
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });

  /* ── Build "My Version" sections from snapshot ── */
  const myVersionSections: SectionDef[] = useMemo(() => {
    if (!snapshot) return [];
    return buildMyVersionSections(snapshot);
  }, [snapshot]);

  /* ── Build "Curator Version" sections from live challenge data ── */
  const curatorSections: SectionDef[] = useMemo(() => {
    return buildCuratorSections(data);
  }, [data]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/cogni/my-challenges')}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> My Challenges
      </Button>

      {/* Hero */}
      <div className="space-y-4">
        {(data.organization_name || data.industry_name) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {(data.organization_name || data.trade_brand_name) && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {data.trade_brand_name || data.organization_name}
              </span>
            )}
            {data.industry_name && (
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                {data.industry_name}
              </span>
            )}
          </div>
        )}

        <h1 className="text-2xl font-bold text-primary tracking-tight leading-tight">
          {data.title}
        </h1>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          {data.master_status === 'IN_PREPARATION' && (
            <Badge variant="outline" className="text-xs font-semibold border-amber-300 text-amber-700 bg-amber-50">
              {data.current_phase === 1 ? 'Draft' : (
                data.phase_status === 'CR_APPROVAL_PENDING' ? 'Awaiting Your Approval' : 'In Curation'
              )}
            </Badge>
          )}
          {data.master_status === 'ACTIVE' && (
            <Badge variant="outline" className="text-xs font-semibold border-emerald-300 text-emerald-700 bg-emerald-50">
              Published
            </Badge>
          )}
          {data.master_status === 'COMPLETED' && (
            <Badge variant="outline" className="text-xs font-semibold border-blue-300 text-blue-700 bg-blue-50">
              Completed
            </Badge>
          )}
          {data.governance_profile && (
            <Badge variant="secondary" className="text-xs font-semibold">
              {governanceLabel(data.governance_profile)}
            </Badge>
          )}
          {data.complexity_level && (
            <Badge className={cn('text-xs font-semibold border', complexityColor(data.complexity_level))}>
              {data.complexity_level}
              {data.complexity_score != null && ` — ${Number(data.complexity_score).toFixed(1)}`}
            </Badge>
          )}
          {data.current_phase != null && (
            <Badge variant="outline" className="text-xs font-semibold">
              Phase {data.current_phase}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Curation Progress Tracker (live, shown during curation only) ── */}
      {data.current_phase != null && data.current_phase >= 2 && data.current_phase <= 3
        && data.phase_status !== 'CR_APPROVAL_PENDING' && (
        <CurationProgressTracker challengeId={challengeId} />
      )}

      {/* ── Creator Tiered Approval View ── */}
      {isPendingApproval && (
        <TieredApprovalView
          challengeId={challengeId}
          challengeData={data as unknown as Record<string, unknown>}
          creatorSnapshot={snapshot as Record<string, unknown> | null}
          governanceMode={effectiveGovernance}
          sectionLabels={SECTION_LABELS}
        />
      )}

      {/* Dual-tab view */}
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
            <Input
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* My Version tab */}
        <TabsContent value="my-version" className="space-y-4">
          {hasSnapshot ? (
            <FilteredSections sections={myVersionSections} searchTerm={searchTerm} fieldRules={fieldRules} />
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

        {/* Curator Version tab */}
        <TabsContent value="curator-version" className="space-y-4">
          {(isPendingApproval || (data.current_phase ?? 1) > 3 || ((data.current_phase ?? 1) === 3 && data.phase_status === 'COMPLETED')) ? (
            <FilteredSections sections={curatorSections} searchTerm={searchTerm} fieldRules={fieldRules} />
          ) : (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                <p className="text-base font-semibold text-foreground">Under Review by Curator</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                  This challenge is currently being reviewed and refined by the Curator.
                  The curated version will be available once the review is complete and submitted for approval.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Q&A section */}
      <ChallengeQASection challengeId={challengeId} />
      <div className="pb-8" />
    </div>
  );
}
