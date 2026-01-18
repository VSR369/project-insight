import * as React from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => Promise<void>;
  onHardDelete?: () => Promise<void>;
  isLoading?: boolean;
  isSoftDelete?: boolean;
  hasChildren?: boolean;
  childrenMessage?: string;
  showHardDelete?: boolean;
  hardDeleteLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Delete Item",
  description,
  itemName,
  onConfirm,
  onHardDelete,
  isLoading = false,
  isSoftDelete = true,
  hasChildren = false,
  childrenMessage,
  showHardDelete = false,
  hardDeleteLoading = false,
}: DeleteConfirmDialogProps) {
  const [hardDeleteConfirmed, setHardDeleteConfirmed] = React.useState(false);

  // Reset confirmation when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setHardDeleteConfirmed(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleHardDelete = async () => {
    if (!onHardDelete || !hardDeleteConfirmed) return;
    try {
      await onHardDelete();
      onOpenChange(false);
    } catch {
      // Error handling is done in the parent component
    }
  };

  const defaultDescription = isSoftDelete
    ? `This will deactivate "${itemName || "this item"}". You can restore it later if needed.`
    : `This will permanently delete "${itemName || "this item"}". This action cannot be undone.`;

  const anyLoading = isLoading || hardDeleteLoading;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{description || defaultDescription}</span>
            {hasChildren && childrenMessage && (
              <span className="block mt-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <strong>Warning:</strong> {childrenMessage}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {showHardDelete && onHardDelete && (
          <div className="border-t pt-4 mt-2">
            <div className="flex items-start space-x-3 p-3 bg-destructive/5 rounded-md border border-destructive/20">
              <Checkbox
                id="confirm-hard-delete"
                checked={hardDeleteConfirmed}
                onCheckedChange={(checked) => setHardDeleteConfirmed(checked === true)}
                disabled={anyLoading}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="confirm-hard-delete"
                  className="text-sm font-medium text-destructive cursor-pointer"
                >
                  Permanently delete instead
                </Label>
                <p className="text-xs text-muted-foreground">
                  I understand this action cannot be undone and all associated data will be lost.
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={anyLoading}>Cancel</AlertDialogCancel>
          
          {hardDeleteConfirmed && onHardDelete ? (
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={anyLoading || hasChildren}
              className="gap-2"
            >
              {hardDeleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Permanently Delete
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={anyLoading || hasChildren}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSoftDelete ? "Deactivate" : "Delete"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
