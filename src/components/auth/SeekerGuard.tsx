/**
 * SeekerGuard — Auth guard for /org/* routes.
 * Wraps AuthGuard + verifies user has an org_users record.
 */

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { OrgProvider } from '@/contexts/OrgContext';

interface SeekerGuardProps {
  children: ReactNode;
}

export function SeekerGuard({ children }: SeekerGuardProps) {
  return (
    <AuthGuard>
      <OrgProvider>{children}</OrgProvider>
    </AuthGuard>
  );
}
