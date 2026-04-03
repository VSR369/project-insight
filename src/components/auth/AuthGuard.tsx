/**
 * AuthGuard — Protects routes requiring authentication.
 * Also triggers PMA (Platform Master Agreement) acceptance check on first login.
 * Fail-open: If the legal gate RPC errors, the user is not trapped.
 */
import { ReactNode, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
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

  const handleAllAccepted = useCallback(() => {
    setLegalGatePassed(true);
    setShowLegalGate(false);
  }, []);

  const handleDeclined = useCallback(async () => {
    toast.error('You must accept the Platform Agreement to continue.');
    await supabase.auth.signOut();
  }, []);

  if (loading) {
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
  // LegalGateModal handles fail-open internally (calls onAllAccepted on error)
  if (showLegalGate && !legalGatePassed) {
    return (
      <LegalGateModal
        triggerEvent="USER_REGISTRATION"
        onAllAccepted={handleAllAccepted}
        onDeclined={handleDeclined}
      />
    );
  }

  return <>{children}</>;
}
