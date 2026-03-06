/**
 * MOD-M-06: Supervisor Flag Toggle Confirmation Modal
 * Two variants: enabling (amber) and removing (red).
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SupervisorFlagToggleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabling: boolean;
  adminName: string;
  onConfirm: () => void;
}

export function SupervisorFlagToggleModal({
  open,
  onOpenChange,
  enabling,
  adminName,
  onConfirm,
}: SupervisorFlagToggleModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {enabling ? (
              <Shield className="h-5 w-5 text-amber-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {enabling ? 'Grant Supervisor Access' : 'Remove Supervisor Access'}
          </DialogTitle>
          <DialogDescription>
            {enabling
              ? `You are about to grant Supervisor privileges to ${adminName}. This gives them full administrative control including the ability to manage other admins.`
              : `You are about to remove Supervisor privileges from ${adminName}. They will be downgraded and lose the ability to manage other admins.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          <Alert
            className={
              enabling
                ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
                : 'border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20'
            }
          >
            <AlertDescription>
              {enabling
                ? 'Supervisors can create, edit, and deactivate all other admin profiles. Grant this role only to trusted personnel.'
                : 'Ensure at least one other Supervisor remains active before removing this flag. The system will prevent removal of the last Supervisor.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={enabling ? 'default' : 'destructive'}
            onClick={handleConfirm}
          >
            {enabling ? 'Grant Supervisor' : 'Remove Supervisor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
