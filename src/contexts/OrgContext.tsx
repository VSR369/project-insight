/**
 * OrgContext — Provides current organization context to all /org/* pages.
 * Resolves orgId from auth via useCurrentOrg hook.
 * Auto-onboarding: if user has no org, auto-creates one via edge function.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCurrentOrg, type CurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OrgContextValue {
  organizationId: string;
  tenantId: string;
  orgRole: string;
  orgName: string;
  tierCode: string | null;
  hqCountryId: string | null;
  isInternalDepartment: boolean;
  verificationStatus: string | null;
  tcVersionAccepted: string | null;
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
  // ══════════════════════════════════════
  // SECTION 1: useState
  // ══════════════════════════════════════
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [autoCreateFailed, setAutoCreateFailed] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Custom hooks
  // ══════════════════════════════════════
  const { data: org, isLoading, error } = useCurrentOrg();
  const queryClient = useQueryClient();

  // ══════════════════════════════════════
  // SECTION 3: useEffect — auto-onboarding
  // ══════════════════════════════════════
  useEffect(() => {
    if (isLoading || org || isAutoCreating || autoCreateFailed) return;

    const autoCreate = async () => {
      setIsAutoCreating(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('auto-create-org');
        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error?.message || 'Auto-creation failed');

        // Invalidate org query to refetch
        await queryClient.invalidateQueries({ queryKey: ['currentOrg'] });

        if (!data.data.already_existed) {
          toast.success('Organization created! You can start creating challenges.');
        }
      } catch (err) {
        console.error('Auto-onboarding failed:', err);
        setAutoCreateFailed(true);
      } finally {
        setIsAutoCreating(false);
      }
    };

    autoCreate();
  }, [isLoading, org, isAutoCreating, autoCreateFailed, queryClient]);

  // ══════════════════════════════════════
  // SECTION 4: Conditional returns
  // ══════════════════════════════════════
  if (isLoading || isAutoCreating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          {isAutoCreating && (
            <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
          )}
        </div>
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
              <Link to="/registration/organization-identity?new=1">Register Organization</Link>
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
