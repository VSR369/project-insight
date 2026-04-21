/**
 * Pass3EditorBody — Section nav + TipTap editor surface + bottom action row.
 * Extracted from LcPass3ReviewPanel to keep that file under the 250-line cap.
 */
import { useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { CheckCircle2, Loader2, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalDocEditorToolbar } from '@/components/cogniblend/legal/LegalDocEditorToolbar';
import { LegalDocQuickInserts } from '@/components/cogniblend/legal/LegalDocQuickInserts';
import { Pass3SectionNavWrapper } from '@/components/cogniblend/legal/Pass3SectionNavWrapper';
import { Pass3AttributionBadge } from '@/components/cogniblend/legal/Pass3AttributionBadge';
import { ConfirmRegenerateDialog } from '@/components/cogniblend/lc/ConfirmRegenerateDialog';
import { cn } from '@/lib/utils';

export interface Pass3EditorBodyProps {
  editor: Editor | null;
  unifiedDocHtml: string;
  isPass3Accepted: boolean;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  editedHtml: string;
  isRunning: boolean;
  isSaving: boolean;
  isAccepting: boolean;
  isDirty: boolean;
  highlightActive?: boolean;
  onClearHighlights?: () => void;
  onRerun: () => void;
  onSave: () => void;
  onAccept: () => void;
}

export function Pass3EditorBody({
  editor,
  unifiedDocHtml,
  isPass3Accepted,
  reviewerUserId,
  reviewedAt,
  editedHtml,
  isRunning,
  isSaving,
  isAccepting,
  isDirty,
  highlightActive = false,
  onClearHighlights,
  onRerun,
  onSave,
  onAccept,
}: Pass3EditorBodyProps) {
  const containerRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const hasDraft = unifiedDocHtml.trim().length > 0;

  return (
    <>
      {!isPass3Accepted && (
        <div className="flex flex-wrap items-center gap-2">
          <LegalDocEditorToolbar editor={editor} />
          <LegalDocQuickInserts editor={editor} />
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <Pass3SectionNavWrapper
          containerRef={containerRef}
          contentKey={unifiedDocHtml.length}
          isAccepted={isPass3Accepted}
        />
        <div className="flex-1 min-w-0">
          <div className="legal-doc-page" ref={containerRef}>
            <div className="legal-doc">
              <EditorContent editor={editor} />
            </div>
          </div>
          {isPass3Accepted && (
            <Pass3AttributionBadge
              reviewerUserId={reviewerUserId}
              reviewedAt={reviewedAt}
            />
          )}
        </div>
      </div>

      {!isPass3Accepted && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <ConfirmRegenerateDialog
            onConfirm={onRerun}
            skipConfirm={!hasDraft}
            isDirty={isDirty}
            disabled={isRunning || isSaving || isAccepting}
            trigger={
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Re-run Pass 3
              </Button>
            }
          />
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving || isAccepting || !editedHtml}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={onAccept}
            disabled={isAccepting || isSaving}
            className="gap-2"
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Accept Legal Documents
          </Button>
        </div>
      )}
    </>
  );
}

export default Pass3EditorBody;
