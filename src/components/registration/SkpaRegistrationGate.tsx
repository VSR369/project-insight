/**
 * SkpaRegistrationGate — Inline SKPA acceptance shown to a brand-new
 * Seeker Org Admin (R2) on the post-registration completion page.
 *
 * Renders the server-assembled SKPA, captures consent, and resolves the
 * pending row. Falls through (renders children) once no SKPA row is pending,
 * so the welcome checklist can show.
 *
 * The DB trigger `trg_role_assignment_create_pending_legal` auto-enqueues
 * the SKPA when R2 is granted at org creation, so this component just needs
 * to drain that one row instead of inserting it.
 */
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePendingRoleLegalAcceptance } from '@/hooks/queries/usePendingRoleLegalAcceptance';
import { useAcceptRoleLegal } from '@/hooks/legal/useAcceptRoleLegal';
import { useAssembleRoleDoc } from '@/hooks/legal/useAssembleRoleDoc';

interface SkpaRegistrationGateProps {
  children: ReactNode;
}

export function SkpaRegistrationGate({ children }: SkpaRegistrationGateProps) {
  const { user } = useAuth();
  const { data: pending = [], isLoading: pendingLoading } =
    usePendingRoleLegalAcceptance(user?.id);
  const acceptMutation = useAcceptRoleLegal();
  const [acceptedChecked, setAcceptedChecked] = useState(false);

  // Drain only SKPA rows here; PWA/SPA continue to flow through RoleLegalGate.
  const skpaRow = pending.find((row) => row.doc_code === 'SKPA');

  const { data: assembled, isLoading: tmplLoading, error: tmplError } = useAssembleRoleDoc({
    userId: skpaRow?.user_id,
    docCode: skpaRow?.doc_code,
    orgId: skpaRow?.org_id,
    roleCode: skpaRow?.role_code,
  });

  useEffect(() => {
    setAcceptedChecked(false);
  }, [skpaRow?.id]);

  const handleAccept = useCallback(() => {
    if (!skpaRow || !assembled || !user?.id) return;
    acceptMutation.mutate(
      {
        pendingId: skpaRow.id,
        userId: user.id,
        templateId: assembled.template_id,
        docCode: skpaRow.doc_code,
        documentVersion: assembled.version,
        triggerEvent: 'ORG_REGISTRATION',
      },
      {
        onSuccess: () => {
          toast.success('Seeking Organization Platform Agreement accepted');
        },
      },
    );
  }, [skpaRow, assembled, user?.id, acceptMutation]);

  if (pendingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No pending SKPA → fall through to welcome checklist.
  if (!skpaRow) return <>{children}</>;

  const errorMsg = tmplError instanceof Error ? tmplError.message : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="border-primary/20 max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Seeking Organization Platform Agreement
            {assembled?.source && (
              <Badge variant="outline" className="ml-2 text-xs">
                {assembled.source === 'ORG' ? 'Organization template' : 'Platform template'}
              </Badge>
            )}
            {assembled?.version && (
              <Badge variant="outline" className="ml-auto text-xs">v{assembled.version}</Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Final step — please review and accept the platform agreement to complete your
            organization's registration.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {tmplLoading || !assembled ? (
            errorMsg ? (
              <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            ) : (
              <Skeleton className="h-48 w-full" />
            )
          ) : (
            <div className="max-h-[360px] overflow-y-auto rounded border bg-muted/50 p-3">
              <div
                className="prose prose-sm max-w-none whitespace-pre-wrap text-sm"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: assembled.content }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="skpa-accept"
              checked={acceptedChecked}
              onCheckedChange={(v) => setAcceptedChecked(v === true)}
              disabled={tmplLoading || !assembled}
            />
            <label htmlFor="skpa-accept" className="text-sm cursor-pointer">
              I have read and agree to the Seeking Organization Platform Agreement on behalf of
              my organization.
            </label>
          </div>
          <Button
            onClick={handleAccept}
            disabled={!acceptedChecked || acceptMutation.isPending || !assembled}
            className="w-full"
          >
            {acceptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Accept &amp; Complete Registration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
