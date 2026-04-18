/**
 * AIReviewSmokeTestPanel — Admin-only readiness probe UI.
 * Triggers the ai-review-smoke-test edge function and renders the
 * Go/No-Go verdict + per-scenario evidence.
 *
 * R6: loading skeleton + empty + error w/ correlation ID + success.
 * R2: no DB calls — uses useAiReviewSmokeTest hook.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAiReviewSmokeTest } from '@/hooks/queries/useAiReviewSmokeTest';
import type { SmokeTestVerdict } from '@/types/diagnostics';

function VerdictBadge({ verdict }: { verdict: SmokeTestVerdict }) {
  const variants: Record<SmokeTestVerdict, { variant: 'default' | 'destructive' | 'secondary'; icon: typeof CheckCircle2; label: string }> = {
    GO: { variant: 'default', icon: CheckCircle2, label: 'GO — production ready' },
    WARN: { variant: 'secondary', icon: AlertTriangle, label: 'WARN — review before deploy' },
    NO_GO: { variant: 'destructive', icon: XCircle, label: 'NO-GO — deploy blocked' },
  };
  const v = variants[verdict];
  const Icon = v.icon;
  return (
    <Badge variant={v.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {v.label}
    </Badge>
  );
}

export function AIReviewSmokeTestPanel() {
  const mutation = useAiReviewSmokeTest();
  const report = mutation.data;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-base">AI Review — Production Readiness Smoke Test</CardTitle>
        <div className="flex items-center gap-2">
          {report && <VerdictBadge verdict={report.goNoGo} />}
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            aria-label="Run AI review smoke test"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            <span className="ml-2 hidden lg:inline">Run smoke test</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running scenarios on the fixture challenge…
          </div>
        )}
        {!mutation.isPending && mutation.isError && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="font-medium text-destructive">Smoke test failed to start</div>
            <div className="mt-1 text-muted-foreground">
              {mutation.error instanceof Error ? mutation.error.message : 'Unknown error'}
            </div>
          </div>
        )}
        {!mutation.isPending && !mutation.data && !mutation.isError && (
          <p className="text-sm text-muted-foreground">
            Click <strong>Run smoke test</strong> to verify all production gates against the
            canonical fixture challenge. The runner is read-only — no challenge data will be modified.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Fixture: <code>{report.fixtureChallengeId}</code> · {report.summary.passed}/{report.summary.total} passed · {Math.round(report.totalDurationMs / 1000)}s total
            </div>
            <div className="rounded border divide-y">
              {report.results.map((r) => (
                <div key={r.scenarioId} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    {r.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium">[{r.category}{r.scenarioId.slice(1)}] {r.scenarioLabel}</div>
                      {r.evidence && <div className="text-xs text-muted-foreground">{r.evidence}</div>}
                      {r.correlationId && <div className="text-[10px] text-muted-foreground">cid: {r.correlationId}</div>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.durationMs}ms</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
