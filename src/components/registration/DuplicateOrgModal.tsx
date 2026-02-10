/**
 * Duplicate Organization Modal (BR-REG-007)
 * 
 * Warns the user if a similar organization name already exists
 * in the same country. Offers to proceed anyway or go back.
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
import { AlertTriangle } from 'lucide-react';

interface DuplicateOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingOrgName?: string;
  onProceed: () => void;
  onCancel: () => void;
}

export function DuplicateOrgModal({
  open,
  onOpenChange,
  existingOrgName,
  onProceed,
  onCancel,
}: DuplicateOrgModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Similar Organization Found</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              An organization with a similar name already exists:
            </p>
            <p className="font-medium text-foreground">
              "{existingOrgName}"
            </p>
            <p>
              If this is the same organization, please contact support to recover access.
              Otherwise, you may proceed with registration.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
