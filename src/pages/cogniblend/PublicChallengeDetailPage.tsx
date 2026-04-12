/**
 * PublicChallengeDetailPage — Role-aware challenge detail view.
 * - Creator (CR role): Shows dual-tab view (My Version / Curator Version).
 * - Others/Solvers: Shows solver-oriented view with enrollment CTA, Q&A, legal.
 * Route: /cogni/challenges/:id/view
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, Calendar, ShieldCheck, Trophy, Clock, FileText,
  Target, BarChart3, ListChecks, ArrowLeft, Scale, Lock, Briefcase,
  Building2, Globe, Info, Layers, BookOpen, MapPin, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePublicChallenge } from '@/hooks/cogniblend/usePublicChallenge';
import { getMaturityLabel } from '@/lib/maturityLabels';
import { usePublicChallengeLegal } from '@/hooks/cogniblend/usePublicChallengeLegal';
import { useSolverAmendmentStatus } from '@/hooks/cogniblend/useSolverAmendmentStatus';
import { useLegalReacceptanceStatus } from '@/hooks/cogniblend/useLegalReacceptance';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useAuth } from '@/hooks/useAuth';
import { WithdrawalBanner } from '@/components/cogniblend/solver/WithdrawalBanner';
import { LegalReAcceptModal } from '@/components/cogniblend/solver/LegalReAcceptModal';
import { ChallengeQASection } from '@/components/cogniblend/solver/ChallengeQASection';
import { SolverEnrollmentCTA } from '@/components/cogniblend/solver/SolverEnrollmentCTA';
import { CreatorChallengeDetailView } from '@/components/cogniblend/challenges/CreatorChallengeDetailView';
import { formatCurrency, complexityColor, governanceLabel } from '@/lib/cogniblend/displayHelpers';

/* complexityColor, formatCurrency, governanceLabel imported from displayHelpers */

/** Map challenge_enrollment or legacy eligibility to BRD enrollment model code */
function deriveEnrollmentModel(challengeEnrollment: string | null, eligibility: string | null): string {
  if (challengeEnrollment) {
    const map: Record<string, string> = {
      open_auto: 'OPEN',
      direct_nda: 'DR',
      org_curated: 'OC',
      curator_approved: 'CE',
      invitation_only: 'IO',
    };
    return map[challengeEnrollment] ?? 'OPEN';
  }
  if (eligibility === 'invited_only') return 'IO';
  if (eligibility === 'curated_experts') return 'CE';
  return 'OPEN';
}

/** Render a text/html content section with null guard */
function ContentSection({ title, content, icon: Icon }: { title: string; content: string | null | undefined; icon?: React.ElementType }) {
  if (!content) return null;
  const SectionIcon = Icon || Info;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <SectionIcon className="h-3.5 w-3.5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SafeHtmlRenderer html={content} />
      </CardContent>
    </Card>
  );
}

/* ─── Component ──────────────────────────────────────────── */

