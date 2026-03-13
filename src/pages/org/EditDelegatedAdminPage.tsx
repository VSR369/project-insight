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
import { useRoleAssignments } from '@/hooks/queries/useRoleAssignments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScopeMultiSelect } from '@/components/org/ScopeMultiSelect';
import { ScopeOverlapWarning } from '@/components/org/ScopeOverlapWarning';
import { DomainScopeDisplay } from '@/components/org/DomainScopeDisplay';
import { SessionContextBanner } from '@/components/org/SessionContextBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Edit, User, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditDelegatedAdminPage() {
  const navigate = useNavigate();
  const { adminId } = useParams<{ adminId: string }>();
  const { organizationId } = useOrgContext();
  const updateScope = useUpdateDelegatedAdminScope();
  const { data: existingAdmins = [] } = useDelegatedAdmins(organizationId);
  const { data: roleAssignments = [] } = useRoleAssignments(organizationId);

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
  const [scopeNarrowConfirmOpen, setScopeNarrowConfirmOpen] = useState(false);

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

  // Scope narrowing detection (Gap 10) + BR-DEL-002 orphan count
  const narrowingInfo = useMemo(
    () => (initialized ? detectScopeNarrowing(originalScope, scope) : { isNarrowed: false, removedCount: 0 }),
    [originalScope, scope, initialized]
  );

  // BR-DEL-002: Count potentially orphaned role assignments when scope is narrowed
  const orphanedRoleCount = useMemo(() => {
    if (!narrowingInfo.isNarrowed) return 0;
    // Count active/invited roles that fall within removed scope dimensions
    const removedIndustries = originalScope.industry_segment_ids.filter(
      (id) => !scope.industry_segment_ids.includes(id)
    );
    if (removedIndustries.length === 0) return 0;
    // Roles whose domain_tags reference removed industries would be orphaned
    return roleAssignments.filter(
      (r) => (r.status === "active" || r.status === "invited") &&
        r.created_by === adminId
    ).length;
  }, [narrowingInfo.isNarrowed, originalScope, scope, roleAssignments, adminId]);

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
    // BR-DEL-002: If scope is narrowed and orphans may exist, require confirmation
    if (narrowingInfo.isNarrowed && orphanedRoleCount > 0) {
      setScopeNarrowConfirmOpen(true);
      return;
    }
    const overlaps = checkScopeOverlap(scope, existingAdmins, adminId);
    if (overlaps.length > 0) {
      setOverlappingAdmins(overlaps);
      setOverlapWarningOpen(true);
      return;
    }
    await doSave();
  };

  const handleScopeNarrowConfirm = async () => {
    setScopeNarrowConfirmOpen(false);
    // Proceed with overlap check after confirming narrowing
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

          {/* SCR-14: Side-by-side scope comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Current scope (read-only) */}
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Scope</p>
              <DomainScopeDisplay scope={originalScope} />
            </div>

            {/* Proposed new scope (editable) */}
            <div className="border rounded-lg p-3 border-primary/30 bg-primary/5">
              <p className="text-xs font-medium text-primary mb-2">Proposed New Scope</p>
              <ScopeMultiSelect value={scope} onChange={handleScopeChange} />
            </div>
          </div>

          {/* Scope narrowing warning with orphan count (BR-DEL-002) */}
          {narrowingInfo.isNarrowed && (
            <Alert variant={orphanedRoleCount > 0 ? "destructive" : undefined}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You are removing <strong>{narrowingInfo.removedCount}</strong> scope assignment(s).
                {orphanedRoleCount > 0 && (
                  <> This may orphan <strong>{orphanedRoleCount}</strong> active role assignment(s) managed by this admin. Confirmation will be required.</>
                )}
                {orphanedRoleCount === 0 && (
                  <> Existing responsibilities in removed areas may need to be reassigned to the Primary admin.</>
                )}
              </AlertDescription>
            </Alert>
          )}

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

      {/* BR-DEL-002: Scope narrowing confirmation dialog */}
      <AlertDialog open={scopeNarrowConfirmOpen} onOpenChange={setScopeNarrowConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Scope Narrowing — Orphan Risk
            </AlertDialogTitle>
            <AlertDialogDescription>
              Narrowing this admin's scope will remove <strong>{narrowingInfo.removedCount}</strong> scope 
              assignment(s) and may orphan <strong>{orphanedRoleCount}</strong> active role assignment(s). 
              These orphaned roles will need to be reassigned to the Primary Admin or another Delegated Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleScopeNarrowConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
