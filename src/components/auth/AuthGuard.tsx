/**
 * AuthGuard — Protects routes requiring authentication.
 * Also triggers PMA (Platform Master Agreement) acceptance check on first login.
 * Then checks SPA (Solver Platform Agreement) acceptance.
 * Fail-open: If the legal gate RPC errors, the user is not trapped.
 */
import { ReactNode, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import { SpaAcceptanceGate } from '@/components/cogniblend/solver/SpaAcceptanceGate';
import { useSpaStatus } from '@/hooks/cogniblend/useSpaStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [legalGatePassed, setLegalGatePassed] = useState(false);
  const [showLegalGate, setShowLegalGate] = useState(true);
  const [spaAccepted, setSpaAccepted] = useState(false);

  const { data: hasSpa, isLoading: spaLoading } = useSpaStatus(user?.id);

  const handleAllAccepted = useCallback(() => {
    setLegalGatePassed(true);
    setShowLegalGate(false);
  }, []);

  const handleDeclined = useCallback(async () => {
    toast.error('You must accept the Platform Agreement to continue.');
    await supabase.auth.signOut();
  }, []);

  if (loading || (spaLoading && hasSpa === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show legal gate for USER_REGISTRATION trigger (PMA acceptance)
  if (showLegalGate && !legalGatePassed) {
    return (
      <LegalGateModal
        triggerEvent="USER_REGISTRATION"
        onAllAccepted={handleAllAccepted}
        onDeclined={handleDeclined}
      />
    );
  }

  // Show SPA gate if not accepted (fail-open: hasSpa defaults true on error)
  if (hasSpa === false && !spaAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SpaAcceptanceGate userId={user.id} onAccepted={() => setSpaAccepted(true)} />
      </div>
    );
  }

  return <>{children}</>;
}
