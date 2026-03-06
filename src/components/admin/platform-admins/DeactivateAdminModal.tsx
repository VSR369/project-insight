/**
 * MOD-M-05: Deactivate Admin Confirmation Modal
 * Requires typing admin's exact full name (case-sensitive).
 * Includes admin summary card and BR-MPA-001/002 pre-guards.
 */

import { useState } from 'react';
import { useDeactivatePlatformAdmin } from '@/hooks/mutations/usePlatformAdminMutations';
import { useAvailableAdminCounts } from '@/hooks/queries/useAvailableAdminCounts';
import { AdminStatusBadge } from './AdminStatusBadge';
import { WorkloadBar } from './WorkloadBar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeactivateAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  adminName: string;
  adminEmail?: string;
  adminStatus?: string;
  currentVerifications?: number;
  maxVerifications?: number;
  pendingVerifications: number;
  isSupervisor?: boolean;
}

export function DeactivateAdminModal({
  open,
  onOpenChange,
  adminId,
  adminName,
  adminEmail,
  adminStatus,
  currentVerifications = 0,
  maxVerifications = 10,
  pendingVerifications,
  isSupervisor: isTargetSupervisor = false,
}: DeactivateAdminModalProps) {
  const [confirmation, setConfirmation] = useState('');
  const deactivate = useDeactivatePlatformAdmin();
  const { data: counts } = useAvailableAdminCounts();

  const isLastAvailable = adminStatus === 'Available' && (counts?.availableCount ?? 2) <= 1;
  const isLastSupervisor = isTargetSupervisor && (counts?.supervisorCount ?? 2) <= 1;
  const isBlocked = isLastAvailable || isLastSupervisor;

  const handleConfirm = async () => {
    await deactivate.mutateAsync(adminId);
    onOpenChange(false);
    setConfirmation('');
  };

  const isConfirmed = confirmation === adminName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deactivate Admin
          </DialogTitle>
          <DialogDescription>
            This will deactivate <strong>{adminName}</strong>. They will no longer be able to
            perform verifications or access admin functions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          {/* Admin summary card */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{adminName}</span>
            </div>
            {adminEmail && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{adminEmail}</span>
              </div>
            )}
            {adminStatus && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <AdminStatusBadge status={adminStatus} />
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Workload</span>
              <WorkloadBar current={currentVerifications} max={maxVerifications} />
            </div>
          </div>

          {isLastAvailable && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is the last Available admin. At least one admin must remain Available. 
                Deactivation is blocked.
              </AlertDescription>
            </Alert>
          )}

          {isLastSupervisor && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is the last active Supervisor. At least one Supervisor must remain active. 
                Deactivation is blocked.
              </AlertDescription>
            </Alert>
          )}

          {pendingVerifications > 0 && !isBlocked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This admin has <strong>{pendingVerifications}</strong> pending verification(s).
                These will need to be reassigned manually (bulk reassignment coming in MOD-02).
              </AlertDescription>
            </Alert>
          )}

          {!isBlocked && (
            <div className="space-y-2">
              <Label>
                Type <strong>{adminName}</strong> to confirm (case-sensitive)
              </Label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={adminName}
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deactivate.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isBlocked || !isConfirmed || deactivate.isPending}
          >
            {deactivate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
