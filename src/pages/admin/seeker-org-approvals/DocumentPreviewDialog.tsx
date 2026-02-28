import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, XCircle, Loader2, FileQuestion } from 'lucide-react';
import { useApproveDocument } from '@/hooks/queries/useSeekerOrgApprovals';
import { RejectDocumentDialog } from './RejectDocumentDialog';
import { PdfPreviewCanvas } from '@/components/PdfPreviewCanvas';
import { useState } from 'react';
import type { SeekerDocument } from './types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

interface DocumentPreviewDialogProps {
  doc: SeekerDocument | null;
  blobUrl: string | null;
  pdfData: ArrayBuffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreviewDialog({ doc, blobUrl, pdfData, open, onOpenChange }: DocumentPreviewDialogProps) {
  const approveDoc = useApproveDocument();
  const [rejectOpen, setRejectOpen] = useState(false);

  if (!doc) return null;

  const isImage = doc.mime_type?.startsWith('image/');
  const isPdf = doc.mime_type === 'application/pdf';
  const isPending = doc.verification_status === 'pending';

  const handleApprove = () => {
    approveDoc.mutate(doc.id, { onSuccess: () => onOpenChange(false) });
  };

  const handleRejectSuccess = () => {
    setRejectOpen(false);
    onOpenChange(false);
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderPreview = () => {
    if (!blobUrl && !pdfData) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 p-4">
          <img src={blobUrl!} alt={doc.file_name} className="max-w-full max-h-full object-contain rounded" />
        </div>
      );
    }

    if (isPdf) {
      return <PdfPreviewCanvas pdfData={pdfData} blobUrl={blobUrl} fileName={doc.file_name} />;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileQuestion className="h-12 w-12" />
        <p className="text-sm">Preview not available for this file type.</p>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" /> Download to view
        </Button>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <DialogTitle className="truncate">{doc.file_name}</DialogTitle>
              <Badge className={statusColors[doc.verification_status] ?? ''}>{doc.verification_status}</Badge>
            </div>
            <DialogDescription className="flex gap-2 text-xs">
              <span>{doc.document_type}</span>
              {doc.file_size && <span>· {formatSize(Number(doc.file_size))}</span>}
              {doc.mime_type && <span>· {doc.mime_type}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col px-6 overflow-hidden">
            {renderPreview()}
          </div>

          <DialogFooter className="shrink-0 px-6 pb-6 pt-3 flex-row justify-between sm:justify-between">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!blobUrl}>
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            {isPending && (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approveDoc.isPending}>
                  {approveDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Accept
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectDocumentDialog
        open={rejectOpen}
        onOpenChange={(o) => { setRejectOpen(o); if (!o) handleRejectSuccess(); }}
        docId={doc.id}
      />
    </>
  );
}
