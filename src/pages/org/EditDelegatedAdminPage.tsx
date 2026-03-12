/**
 * EditDelegatedAdminPage — Edit scope of an existing delegated admin.
 * Includes scope overlap warning (MOD-M-SOA-01) and scope narrowing warning (Gap 10).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgContext } from '@/contexts/OrgContext';
import {
  useUpdateDelegatedAdminScope,
  useDelegatedAdmins,
  checkScopeOverlap,
  detectScopeNarrowing,
  EMPTY_SCOPE,
  type DomainScope,
} from '@/hooks/queries/useDelegatedAdmins';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScopeMultiSelect } from '@/components/org/ScopeMultiSelect';
import { ScopeOverlapWarning } from '@/components/org/ScopeOverlapWarning';
import { DomainScopeDisplay } from '@/components/org/DomainScopeDisplay';
import { SessionContextBanner } from '@/components/org/SessionContextBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Edit, User, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditDelegatedAdminPage() {
  const navigate = useNavigate();
  const { adminId } = useParams<{ adminId: string }>();
  const { organizationId } = useOrgContext();
  const updateScope = useUpdateDelegatedAdminScope();
  const { data: existingAdmins = [] } = useDelegatedAdmins(organizationId);

  const { data: admin, isLoading } = useQuery({
    queryKey: ['delegated-admin-detail', adminId],
    queryFn: async () => {
      if (!adminId) return null;
      const { data, error } = await supabase
        .from('seeking_org_admins')
        .select('id, full_name, email, phone, title, domain_scope, status, admin_tier')
        .eq('id', adminId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!adminId,
    refetchOnWindowFocus: false,
  });

  const [scope, setScope] = useState<DomainScope>({ ...EMPTY_SCOPE });
  const [initialized, setInitialized] = useState(false);
  const [overlapWarningOpen, setOverlapWarningOpen] = useState(false);
  const [overlappingAdmins, setOverlappingAdmins] = useState<{ name: string; email: string }[]>([]);
  const [inlineScopeOverlap, setInlineScopeOverlap] = useState<{ name: string; email: string }[]>([]);

  const originalScope = useMemo<DomainScope>(() => {
    if (!admin) return { ...EMPTY_SCOPE };
    const existing = (admin.domain_scope ?? {}) as any;
    return {
      industry_segment_ids: existing.industry_segment_ids ?? [],
      proficiency_area_ids: existing.proficiency_area_ids ?? [],
      sub_domain_ids: existing.sub_domain_ids ?? [],
      speciality_ids: existing.speciality_ids ?? [],
      department_ids: existing.department_ids ?? [],
      functional_area_ids: existing.functional_area_ids ?? [],
    };
  }, [admin]);

  useEffect(() => {
    if (admin && !initialized) {
      setScope({ ...originalScope });
      setInitialized(true);
    }
  }, [admin, initialized, originalScope]);

  // Scope narrowing detection (Gap 10)
  const narrowingInfo = useMemo(
    () => (initialized ? detectScopeNarrowing(originalScope, scope) : { isNarrowed: false, removedCount: 0 }),
    [originalScope, scope, initialized]
  );

  // Scope change handler with inline overlap check (Gap 7)
  const handleScopeChange = useCallback(
    (newScope: DomainScope) => {
      setScope(newScope);
      if (newScope.industry_segment_ids.length > 0) {
        const overlaps = checkScopeOverlap(newScope, existingAdmins, adminId);
        setInlineScopeOverlap(overlaps);
      } else {
        setInlineScopeOverlap([]);
      }
    },
    [existingAdmins, adminId]
  );

  const doSave = async () => {
    if (!adminId) return;
    await updateScope.mutateAsync({
      adminId,
      organizationId,
      domain_scope: scope,
      previousScope: originalScope,
      orphanCount: narrowingInfo.removedCount,
      confirmationGiven: narrowingInfo.isNarrowed,
    });
    navigate('/org/admin-management');
  };

  const handleSave = async () => {
    const overlaps = checkScopeOverlap(scope, existingAdmins, adminId);
    if (overlaps.length > 0) {
      setOverlappingAdmins(overlaps);
      setOverlapWarningOpen(true);
      return;
    }
    await doSave();
  };

  const handleOverlapConfirm = async () => {
    setOverlapWarningOpen(false);
    await doSave();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Admin not found
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <SessionContextBanner />

      <Button variant="ghost" size="sm" onClick={() => navigate('/org/admin-management')}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Admin Management
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Admin Scope
          </CardTitle>
          <CardDescription>
            Update the domain scope for this delegated admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Admin info (read-only) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-muted/40 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {admin.full_name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-mono">{admin.email ?? '—'}</p>
            </div>
          </div>

          {/* Current scope display (Gap 11) */}
          <div className="border rounded-lg p-3 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground mb-2">Current Scope</p>
            <DomainScopeDisplay scope={originalScope} />
          </div>

          {/* Scope narrowing warning (Gap 10) */}
          {narrowingInfo.isNarrowed && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You are removing <strong>{narrowingInfo.removedCount}</strong> scope assignment(s).
                Existing responsibilities in removed areas may need to be reassigned to the Primary admin.
              </AlertDescription>
            </Alert>
          )}

          {/* Scope editor */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-foreground">Domain Scope</h3>
            <ScopeMultiSelect value={scope} onChange={handleScopeChange} />
          </div>

          {/* Inline scope overlap warning (Gap 7) */}
          {inlineScopeOverlap.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Scope overlaps with: {inlineScopeOverlap.map((a) => a.name).join(', ')}. You can still proceed.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 justify-end border-t pt-4">
            <Button variant="outline" onClick={() => navigate('/org/admin-management')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateScope.isPending || scope.industry_segment_ids.length === 0}>
              {updateScope.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <ScopeOverlapWarning
        open={overlapWarningOpen}
        overlappingAdmins={overlappingAdmins}
        onConfirm={handleOverlapConfirm}
        onCancel={() => setOverlapWarningOpen(false)}
      />
    </div>
  );
}
