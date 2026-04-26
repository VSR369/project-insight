/**
 * LegalSystemHealthCard — Admin probe of effective-active platform legal
 * templates. Shows red row + deep link when a required document code has no
 * effective-active version.
 *
 * "Effective-active" = ACTIVE AND (effective_date <= now()) AND (expires_at IS NULL OR expires_at > now()).
 *
 * Phase 9 v4 — Prompt 3.
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, ShieldAlert, ExternalLink } from 'lucide-react';
import { useLegalTemplateHealth } from '@/hooks/queries/useLegalTemplateHealth';

const DOC_LABELS: Record<string, string> = {
  SPA: 'Solver Platform Agreement',
  SKPA: 'Seeker Platform Agreement',
  PWA: 'Platform Workforce Agreement',
  RA_R2: 'Seeker Org Admin Role Agreement',
  CPA_QUICK: 'CPA — Quick',
  CPA_STRUCTURED: 'CPA — Structured',
  CPA_CONTROLLED: 'CPA — Controlled',
};

export function LegalSystemHealthCard() {
  const navigate = useNavigate();
  const { data: rows, isLoading, isError } = useLegalTemplateHealth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Legal System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load legal template health. Refresh to retry.
        </AlertDescription>
      </Alert>
    );
  }

  const unhealthy = (rows ?? []).filter((r) => !r.is_healthy);
  const allHealthy = unhealthy.length === 0;

  return (
    <Card className={allHealthy ? 'border-border' : 'border-destructive'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {allHealthy ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-destructive" />
          )}
          Legal System Health
          <Badge variant={allHealthy ? 'secondary' : 'destructive'} className="ml-2 text-[10px]">
            {allHealthy ? 'All effective-active' : `${unhealthy.length} missing`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(rows ?? []).map((r) => (
            <div
              key={r.document_code}
              className={`rounded-lg border px-3 py-2 ${
                r.is_healthy ? 'border-border bg-muted/20' : 'border-destructive/40 bg-destructive/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {DOC_LABELS[r.document_code] ?? r.document_code}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r.document_code}
                    {r.version ? ` · v${r.version}` : ''}
                    {r.effective_date ? ` · eff ${r.effective_date}` : ''}
                  </p>
                </div>
                {r.is_healthy ? (
                  <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] shrink-0 gap-1">
                    <AlertTriangle className="h-3 w-3" /> Missing
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        {!allHealthy && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">
              Required legal templates are missing or inactive. Publish ACTIVE versions to restore the gate.
            </p>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => navigate('/admin/legal-documents')}
              className="shrink-0"
            >
              Manage <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
