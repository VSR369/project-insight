/**
 * AIQualityDashboardPage — Admin dashboard for AI quality metrics.
 *
 * Shows: average accuracy, grade distribution, worst sections,
 * section heatmap, solver feedback summary.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIQualityMetrics, useAIQualityAggregates, useSolverFeedbackSummary } from '@/hooks/queries/useAIQualityMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, AlertTriangle, Star } from 'lucide-react';

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  B: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  C: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function AIQualityDashboardPage() {
  const { data: metrics, isLoading } = useAIQualityMetrics(100);
  const { data: aggregates } = useAIQualityAggregates();
  const { data: solverFeedback } = useSolverFeedbackSummary();

  const solverAvg = useMemo(() => {
    if (!solverFeedback || solverFeedback.length === 0) return null;
    const avg = solverFeedback.reduce((s, f) => s + f.clarity_overall, 0) / solverFeedback.length;
    return Math.round(avg * 10) / 10;
  }, [solverFeedback]);

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

      {/* Grade Distribution + Recent Metrics */}
      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Grade Distribution</TabsTrigger>
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
                    {(metrics ?? []).slice(0, 20).map((m) => (
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
                    {(!metrics || metrics.length === 0) && (
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
