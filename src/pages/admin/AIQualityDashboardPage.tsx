/**
 * AIQualityDashboardPage — Admin dashboard for AI quality metrics.
 *
 * Shows: average accuracy, grade distribution, section heatmap,
 * solver feedback summary, with filters for governance/domain/maturity/period.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIQualityMetrics, useAIQualityAggregates, useSolverFeedbackSummary, type QualityMetricRow } from '@/hooks/queries/useAIQualityMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, AlertTriangle, Star, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  B: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  C: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
};

function getHeatmapColor(rewriteRate: number): string {
  if (rewriteRate <= 10) return 'bg-emerald-100 text-emerald-800';
  if (rewriteRate <= 25) return 'bg-emerald-50 text-emerald-700';
  if (rewriteRate <= 40) return 'bg-amber-50 text-amber-700';
  if (rewriteRate <= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export default function AIQualityDashboardPage() {
  // Filters
  const [filterGovernance, setFilterGovernance] = useState<string>('all');
  const [filterMaturity, setFilterMaturity] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  const { data: metrics, isLoading } = useAIQualityMetrics(100);
  const { data: aggregates } = useAIQualityAggregates();
  const { data: solverFeedback } = useSolverFeedbackSummary();

  // Apply client-side filters
  const filteredMetrics = useMemo(() => {
    if (!metrics) return [];
    return metrics.filter((m) => {
      if (filterGovernance !== 'all' && m.governance_mode !== filterGovernance) return false;
      if (filterMaturity !== 'all' && m.maturity_level !== filterMaturity) return false;
      if (filterPeriod !== 'all') {
        const days = filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (new Date(m.computed_at) < cutoff) return false;
      }
      return true;
    });
  }, [metrics, filterGovernance, filterMaturity, filterPeriod]);

  // Section heatmap data
  const sectionHeatmap = useMemo(() => {
    if (!filteredMetrics || filteredMetrics.length === 0) return [];
    const sectionStats: Record<string, { accepted: number; edited: number; rewritten: number; total: number }> = {};

    for (const m of filteredMetrics) {
      const breakdown = m.section_breakdown as Record<string, any> | null;
      if (!breakdown) continue;
      for (const [sectionKey, data] of Object.entries(breakdown)) {
        if (!sectionStats[sectionKey]) {
          sectionStats[sectionKey] = { accepted: 0, edited: 0, rewritten: 0, total: 0 };
        }
        const d = data as any;
        if (d.status === 'accepted_unchanged') sectionStats[sectionKey].accepted++;
        else if (d.status === 'accepted_with_edits') sectionStats[sectionKey].edited++;
        else if (d.status === 'rejected_rewritten') sectionStats[sectionKey].rewritten++;
        sectionStats[sectionKey].total++;
      }
    }

    return Object.entries(sectionStats)
      .map(([key, stats]) => ({
        sectionKey: key,
        label: key.replace(/_/g, ' '),
        acceptRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
        editRate: stats.total > 0 ? Math.round((stats.edited / stats.total) * 100) : 0,
        rewriteRate: stats.total > 0 ? Math.round((stats.rewritten / stats.total) * 100) : 0,
        total: stats.total,
      }))
      .sort((a, b) => b.rewriteRate - a.rewriteRate);
  }, [filteredMetrics]);

  const solverAvg = useMemo(() => {
    if (!solverFeedback || solverFeedback.length === 0) return null;
    const avg = solverFeedback.reduce((s, f) => s + f.clarity_overall, 0) / solverFeedback.length;
    return Math.round(avg * 10) / 10;
  }, [solverFeedback]);

  // Unique values for filter dropdowns
  const governanceModes = useMemo(() => {
    if (!metrics) return [];
    return [...new Set(metrics.map(m => m.governance_mode).filter(Boolean))].sort() as string[];
  }, [metrics]);

  const maturityLevels = useMemo(() => {
    if (!metrics) return [];
    return [...new Set(metrics.map(m => m.maturity_level).filter(Boolean))].sort() as string[];
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Quality Dashboard</h1>
        <p className="text-sm text-muted-foreground">Track AI accuracy, curator edits, and solver feedback</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterGovernance} onValueChange={setFilterGovernance}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Governance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Governance</SelectItem>
            {governanceModes.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMaturity} onValueChange={setFilterMaturity}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Maturity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Maturity</SelectItem>
            {maturityLevels.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-auto">
          {filteredMetrics.length} challenge{filteredMetrics.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Avg Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {aggregates?.avgAccuracyPercent ?? 0}%
            </div>
            <Progress value={aggregates?.avgAccuracyPercent ?? 0} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> AI Assist Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {aggregates?.avgAssistRatePercent ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Accepted unchanged + minor edits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Rewrite Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {aggregates?.avgRewriteRatePercent ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sections curator rewrote</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Solver Clarity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {solverAvg ?? '—'}<span className="text-lg text-muted-foreground">/5</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {solverFeedback?.length ?? 0} responses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Grade Distribution</TabsTrigger>
          <TabsTrigger value="heatmap">Section Heatmap</TabsTrigger>
          <TabsTrigger value="recent">Recent Challenges</TabsTrigger>
          <TabsTrigger value="feedback">Solver Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="grades">
          <Card>
            <CardContent className="pt-6">
              {aggregates ? (
                <div className="grid grid-cols-4 gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map((grade) => (
                    <div key={grade} className="text-center space-y-2">
                      <Badge variant="outline" className={`text-lg px-4 py-2 ${GRADE_COLORS[grade]}`}>
                        {grade}
                      </Badge>
                      <div className="text-2xl font-bold text-foreground">
                        {aggregates.gradeDistribution[grade]}
                      </div>
                      <p className="text-xs text-muted-foreground">challenges</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No quality data yet. Metrics are computed when curators submit challenges.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Section Rewrite Heatmap</CardTitle>
              <p className="text-xs text-muted-foreground">
                Green = mostly accepted unchanged. Red = frequently rewritten by curators.
              </p>
            </CardHeader>
            <CardContent>
              {sectionHeatmap.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                  {sectionHeatmap.map((s) => (
                    <div
                      key={s.sectionKey}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm flex items-center justify-between',
                        getHeatmapColor(s.rewriteRate),
                      )}
                    >
                      <span className="capitalize truncate mr-2">{s.label}</span>
                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <span title="Accept rate">{s.acceptRate}%✅</span>
                        <span title="Edit rate">{s.editRate}%✏️</span>
                        <span title="Rewrite rate">{s.rewriteRate}%🔄</span>
                        <Badge variant="outline" className="text-[10px]">{s.total}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No section-level data yet. Data populates as curators review challenges.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Challenge</th>
                      <th className="pb-2 font-medium text-muted-foreground">Grade</th>
                      <th className="pb-2 font-medium text-muted-foreground">Accuracy</th>
                      <th className="pb-2 font-medium text-muted-foreground">Assist</th>
                      <th className="pb-2 font-medium text-muted-foreground">Rewrite</th>
                      <th className="pb-2 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMetrics.slice(0, 20).map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{m.challenge_id.slice(0, 8)}</td>
                        <td className="py-2">
                          <Badge variant="outline" className={GRADE_COLORS[m.grade]}>
                            {m.grade}
                          </Badge>
                        </td>
                        <td className="py-2">{m.ai_accuracy_percent}%</td>
                        <td className="py-2">{m.ai_assist_rate_percent}%</td>
                        <td className="py-2">{m.ai_rewrite_rate_percent}%</td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(m.computed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filteredMetrics.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No quality data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Challenge</th>
                      <th className="pb-2 font-medium text-muted-foreground">Overall</th>
                      <th className="pb-2 font-medium text-muted-foreground">Problem</th>
                      <th className="pb-2 font-medium text-muted-foreground">Deliverables</th>
                      <th className="pb-2 font-medium text-muted-foreground">Evaluation</th>
                      <th className="pb-2 font-medium text-muted-foreground">Missing Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(solverFeedback ?? []).slice(0, 20).map((f) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{f.challenge_id.slice(0, 8)}</td>
                        <td className="py-2">{f.clarity_overall}/5</td>
                        <td className="py-2">{f.clarity_problem ?? '—'}/5</td>
                        <td className="py-2">{f.clarity_deliverables ?? '—'}/5</td>
                        <td className="py-2">{f.clarity_evaluation ?? '—'}/5</td>
                        <td className="py-2 text-xs max-w-[200px] truncate">
                          {f.missing_info || '—'}
                        </td>
                      </tr>
                    ))}
                    {(!solverFeedback || solverFeedback.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No solver feedback yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
