/**
 * SeekerGuard — Auth guard for /org/* routes.
 * Wraps AuthGuard + verifies user has an org_users record.
 * Blocks platform-only admins from accessing org routes (GAP 4).
 */

import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { OrgProvider } from '@/contexts/OrgContext';
import { useAuth } from '@/hooks/useAuth';
import { checkSessionType } from '@/lib/sessionIsolation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function SeekerSessionCheck({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkSessionType(user.id).then((type) => {
      if (type === 'platform_admin') {
        toast.error('Please use the main portal to access platform admin features.');
        supabase.auth.signOut().then(() => navigate('/login', { replace: true }));
        return;
      }
      if (type === 'none') {
        toast.error('No active organization found for this account.');
        supabase.auth.signOut().then(() => navigate('/org/login', { replace: true }));
        return;
      }
      // 'org_admin' or 'both' — allow access
      setAllowed(true);
      setChecked(true);
    });
  }, [user, navigate]);

  if (!checked || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

interface SeekerGuardProps {
  children: ReactNode;
}

export function SeekerGuard({ children }: SeekerGuardProps) {
  return (
    <AuthGuard>
      <SeekerSessionCheck>
        <OrgProvider>{children}</OrgProvider>
      </SeekerSessionCheck>
    </AuthGuard>
  );
}
