/**
 * ScopeOverlapWarning — MOD-M-SOA-01: Warning dialog when admin scopes overlap
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

interface ScopeOverlapWarningProps {
  open: boolean;
  overlappingAdmins: { name: string; email: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScopeOverlapWarning({ open, overlappingAdmins, onConfirm, onCancel }: ScopeOverlapWarningProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Scope Overlap Detected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                The selected domain scope overlaps with {overlappingAdmins.length} existing delegated admin(s):
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {overlappingAdmins.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium">{a.name}</span>{' '}
                    <span className="text-muted-foreground">({a.email})</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                This means multiple admins will have access to the same areas. Do you want to proceed?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Proceed Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
