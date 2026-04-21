/**
 * LcSourceDocUpload — Upload + list of source legal documents, with optional
 * Pass 3 / Organize & Merge action buttons rendered at the bottom so the
 * user sees them next to the live document count at the decision point.
 */
import { useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LcSourceDocActions } from '@/components/cogniblend/lc/LcSourceDocActions';
import {
  useSourceDocs,
  useUploadSourceDoc,
  useDeleteSourceDoc,
} from '@/hooks/queries/useSourceDocs';
import {
  SOURCE_DOC_CONFIG,
  ORIGIN_LABEL,
  type SourceOrigin,
} from '@/services/legal/sourceDocService';
import { useAuth } from '@/hooks/useAuth';

export interface LcSourceDocUploadProps {
  challengeId: string;
  /** The role uploading new docs from this card. */
  sourceOrigin: SourceOrigin;
  disabled?: boolean;
  /** When provided, renders a Run AI Pass 3 button at the bottom of the card. */
  onRunPass3?: () => void;
  /** When provided, renders an Organize & Merge button alongside Run Pass 3. */
  onOrganizeOnly?: () => void;
  /** Spinner on the Re-run AI Pass 3 button — true only while Pass 3 itself runs. */
  isRunningPass3?: boolean;
  /** Spinner on the Re-organize button — true only while Organize itself runs. */
  isOrganizing?: boolean;
  /** Re-labels the buttons as "Re-run" / "Re-organize" once a draft exists. */
  hasGenerated?: boolean;
  /** When true, regenerate clicks show a confirm dialog (draft would be replaced). */
  hasDraft?: boolean;
  /** When true, the dialog uses the strong "edits will be discarded" copy. */
  isDirty?: boolean;
}

export function LcSourceDocUpload({
  challengeId,
  sourceOrigin,
  disabled = false,
  onRunPass3,
  onOrganizeOnly,
  isRunningPass3 = false,
  isOrganizing = false,
  hasGenerated = false,
  hasDraft = false,
  isDirty = false,
}: LcSourceDocUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  const { data: docs, isLoading } = useSourceDocs(challengeId);
  const uploadMut = useUploadSourceDoc();
  const deleteMut = useDeleteSourceDoc();

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

  const isBusy = disabled || uploadMut.isPending;
  const pass3Busy = isRunningPass3 || isOrganizing;
  const sourceList = docs ?? [];
  const hasDocs = sourceList.length > 0;
  const inheritedDocs = sourceList.filter(
    (d) => d.source_origin && d.source_origin !== sourceOrigin,
  );
  const showActions = !!onRunPass3 || !!onOrganizeOnly;
  const runLabel = hasGenerated
    ? 'Re-run AI Pass 3'
    : 'Run AI Pass 3 (Merge + Enhance)';
  const organizeLabel = hasGenerated
    ? 'Re-organize (No AI)'
    : 'Organize & Merge (No AI)';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Source Legal Documents
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Upload existing legal terms from any party. Documents from Creator,
          Curator and Legal Coordinator are all merged into the unified agreement.
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
            {sourceList.map((doc) => {
              const isPdf = !doc.content_html && !!doc.lc_review_notes;
              const originKey = (doc.source_origin ?? 'lc') as SourceOrigin;
              const canDelete = originKey === sourceOrigin;
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
                  {canDelete && (
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
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No source documents uploaded yet by Creator, Curator, or you. You can
            still proceed — Pass 3 will draft the agreement from the curated
            challenge context alone.
          </p>
        )}

        {inheritedDocs.length > 0 && (
          <p className="text-[11px] text-muted-foreground border-t pt-2">
            {inheritedDocs.length} document
            {inheritedDocs.length !== 1 ? 's' : ''} inherited from earlier roles
            (read-only here).
          </p>
        )}

        {showActions && (
          <LcSourceDocActions
            onRunPass3={onRunPass3}
            onOrganizeOnly={onOrganizeOnly}
            isRunningPass3={isRunningPass3}
            isOrganizing={isOrganizing}
            hasDraft={hasDraft}
            isDirty={isDirty}
            disabled={isBusy || pass3Busy}
            runLabel={runLabel}
            organizeLabel={organizeLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default LcSourceDocUpload;
