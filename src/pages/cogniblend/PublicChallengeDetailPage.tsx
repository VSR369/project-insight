/**
 * PublicChallengeDetailPage — Public view of a published challenge.
 * Route: /cogni/challenges/:id/view
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, Calendar, ShieldCheck, Trophy, Clock, FileText,
  Target, BarChart3, ListChecks, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { usePublicChallenge } from '@/hooks/cogniblend/usePublicChallenge';
import { useSolverAmendmentStatus } from '@/hooks/cogniblend/useSolverAmendmentStatus';
import { useAuth } from '@/hooks/useAuth';
import { WithdrawalBanner } from '@/components/cogniblend/solver/WithdrawalBanner';
import { LegalReAcceptModal } from '@/components/cogniblend/solver/LegalReAcceptModal';

/* ─── Helpers ────────────────────────────────────────────── */

function complexityColor(level: string | null): string {
  switch (level) {
    case 'L1': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'L2': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'L3': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'L4': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'L5': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMaturityLabel(level: string | null): string {
  switch (level) {
    case 'blueprint': return 'Blueprint';
    case 'poc': return 'Proof of Concept';
    case 'prototype': return 'Prototype';
    case 'pilot': return 'Pilot';
    default: return level || '—';
  }
}

/* ─── Component ──────────────────────────────────────────── */

export default function PublicChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data, isLoading, error } = usePublicChallenge(id);
  const { data: amendStatus } = useSolverAmendmentStatus(id, user?.id);

  const [legalModalOpen, setLegalModalOpen] = useState(false);

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
        <Button variant="outline" size="sm" onClick={() => navigate('/cogni/browse')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Browse Challenges
        </Button>
      </div>
    );
  }

  /* ── Extract data ── */
  const rs = data.reward_structure ?? {};
  const currency = data.currency_code || 'USD';
  const platinumAward = Number(rs.platinum_award ?? rs.budget_max ?? 0);
  const goldAward = Number(rs.gold_award ?? 0);
  const silverAward = Number(rs.silver_award ?? 0);
  const evalCriteria = data.evaluation_criteria as Record<string, unknown> | null;
  const weightedCriteria = (evalCriteria?.weighted_criteria ?? evalCriteria?.criteria ?? []) as Array<{ name: string; weight: number }>;
  const deliverables = data.deliverables as Record<string, unknown> | null;
  const deliverablesList = (deliverables?.deliverables_list ?? deliverables?.items ?? []) as string[];
  const artifactTypes = (deliverables?.permitted_artifact_types ?? []) as string[];
  const guidelines = (deliverables?.submission_guidelines ?? data.description ?? '') as string;
  const phaseSchedule = data.phase_schedule as Record<string, unknown> | null;

  const eligibilityLabel: Record<string, string> = {
    anyone: 'open submissions',
    registered_users: 'Registered Users',
    curated_experts: 'Curated Experts',
    invited_only: 'Invited Experts',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ═══ Back nav ═══ */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/cogni/browse')}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Browse Challenges
      </Button>

      {/* ═══ HERO SECTION ═══ */}
      <div className="space-y-5">
        {/* Title */}
        <h1 className="text-2xl font-bold text-primary tracking-tight leading-tight">
          {data.title}
        </h1>

        {/* Info badges row */}
        <div className="flex flex-wrap items-center gap-2">
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
              <ShieldCheck className="h-3 w-3 mr-1" />
              Solver Protected
            </Badge>
          )}
        </div>

        {/* Awards + Deadline + CTA row */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            {/* Award amounts */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                Platinum Award
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

            {/* Deadline + CTA */}
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

              {data.isEligible ? (
                <Button size="lg" className="shrink-0">
                  Submit Solution
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground italic max-w-[260px]">
                  This challenge requires {eligibilityLabel[data.eligibility ?? ''] ?? 'specific eligibility'} to submit solutions.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABBED CONTENT ═══ */}
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

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-5">
          {data.problem_statement && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Problem Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {data.problem_statement}
                </p>
              </CardContent>
            </Card>
          )}

          {data.scope && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Scope & Expected Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {data.scope}
                </p>
              </CardContent>
            </Card>
          )}

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
                      {item}
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
        </TabsContent>

        {/* ── Evaluation Tab ── */}
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
                            <Badge variant="secondary" className="text-xs font-bold tabular-nums">
                              {criterion.weight}%
                            </Badge>
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

        {/* ── Guidelines Tab ── */}
        <TabsContent value="guidelines" className="space-y-4">
          {guidelines && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Submission Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {guidelines}
                </p>
              </CardContent>
            </Card>
          )}

          {artifactTypes.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Permitted Artifact Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {artifactTypes.map((type, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-medium">
                      {type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!guidelines && artifactTypes.length === 0 && (
            <Card className="border-border">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground italic">No submission guidelines provided.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">Phase Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {phaseSchedule && Object.keys(phaseSchedule).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(phaseSchedule).map(([key, value], i) => {
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
                        <Badge variant="outline" className="text-xs font-bold tabular-nums">
                          {String(value)} days
                        </Badge>
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

      {/* Bottom spacer */}
      <div className="pb-8" />
    </div>
  );
}
