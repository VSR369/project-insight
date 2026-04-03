/**
 * LegalDocUploadConfirmDialog — Warns before replacing editor content with uploaded file.
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

interface LegalDocUploadConfirmDialogProps {
  open: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LegalDocUploadConfirmDialog({
  open,
  fileName,
  onConfirm,
  onCancel,
}: LegalDocUploadConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace current content?</AlertDialogTitle>
          <AlertDialogDescription>
            Uploading <strong>{fileName}</strong> will replace all existing editor
            content. This action cannot be undone. Make sure you have saved any
            changes you want to keep.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Replace Content
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
