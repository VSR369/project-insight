/**
 * LcAttachedDocsCard — List of accepted/attached legal docs with delete
 * dialog and lazy "View content" expansion (S7A-3).
 *
 * Pure presentation. Mutations are owned by the page orchestrator.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ChevronDown, Eye, FileText, Trash2 } from 'lucide-react';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { useLegalDocContent } from '@/hooks/cogniblend/useLcLegalData';
import type { AttachedDoc } from '@/lib/cogniblend/lcLegalHelpers';

export interface LcAttachedDocsCardProps {
  docs: AttachedDoc[] | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
  onDelete: (docId: string) => void;
  isDeleting: boolean;
}

/** Per-row content viewer — fetches HTML lazily when opened. */
function DocContentRow({ docId, open }: { docId: string; open: boolean }) {
  const { data, isLoading } = useLegalDocContent(docId, open);
  if (!open) return null;
  if (isLoading) {
    return (
      <div className="px-3 pb-3">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  const html = data?.ai_modified_content_html ?? data?.content_html ?? null;
  if (!html) {
    return (
      <div className="px-3 pb-3">
        <p className="text-xs text-muted-foreground italic">
          {data?.content_summary
            ? data.content_summary
            : 'No document content available yet.'}
        </p>
      </div>
    );
  }
  return (
    <div className="px-3 pb-3">
      <LegalDocumentViewer
        content={html}
        className="max-h-[480px] border border-border rounded-md bg-muted/20"
      />
    </div>
  );
}

export function LcAttachedDocsCard({
  docs,
  isLoading,
  currentUserId,
  onDelete,
  isDeleting,
}: LcAttachedDocsCardProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  if (isLoading || !docs || docs.length === 0) return null;

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          {docs.map((doc) => {
            const isOpen = openIds.has(doc.id);
            return (
              <Collapsible
                key={doc.id}
                open={isOpen}
                onOpenChange={() => toggle(doc.id)}
              >
                <div className="border rounded-lg bg-muted/30">
                  <div className="p-3 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {doc.document_name ?? doc.document_type}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Tier {doc.tier}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {doc.document_type}
                        </Badge>
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
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {doc.lc_review_notes}
                        </p>
                      )}
                    </div>

                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        aria-label={isOpen ? 'Hide document content' : 'View document content'}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="hidden lg:inline text-xs">
                          {isOpen ? 'Hide' : 'View'}
                        </span>
                        <ChevronDown
                          className={`h-3 w-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </Button>
                    </CollapsibleTrigger>

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
                              Are you sure you want to delete &quot;
                              {doc.document_name ?? doc.document_type}&quot;? This action cannot be undone.
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
                  <CollapsibleContent>
                    <DocContentRow docId={doc.id} open={isOpen} />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default LcAttachedDocsCard;
