/**
 * DeactivateAdminDialog — Confirmation dialog for deactivating a delegated admin.
 * Shows count of roles that will be reassigned to Primary admin.
 * Prevents self-deactivation (BR-DEL: SELF_DEACTIVATION_BLOCKED).
 */

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
import { useDeactivateDelegatedAdmin, useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';
import type { DelegatedAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DeactivateAdminDialogProps {
  admin: DelegatedAdmin | null;
  organizationId: string;
  onClose: () => void;
}

export function DeactivateAdminDialog({ admin, organizationId, onClose }: DeactivateAdminDialogProps) {
  const deactivate = useDeactivateDelegatedAdmin();
  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);

  const isSelf = admin?.user_id && currentAdmin?.user_id && admin.user_id === currentAdmin.user_id;

  const handleConfirm = () => {
    if (!admin) return;
    if (isSelf) {
      toast.error('You cannot deactivate your own account');
      return;
    }
    deactivate.mutate(
      { adminId: admin.id, organizationId, actorUserId: currentAdmin?.user_id ?? undefined },
      { onSuccess: () => onClose() }
    );
  };

  const scopeCount = (() => {
    if (!admin?.domain_scope) return 0;
    const s = admin.domain_scope;
    return (
      s.industry_segment_ids.length +
      s.proficiency_area_ids.length +
      s.department_ids.length +
      s.functional_area_ids.length
    );
  })();

  return (
    <AlertDialog open={!!admin} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deactivate Delegated Admin
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {isSelf ? (
                <p className="text-destructive font-medium">
                  You cannot deactivate your own account. Please ask another Primary admin to perform this action.
                </p>
              ) : (
                <>
                  <p>
                    Are you sure you want to deactivate <strong>{admin?.full_name ?? admin?.email}</strong>?
                  </p>
                  {scopeCount > 0 && (
                    <p className="text-sm">
                      This admin manages <strong>{scopeCount} scope assignment(s)</strong> which will be reassigned
                      to the Primary admin.
                    </p>
                  )}
                  <p className="text-sm text-destructive">
                    This will revoke their access to the organization portal. This action cannot be undone.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivate.isPending}>Cancel</AlertDialogCancel>
          {!isSelf && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={deactivate.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Deactivate
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
