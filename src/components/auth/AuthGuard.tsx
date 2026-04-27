/**
 * AuthGuard — Protects routes requiring authentication.
 * Also triggers PMA (Platform Master Agreement) acceptance check on first login.
 * Then checks SPA (Solution Provider Platform Agreement) acceptance — but ONLY
 * for pure Solvers (Solution Providers), never for workforce/admin/org users.
 *
 * PERF: Legal gate result cached in sessionStorage to avoid RPC on every navigation.
 */
import { ReactNode, useState, useCallback, Suspense, startTransition } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import { SpaAcceptanceGate } from '@/components/cogniblend/solver/SpaAcceptanceGate';
import { RoleLegalGate } from '@/components/auth/RoleLegalGate';
import { useSpaStatus } from '@/hooks/cogniblend/useSpaStatus';
import { useAudienceClassification } from '@/hooks/queries/useAudienceClassification';
import { usePendingRoleLegalAcceptance } from '@/hooks/queries/usePendingRoleLegalAcceptance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LEGAL_GATE_KEY = 'cogniblend_legal_gate_passed';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // PERF: Check sessionStorage first — skip RPC if already passed this session
  const cachedGatePassed = sessionStorage.getItem(LEGAL_GATE_KEY) === 'true';
  const [legalGatePassed, setLegalGatePassed] = useState(cachedGatePassed);
  const [showLegalGate, setShowLegalGate] = useState(!cachedGatePassed);
  const [spaAccepted, setSpaAccepted] = useState(false);
  const [roleLegalDone, setRoleLegalDone] = useState(false);

  const { isPureSolutionProvider, isLoading: rolesLoading } =
    useAudienceClassification(user?.id);

  // POSITIVE RULE: SPA shows ONLY for pure Solution Providers.
  const requiresSpa = isPureSolutionProvider;

  const { data: hasSpa, isLoading: spaLoading } = useSpaStatus(requiresSpa ? user?.id : undefined);

  // First-login role agreement backlog (SPA / SKPA / PWA per role)
  const { data: pendingRoleLegal = [], isLoading: pendingRoleLoading } =
    usePendingRoleLegalAcceptance(user?.id);

  const handleAllAccepted = useCallback(() => {
    setLegalGatePassed(true);
    setShowLegalGate(false);
    sessionStorage.setItem(LEGAL_GATE_KEY, 'true');
  }, []);

  const handleDeclined = useCallback(async () => {
    toast.error('You must accept the Platform Agreement to continue.');
    await supabase.auth.signOut();
  }, []);

  const handleRoleLegalDone = useCallback(() => setRoleLegalDone(true), []);
  const handleRoleLegalDeclined = useCallback(() => setRoleLegalDone(false), []);

  if (
    loading ||
    rolesLoading ||
    (requiresSpa && spaLoading && hasSpa === undefined) ||
    pendingRoleLoading
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1) PMA acceptance
  if (showLegalGate && !legalGatePassed) {
    return (
      <LegalGateModal
        triggerEvent="USER_REGISTRATION"
        onAllAccepted={handleAllAccepted}
        onDeclined={handleDeclined}
      />
    );
  }

  // 2) Role-level first-login signatures (SPA/SKPA/PWA per held role)
  if (!roleLegalDone && pendingRoleLegal.length > 0) {
    return (
      <RoleLegalGate
        userId={user.id}
        onAllAccepted={handleRoleLegalDone}
        onDeclined={handleRoleLegalDeclined}
      />
    );
  }

  // 3) Legacy SPA gate — kept as silent fallback for users who pre-existed
  //    before pending_role_legal_acceptance backfill.
  if (requiresSpa && hasSpa === false && !spaAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SpaAcceptanceGate userId={user.id} onAccepted={() => setSpaAccepted(true)} />
      </div>
    );
  }

  return <>{children}</>;
}
