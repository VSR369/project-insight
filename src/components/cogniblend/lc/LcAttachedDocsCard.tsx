/**
 * LcAttachedDocsCard — List of accepted/attached legal docs with delete dialog.
 * Pure presentation; mutations are owned by the page orchestrator.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, FileText, Trash2 } from 'lucide-react';
import type { AttachedDoc } from '@/lib/cogniblend/lcLegalHelpers';

export interface LcAttachedDocsCardProps {
  docs: AttachedDoc[] | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
  onDelete: (docId: string) => void;
  isDeleting: boolean;
}

export function LcAttachedDocsCard({
  docs,
  isLoading,
  currentUserId,
  onDelete,
  isDeleting,
}: LcAttachedDocsCardProps) {
  if (isLoading || !docs || docs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Attached Legal Documents ({docs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-3 flex items-center gap-3 bg-muted/30"
            >
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{doc.document_name ?? doc.document_type}</span>
                  <Badge variant="outline" className="text-[10px]">Tier {doc.tier}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{doc.document_type}</Badge>
                  {doc.lc_status && (
                    <Badge
                      variant={doc.lc_status === 'approved' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {doc.lc_status}
                    </Badge>
                  )}
                </div>
                {doc.lc_review_notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{doc.lc_review_notes}</p>
                )}
              </div>
              {doc.attached_by === currentUserId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      disabled={isDeleting}
                      aria-label="Delete legal document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Legal Document</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{doc.document_name ?? doc.document_type}"?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(doc.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default LcAttachedDocsCard;
