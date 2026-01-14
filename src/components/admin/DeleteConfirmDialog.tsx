import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  isSoftDelete?: boolean;
  hasChildren?: boolean;
  childrenMessage?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Delete Item",
  description,
  itemName,
  onConfirm,
  isLoading = false,
  isSoftDelete = true,
  hasChildren = false,
  childrenMessage,
}: DeleteConfirmDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Delete error:", error);
    }
  };

  const defaultDescription = isSoftDelete
    ? `This will deactivate "${itemName || "this item"}". You can restore it later if needed.`
    : `This will permanently delete "${itemName || "this item"}". This action cannot be undone.`;

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
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || hasChildren}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSoftDelete ? "Deactivate" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
