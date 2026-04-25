/**
 * WorkforcePwaGate — Challenge-level defensive guard.
 *
 * Wraps workforce queue/workspace entry points (CU/ER/LC/FC) and blocks
 * navigation if the current user has any unresolved PWA acceptance row
 * for one of the supplied role codes. Also acts as a recovery surface if
 * a user was invited mid-session and bypassed the first-login gate.
 *
 * The PWA signature itself is collected by `RoleLegalGate` at session
 * boot — this component does NOT collect signatures. It surfaces a
 * blocking notice with a one-click action to relaunch the signature
 * flow (sign-out → sign-in resurfaces the gate populated with the
 * pending row).
 */
import { ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePendingPwaForRole } from '@/hooks/legal/usePendingPwaForRole';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';

export interface WorkforcePwaGateProps {
  /** Workforce role codes that grant access to the wrapped surface. */
  roleCodes: readonly string[];
  /** Display name of the wrapped surface (e.g. "Curation Queue"). */
  surfaceLabel: string;
  /** Render-prop / children rendered when no PWA debt is outstanding. */
  children: ReactNode;
}

export function WorkforcePwaGate({
  roleCodes,
  surfaceLabel,
  children,
}: WorkforcePwaGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pending = [], isLoading } = usePendingPwaForRole(user?.id, roleCodes);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (e) {
      handleMutationError(e as Error, { operation: 'workforce_pwa_gate_sign_out' });
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-4xl space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (pending.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-2xl">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Platform Workforce Agreement required
              <Badge variant="outline" className="ml-auto text-xs">
                {pending.length} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Access to <strong>{surfaceLabel}</strong> is restricted until you
              accept the Platform Workforce Agreement (PWA) for the role(s)
              assigned to you. This is a one-time signature that protects you
              and the organisations you work with.
            </p>
            <div className="rounded border bg-muted/50 p-3 space-y-2">
              {pending.map((row) => (
                <div key={row.id} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{row.doc_code}</span>
                  <span className="text-muted-foreground">
                    · role <code className="text-xs">{row.role_code}</code>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Sign out to relaunch the signature flow. After accepting, you
              will return to {surfaceLabel} automatically.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Back to dashboard
              </Button>
              <Button onClick={handleSignOut} className="flex-1">
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign out & sign agreement
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
