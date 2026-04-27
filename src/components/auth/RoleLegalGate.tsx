/**
 * RoleLegalGate — First-login signature blocker.
 *
 * Reads `pending_role_legal_acceptance` for the current user and, if any
 * unresolved rows exist, presents them one at a time using the active
 * template returned by `resolve_active_legal_template`. Blocks dashboard
 * navigation until every row is resolved.
 *
 * Mounted inside `AuthGuard` after the PMA / SPA legacy gates.
 */
import { useState, useCallback, useEffect, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { usePendingRoleLegalAcceptance, type PendingRoleLegalRow } from '@/hooks/queries/usePendingRoleLegalAcceptance';
import { useAcceptRoleLegal } from '@/hooks/legal/useAcceptRoleLegal';
import { useAssembleRoleDoc } from '@/hooks/legal/useAssembleRoleDoc';

interface RoleLegalGateProps {
  userId: string;
  onAllAccepted: () => void;
  onDeclined: () => void;
}

const DOC_TITLE: Record<string, string> = {
  SPA: 'Solution Provider Platform Agreement',
  SKPA: 'Seeking Organization Platform Agreement',
  PWA: 'Prize & Work Agreement',
};

export function RoleLegalGate({ userId, onAllAccepted, onDeclined }: RoleLegalGateProps) {
  const { data: pending = [], isLoading: pendingLoading } = usePendingRoleLegalAcceptance(userId);
  const acceptMutation = useAcceptRoleLegal();

  const [acceptedChecked, setAcceptedChecked] = useState(false);

  // Pick the first unresolved row to render
  const current: PendingRoleLegalRow | undefined = pending[0];

  // Server-side assembled doc (canonical, fully-interpolated)
  const { data: assembled, isLoading: tmplLoading, error: tmplError } = useAssembleRoleDoc({
    userId: current?.user_id,
    docCode: current?.doc_code,
    orgId: current?.org_id,
    roleCode: current?.role_code,
  });

  // When pending list becomes empty, signal completion
  useEffect(() => {
    if (!pendingLoading && pending.length === 0) {
      onAllAccepted();
    }
  }, [pendingLoading, pending.length, onAllAccepted]);

  // Reset checkbox between documents
  useEffect(() => {
    setAcceptedChecked(false);
  }, [current?.id]);

  const interpolated = assembled?.content ?? '';

  const handleAccept = useCallback(() => {
    if (!current || !assembled) return;
    acceptMutation.mutate(
      {
        pendingId: current.id,
        userId,
        templateId: assembled.template_id,
        docCode: current.doc_code,
        documentVersion: assembled.version,
        triggerEvent: 'FIRST_LOGIN',
      },
      {
        onSuccess: () => {
          toast.success(`${DOC_TITLE[current.doc_code] ?? current.doc_code} accepted`);
        },
      },
    );
  }, [current, assembled, userId, acceptMutation]);

  const handleDecline = useCallback(async () => {
    try {
      toast.error('You must accept the required agreements to continue.');
      await supabase.auth.signOut();
      onDeclined();
    } catch (e) {
      handleMutationError(e as Error, { operation: 'decline_role_legal' });
    }
  }, [onDeclined]);

  if (pendingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!current) return null;

  const docTitle = DOC_TITLE[current.doc_code] ?? current.doc_code;
  const remaining = pending.length;
  const errorMsg = tmplError instanceof Error ? tmplError.message : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="border-primary/20 max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {docTitle}
            {assembled?.source && (
              <Badge variant="outline" className="ml-2 text-xs">
                {assembled.source === 'ORG' ? 'Organization template' : 'Platform template'}
              </Badge>
            )}
            {assembled?.version && (
              <Badge variant="outline" className="ml-auto text-xs">v{assembled.version}</Badge>
            )}
          </CardTitle>
          {remaining > 1 && (
            <p className="text-xs text-muted-foreground">
              Document 1 of {remaining} — please review and accept each agreement to continue.
            </p>
          )}
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
                dangerouslySetInnerHTML={{ __html: interpolated }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="role-legal-accept"
              checked={acceptedChecked}
              onCheckedChange={(v) => setAcceptedChecked(v === true)}
              disabled={tmplLoading || !assembled}
            />
            <label htmlFor="role-legal-accept" className="text-sm cursor-pointer">
              I have read and agree to the {docTitle}.
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={acceptMutation.isPending}
              className="flex-1"
            >
              Decline & Sign out
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!acceptedChecked || acceptMutation.isPending || !assembled}
              className="flex-1"
            >
              {acceptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Accept & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
