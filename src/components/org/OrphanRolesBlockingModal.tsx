/**
 * SCR-14a: Orphan Roles Blocking Modal
 * BRD Ref: BR-DEL-002, MOD-03
 * Blocking modal shown when deactivating a delegated admin who holds active roles.
 * Shows explicit count and requires confirmation before proceeding.
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface OrphanRole {
  role_code: string;
  display_name: string;
  assignment_count: number;
}

interface OrphanRolesBlockingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName: string;
  orphanRoles: OrphanRole[];
  onConfirmDeactivation: () => void;
  onReassignFirst: () => void;
  isDeactivating?: boolean;
}

export function OrphanRolesBlockingModal({
  open,
  onOpenChange,
  adminName,
  orphanRoles,
  onConfirmDeactivation,
  onReassignFirst,
  isDeactivating,
}: OrphanRolesBlockingModalProps) {
  const totalOrphaned = orphanRoles.reduce((sum, r) => sum + r.assignment_count, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Orphan Roles Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Deactivating <strong>{adminName}</strong> will orphan{" "}
                <strong>{totalOrphaned} role assignment{totalOrphaned !== 1 ? "s" : ""}</strong>{" "}
                across {orphanRoles.length} role type{orphanRoles.length !== 1 ? "s" : ""}.
              </p>

              <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
                {orphanRoles.map((role) => (
                  <div key={role.role_code} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{role.display_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {role.assignment_count} assignment{role.assignment_count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>

              <p className="text-xs">
                You can reassign these roles first, or proceed with deactivation (roles will become unassigned).
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onReassignFirst}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Reassign First
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onConfirmDeactivation}
            disabled={isDeactivating}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeactivating ? "Deactivating..." : "Deactivate Anyway"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