export default function PublicChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data, isLoading, error } = usePublicChallenge(id);
  const { data: userRoles } = useUserChallengeRoles(user?.id, id);
  const { data: amendStatus } = useSolverAmendmentStatus(id, user?.id);
  const { data: reacceptStatus } = useLegalReacceptanceStatus(id, user?.id);
  const { data: legalSummary } = usePublicChallengeLegal(id);

  const [legalModalOpen, setLegalModalOpen] = useState(false);

  // Determine if viewer is the Creator
  const isCreator = (userRoles ?? []).includes('CR');

  // Auto-open modal when solver has pending re-acceptance (solver-only)
  useEffect(() => {
    if (!isCreator && reacceptStatus?.hasPending && !legalModalOpen) {
      setLegalModalOpen(true);
    }
  }, [reacceptStatus?.hasPending, isCreator]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Not found / visibility blocked ── */
  if (error || !data || !data.isVisible) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Challenge Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This challenge doesn't exist, hasn't been published yet, or you don't have permission to view it.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(isCreator ? '/cogni/my-challenges' : '/cogni/browse')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {isCreator ? 'My Challenges' : 'Browse Challenges'}
        </Button>
      </div>
    );
  }

  /* ── Extract shared data ── */
  const rs = data.reward_structure ?? {};
  const currency = data.currency_code || 'USD';
  const platinumAward = Number(rs.platinum_award ?? rs.budget_max ?? 0);
  const goldAward = Number(rs.gold_award ?? 0);
  const silverAward = Number(rs.silver_award ?? 0);
  const evalCriteria = data.evaluation_criteria as Record<string, unknown> | null;
  const weightedCriteria = (evalCriteria?.weighted_criteria ?? evalCriteria?.criteria ?? []) as Array<{ name: string; weight: number }>;
  const deliverables = data.deliverables as Record<string, unknown> | null;
  const deliverablesList = (deliverables?.deliverables_list ?? deliverables?.items ?? []) as any[];
  const artifactTypes = (deliverables?.permitted_artifact_types ?? []) as string[];
  const guidelines = (deliverables?.submission_guidelines ?? data.description ?? '') as string;
  const phaseSchedule = data.phase_schedule as Record<string, unknown> | null;

  // Extended brief subsections
  const eb = data.extended_brief ?? {};
  const ebContextBackground = eb.context_background as string | undefined;
  const ebRootCauses = eb.root_causes as string | undefined;
  const ebAffectedStakeholders = eb.affected_stakeholders as string | undefined;
  const ebCurrentDeficiencies = eb.current_deficiencies as string | undefined;
  const ebPreferredApproach = eb.preferred_approach as string | undefined;
  const ebApproachesNot = eb.approaches_not_of_interest as string | undefined;

  // Expected outcomes
  const expectedOutcomes = data.expected_outcomes;
  const outcomeItems = (expectedOutcomes as any)?.items as Array<{ name: string }> | undefined;

  // Success metrics
  const successMetrics = data.success_metrics_kpis;
  const metricsItems = (successMetrics as any)?.items as Array<{ name: string; target?: string }> | undefined;

  // Domain tags
  const domainTags = data.domain_tags as string[] | null;

  /* ── CREATOR VIEW ──────────────────────────────────────── */
  if (isCreator) {
    return <CreatorChallengeDetailView data={data} challengeId={id!} />;
  }

  /* ── SOLVER VIEW (existing behavior) ───────────────────── */

  const enrollmentModel = deriveEnrollmentModel(data.challenge_enrollment, data.eligibility);
  const eligibilityLabel: Record<string, string> = {
    anyone: 'open submissions',
    registered_users: 'Registered Users',
    curated_experts: 'Curated Experts',
    invited_only: 'Invited Experts',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/cogni/browse')}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Browse Challenges
      </Button>

      {/* HERO SECTION */}
      <div className="space-y-5">
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

        <div className="flex flex-wrap items-center gap-2">
          {!data.published_at && (
            <Badge variant="outline" className="text-xs font-semibold border-amber-300 text-amber-700 bg-amber-50">
              In Preparation
            </Badge>
          )}
          {data.maturity_level && (
            <Badge variant="secondary" className="text-xs font-semibold border border-border">
              {getMaturityLabel(data.maturity_level)}
            </Badge>
          )}
          {data.complexity_level && (
            <Badge className={cn('text-xs font-semibold border', complexityColor(data.complexity_level))}>
              {data.complexity_level}
              {data.complexity_score != null && ` — ${Number(data.complexity_score).toFixed(1)}`}
            </Badge>
          )}
          {data.operating_model && (
            <Badge variant="outline" className="text-xs font-semibold">
              {data.operating_model === 'MP' ? 'Marketplace' : 'Aggregator'}
            </Badge>
          )}
          {data.escrowFunded && (
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100">
              <ShieldCheck className="h-3 w-3 mr-1" /> Solution Provider Protected
            </Badge>
          )}
        </div>

        {/* Awards + Deadline + CTA row */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 inline mr-1 -mt-0.5" /> Platinum Award
              </p>
              <p className="text-3xl font-bold text-foreground tracking-tight">
                {formatCurrency(platinumAward, currency)}
              </p>
              {(goldAward > 0 || silverAward > 0) && (
                <p className="text-sm text-muted-foreground">
                  {goldAward > 0 && `Gold: ${formatCurrency(goldAward, currency)}`}
                  {goldAward > 0 && silverAward > 0 && ' | '}
                  {silverAward > 0 && `Silver: ${formatCurrency(silverAward, currency)}`}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {data.daysRemaining != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className={cn(
                    'font-semibold',
                    data.daysRemaining <= 7 ? 'text-destructive' : 'text-foreground'
                  )}>
                    {data.daysRemaining} day{data.daysRemaining !== 1 ? 's' : ''} remaining
                  </span>
                </div>
              )}

              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <SolverEnrollmentCTA
                  challengeId={data.id}
                  tenantId={data.tenant_id}
                  enrollmentModel={enrollmentModel}
                  isEligible={data.isEligible}
                  eligibilityLabel={eligibilityLabel[data.eligibility ?? '']}
                  isAggModel={data.operating_model === 'AGG'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WITHDRAWAL BANNER */}
      {amendStatus?.hasActiveWithdrawal && amendStatus.solutionId && (
        <WithdrawalBanner
          challengeId={id!}
          challengeTitle={data.title}
          userId={user?.id ?? ''}
          solutionId={amendStatus.solutionId}
          amendmentId={amendStatus.amendmentId!}
          withdrawalDeadline={amendStatus.withdrawalDeadline!}
          daysRemaining={amendStatus.daysRemaining!}
          scopeAreas={amendStatus.scopeAreas}
          reason={amendStatus.reason}
        />
      )}

      {/* LEGAL RE-ACCEPTANCE BANNER */}
      {amendStatus?.requiresLegalReAcceptance && (
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-foreground">Legal Terms Updated</p>
            <p className="text-xs text-muted-foreground">
              You must accept the updated legal terms before submitting new work.
            </p>
          </div>
          <Button size="sm" onClick={() => setLegalModalOpen(true)}>
            Review & Accept
          </Button>
        </div>
      )}

      {/* TABBED CONTENT — Solver view */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Evaluation
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" /> Guidelines
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-5">
          <ContentSection title="Problem Statement" content={data.problem_statement} icon={Target} />
          <ContentSection title="Scope & Expected Outcomes" content={data.scope} icon={Layers} />

          {deliverablesList.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Deliverables</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {deliverablesList.filter(Boolean).map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      {typeof item === 'string' ? item : (item?.name ?? item?.title ?? JSON.stringify(item))}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.maturity_level && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Maturity Level</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {getMaturityLabel(data.maturity_level)}
                </Badge>
              </CardContent>
            </Card>
          )}

          {!data.problem_statement && !data.scope && deliverablesList.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground italic">No overview content available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evaluation Tab */}
        <TabsContent value="evaluation" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">Evaluation Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              {weightedCriteria.length > 0 ? (
                <div className="relative w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criterion</th>
                        <th className="text-right py-2 pl-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weightedCriteria.map((criterion, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-4 text-foreground font-medium">{criterion.name}</td>
                          <td className="py-2.5 pl-4 text-right">
                            <Badge variant="secondary" className="text-xs font-bold tabular-nums">{criterion.weight}%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td className="py-2.5 pr-4 text-xs font-bold text-muted-foreground">Total</td>
                        <td className="py-2.5 pl-4 text-right">
                          <Badge variant="outline" className="text-xs font-bold tabular-nums">
                            {weightedCriteria.reduce((sum, c) => sum + c.weight, 0)}%
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No evaluation criteria defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guidelines Tab */}
        <TabsContent value="guidelines" className="space-y-4">
          {guidelines ? (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Submission Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{guidelines}</p>
              </CardContent>
            </Card>
          ) : null}

          {artifactTypes.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Permitted Artifact Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {artifactTypes.map((type, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-medium">{type}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!guidelines && artifactTypes.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground italic">No submission guidelines provided.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">Phase Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {phaseSchedule && Object.keys(phaseSchedule).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(phaseSchedule).map(([key, value]) => {
                    if (key === 'expected_timeline') {
                      return (
                        <div key={key} className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border px-4 py-3">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Timeline</p>
                            <p className="text-sm text-foreground font-medium">{String(value)}</p>
                          </div>
                        </div>
                      );
                    }
                    const phaseLabel = key.replace(/_/g, ' ').replace(/phase\s?/i, 'Phase ');
                    return (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3">
                        <p className="text-[13px] font-semibold text-foreground capitalize">{phaseLabel}</p>
                        <Badge variant="outline" className="text-xs font-bold tabular-nums">{String(value)} days</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No phase schedule defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* LEGAL & IP PROTECTION SUMMARY */}
      {legalSummary && (legalSummary.hasNda || data.ip_model || data.escrowFunded || legalSummary.tier2DocCount > 0) && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Legal & IP Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {legalSummary.hasNda && (
                <Badge variant="secondary" className="text-xs font-semibold"><Lock className="h-3 w-3 mr-1" /> NDA Required</Badge>
              )}
              {data.ip_model && (
                <Badge variant="outline" className="text-xs font-semibold"><Briefcase className="h-3 w-3 mr-1" /> IP: {data.ip_model.replace(/_/g, ' ')}</Badge>
              )}
              {data.escrowFunded && (
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Escrow Funded
                </Badge>
              )}
              {legalSummary.tier2DocCount > 0 && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  <FileText className="h-3 w-3 mr-1" /> {legalSummary.tier2DocCount} Tier 2 Doc{legalSummary.tier2DocCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Q&A SECTION */}
      <ChallengeQASection challengeId={id!} />

      {/* LEGAL RE-ACCEPT MODAL */}
      {reacceptStatus?.hasPending && reacceptStatus.record && (
        <LegalReAcceptModal
          open={legalModalOpen}
          onOpenChange={setLegalModalOpen}
          challengeId={id!}
          userId={user?.id ?? ''}
          record={reacceptStatus.record}
        />
      )}

      <div className="pb-8" />
    </div>
  );
}
