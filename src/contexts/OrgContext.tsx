/**
 * OrgContext — Provides current organization context to all /org/* pages.
 * Resolves orgId from auth via useCurrentOrg hook.
 */

import React, { createContext, useContext } from 'react';
import { useCurrentOrg, type CurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { Loader2, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface OrgContextValue {
  organizationId: string;
  tenantId: string;
  orgRole: string;
  orgName: string;
  tierCode: string | null;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrgContext must be used within OrgProvider');
  return ctx;
}

export function useOptionalOrgContext(): OrgContextValue | null {
  return useContext(OrgContext);
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { data: org, isLoading, error } = useCurrentOrg();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!org || error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold text-foreground">No Organization Found</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            You don't have an active organization. Please register or contact your admin.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/registration/organization-identity">Register Organization</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OrgContext.Provider value={org}>
      {children}
    </OrgContext.Provider>
  );
}
