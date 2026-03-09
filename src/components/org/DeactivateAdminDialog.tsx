/**
 * DeactivateAdminDialog — Confirmation dialog for deactivating a delegated admin.
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
import { useDeactivateDelegatedAdmin } from '@/hooks/queries/useDelegatedAdmins';
import type { DelegatedAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { Loader2 } from 'lucide-react';

interface DeactivateAdminDialogProps {
  admin: DelegatedAdmin | null;
  organizationId: string;
  onClose: () => void;
}

export function DeactivateAdminDialog({ admin, organizationId, onClose }: DeactivateAdminDialogProps) {
  const deactivate = useDeactivateDelegatedAdmin();

  const handleConfirm = () => {
    if (!admin) return;
    deactivate.mutate(
      { adminId: admin.id, organizationId },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <AlertDialog open={!!admin} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Delegated Admin</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate <strong>{admin?.full_name ?? admin?.email}</strong>?
            This will revoke their access to the organization portal. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivate.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deactivate.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deactivate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
