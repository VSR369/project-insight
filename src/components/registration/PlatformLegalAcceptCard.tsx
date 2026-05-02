/**
 * PlatformLegalAcceptCard — Streams an admin-uploaded platform legal document
 * (Privacy Policy or DPA) into the registration compliance step.
 *
 * Behaviour:
 *  - Fetches the active template via usePlatformLegalTemplate(code).
 *  - Renders a "View document" button that opens a Dialog with LegalDocumentViewer.
 *  - The acceptance checkbox is disabled until the user has opened the dialog
 *    AND scrolled to >= 95% of the content (consistent with the rest of the
 *    legal-acceptance UX in the app).
 *  - If no ACTIVE template exists yet, the checkbox stays disabled with a clear
 *    "not yet published" message — no silent broken-link experience.
 */
import { useState } from 'react';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { usePlatformLegalTemplate } from '@/hooks/queries/usePlatformLegalTemplate';

const SCROLL_THRESHOLD = 95;

interface PlatformLegalAcceptCardProps {
  documentCode: 'PRIVACY_POLICY' | 'DPA';
  fallbackTitle: string;
  accepted: boolean;
  onAcceptedChange: (next: boolean) => void;
  errorMessage?: string;
}

export function PlatformLegalAcceptCard({
  documentCode,
  fallbackTitle,
  accepted,
  onAcceptedChange,
  errorMessage,
}: PlatformLegalAcceptCardProps) {
  const { data: doc, isLoading, isError } = usePlatformLegalTemplate(documentCode);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const handleScrollProgress = (progress: number) => {
    setScrollProgress(progress);
    if (progress >= SCROLL_THRESHOLD) setHasReachedEnd(true);
  };

  const hasContent = !!doc?.content && doc.content.trim().length > 0;
  const canAccept = hasContent && hasReachedEnd;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border p-3 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => onAcceptedChange(v === true)}
            disabled={!canAccept}
            className="mt-0.5"
            aria-label={`Accept ${doc?.document_name ?? fallbackTitle}`}
          />
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                I accept the {doc?.document_name ?? fallbackTitle} *
              </span>
              {doc?.version && (
                <Badge variant="secondary" className="text-xs">v{doc.version}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasContent
                ? hasReachedEnd
                  ? 'You have reviewed the full document — you may now accept.'
                  : `Open and scroll through the document to enable acceptance (${scrollProgress}%).`
                : 'Document has not yet been published by the platform admin.'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={!hasContent}
        >
          <FileText className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive ml-7">{errorMessage}</p>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Failed to load {fallbackTitle}. Please retry.
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {doc?.document_name ?? fallbackTitle}
              {doc?.version && <Badge variant="secondary">v{doc.version}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {hasContent ? (
              <LegalDocumentViewer
                content={doc!.content!}
                onScrollProgress={handleScrollProgress}
                className="h-full max-h-[65vh]"
              />
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                No content available.
              </div>
            )}
          </div>
          <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Scroll progress: {scrollProgress}%
            </span>
            <Button type="button" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
