import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { useApproveDocument, fetchDocumentBlob } from '@/hooks/queries/useSeekerOrgApprovals';
import { RejectDocumentDialog } from './RejectDocumentDialog';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
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

interface DocumentReviewCardProps {
  documents: SeekerDocument[];
}

export function DocumentReviewCard({ documents }: DocumentReviewCardProps) {
  const approveDoc = useApproveDocument();
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SeekerDocument | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = async (doc: SeekerDocument) => {
    setPreviewLoading(doc.id);
    setPreviewDoc(doc);
    // Revoke previous blob URL
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setPdfData(null);
    setPreviewOpen(true);

    const result = await fetchDocumentBlob(doc.storage_path);
    if (result) {
      setBlobUrl(result.blobUrl);
      // For PDFs, also extract ArrayBuffer for PDF.js
      if (doc.mime_type === 'application/pdf') {
        const ab = await result.blob.arrayBuffer();
        setPdfData(ab);
      }
    }
    setPreviewLoading(null);
  };

  const handlePreviewClose = (open: boolean) => {
    setPreviewOpen(open);
    if (!open) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setPdfData(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Uploaded Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{doc.document_type}</span>
                    {doc.file_size && <span>· {formatSize(Number(doc.file_size))}</span>}
                  </div>
                </div>
                <Badge className={statusColors[doc.verification_status] ?? ''}>{doc.verification_status}</Badge>
                <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)} disabled={previewLoading === doc.id}>
                  {previewLoading === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                </Button>
                {doc.verification_status === 'pending' && (
                  <>
                    <Button variant="ghost" size="icon" className="text-green-600" onClick={() => approveDoc.mutate(doc.id)} disabled={approveDoc.isPending}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRejectDocId(doc.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {doc.verification_status === 'rejected' && doc.rejection_reason && (
                  <span className="text-xs text-destructive max-w-[200px] truncate" title={doc.rejection_reason}>
                    {doc.rejection_reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <RejectDocumentDialog open={!!rejectDocId} onOpenChange={(open) => !open && setRejectDocId(null)} docId={rejectDocId ?? ''} />

      <DocumentPreviewDialog
        doc={previewDoc}
        blobUrl={blobUrl}
        pdfData={pdfData}
        open={previewOpen}
        onOpenChange={handlePreviewClose}
      />
    </Card>
  );
}
