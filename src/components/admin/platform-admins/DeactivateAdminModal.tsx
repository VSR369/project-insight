/**
 * MOD-M-05: Deactivate Admin Confirmation Modal
 */

import { useState } from 'react';
import { useDeactivatePlatformAdmin } from '@/hooks/mutations/usePlatformAdminMutations';
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
  pendingVerifications: number;
}

export function DeactivateAdminModal({
  open,
  onOpenChange,
  adminId,
  adminName,
  pendingVerifications,
}: DeactivateAdminModalProps) {
  const [confirmation, setConfirmation] = useState('');
  const deactivate = useDeactivatePlatformAdmin();

  const handleConfirm = async () => {
    await deactivate.mutateAsync(adminId);
    onOpenChange(false);
    setConfirmation('');
  };

  const isConfirmed = confirmation === 'DEACTIVATE';

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
          {pendingVerifications > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This admin has <strong>{pendingVerifications}</strong> pending verification(s).
                These will need to be reassigned manually (bulk reassignment coming in MOD-02).
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Type DEACTIVATE to confirm</Label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DEACTIVATE"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deactivate.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || deactivate.isPending}
          >
            {deactivate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
