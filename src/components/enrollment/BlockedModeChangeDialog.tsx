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
import { AlertTriangle, Building2, Mail, User } from 'lucide-react';

interface BlockedModeChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managerName?: string;
  managerEmail?: string;
  orgName?: string;
  onCancelAndReset: () => void;
  isResetting?: boolean;
}

export function BlockedModeChangeDialog({
  open,
  onOpenChange,
  managerName,
  managerEmail,
  orgName,
  onCancelAndReset,
  isResetting = false,
}: BlockedModeChangeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">Mode Change Not Allowed</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-base">
                Approval from your organization manager is pending. <strong>To change your participation mode, you must cancel the current organization approval request.</strong>
              </p>

              {/* Organization & Manager Info */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 border">
                {orgName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Organization:</span>
                    <span className="font-medium text-foreground">{orgName}</span>
                  </div>
                )}
                {managerName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Manager:</span>
                    <span className="font-medium text-foreground">{managerName}</span>
                  </div>
                )}
                {managerEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{managerEmail}</span>
                  </div>
                )}
              </div>

              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-2">What happens when you cancel:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    <span>Your manager's login credentials will be <strong>invalidated immediately</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    <span>Your manager will receive a notification that the request was withdrawn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    <span>Your organization details will be cleared</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    <span>You will be taken to select a new participation mode</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isResetting}>
            Keep Current Mode
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onCancelAndReset();
            }}
            disabled={isResetting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? 'Cancelling...' : 'Cancel & Change Mode'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
