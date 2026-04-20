/**
 * LcSourceDocUpload — Multi-file source document upload for the unified
 * legal document workflow. The LC (or Curator in STRUCTURED) uploads source
 * legal docs that Pass 3 AI will read and merge into the unified SPA.
 *
 * Pure presentation. Mutations live in useSourceDocs.
 */
import { useRef, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Info,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSourceDocs,
  useUploadSourceDoc,
  useDeleteSourceDoc,
  useArrangeIntoSections,
} from '@/hooks/queries/useSourceDocs';
import {
  SOURCE_DOC_CONFIG,
  ORIGIN_LABEL,
  type SourceOrigin,
} from '@/services/legal/sourceDocService';
import { useAuth } from '@/hooks/useAuth';

export interface LcSourceDocUploadProps {
  challengeId: string;
  sourceOrigin: SourceOrigin;
  disabled?: boolean;
}

export function LcSourceDocUpload({
  challengeId,
  sourceOrigin,
  disabled = false,
}: LcSourceDocUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  const { data: docs, isLoading } = useSourceDocs(challengeId);
  const uploadMut = useUploadSourceDoc();
  const deleteMut = useDeleteSourceDoc();
  const arrangeMut = useArrangeIntoSections();

  const triggerPicker = () => inputRef.current?.click();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.id) return;
    for (const file of Array.from(files)) {
      setUploadingName(file.name);
      try {
        await uploadMut.mutateAsync({
          challengeId,
          userId: user.id,
          sourceOrigin,
          file,
        });
      } catch {
        /* errors handled by hook */
      }
    }
    setUploadingName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isBusy = disabled || uploadMut.isPending || arrangeMut.isPending;
  const hasDocs = (docs?.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Upload Source Legal Documents
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Upload your existing legal terms, contracts, or templates. Pass 3 AI
          will read these documents and merge relevant clauses into the
          appropriate sections of the unified agreement.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={SOURCE_DOC_CONFIG.allowedExtensions.join(',')}
          multiple
          className="hidden"
          onChange={handleFiles}
          aria-hidden="true"
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPicker}
            disabled={isBusy}
            aria-label="Upload source legal documents"
          >
            {uploadMut.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            {uploadMut.isPending
              ? `Uploading ${uploadingName ?? ''}…`
              : 'Add Documents'}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {SOURCE_DOC_CONFIG.allowedExtensions.join(', ')} · max{' '}
            {SOURCE_DOC_CONFIG.maxSizeMB} MB each
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : hasDocs ? (
          <div className="space-y-2">
            {docs!.map((doc) => {
              const isPdf = !doc.content_html && !!doc.lc_review_notes;
              const originKey = (doc.source_origin ?? 'lc') as SourceOrigin;
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-md border bg-muted/20 p-2.5"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {doc.document_name ?? 'Untitled'}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {ORIGIN_LABEL[originKey]}
                      </Badge>
                      {isPdf && (
                        <Badge variant="outline" className="text-[10px]">
                          PDF — extracted by AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(doc.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    disabled={isBusy || deleteMut.isPending}
                    onClick={() =>
                      deleteMut.mutate({
                        challengeId,
                        docId: doc.id,
                        storagePath: doc.lc_review_notes,
                      })
                    }
                    aria-label={`Remove ${doc.document_name ?? 'document'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No source documents uploaded yet. Pass 3 will generate the unified
            agreement from challenge context alone if you proceed without uploads.
          </p>
        )}

        {hasDocs && (
          <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 dark:text-amber-200">
              After uploading, click <strong>Run Pass 3 AI Review</strong> below
              to generate the unified agreement that incorporates these documents,
              OR use <strong>Arrange into Sections</strong> for verbatim slotting
              without AI enhancement.
            </AlertDescription>
          </Alert>
        )}

        {hasDocs && (
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between border-t pt-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Arrange-only mode preserves uploaded clause wording verbatim — no AI
              rewording or content generation.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => arrangeMut.mutate({ challengeId })}
            >
              {arrangeMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Arrange into Sections (No AI Enhancement)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LcSourceDocUpload;
