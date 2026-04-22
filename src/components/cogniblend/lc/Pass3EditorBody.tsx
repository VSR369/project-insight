/**
 * Pass3EditorBody — Section nav + TipTap editor surface + bottom action row.
 * Extracted from LcPass3ReviewPanel to keep that file under the 250-line cap.
 *
 * `isLocked` (derived from `challenge.lc_compliance_complete`) is the single
 * write-permission gate. `isPass3Accepted` only drives visual badges and the
 * `is-accepted` CSS dim — it does NOT freeze the editor.
 */
import { useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalDocEditorToolbar } from '@/components/cogniblend/legal/LegalDocEditorToolbar';
import { LegalDocQuickInserts } from '@/components/cogniblend/legal/LegalDocQuickInserts';
import { Pass3SectionNavWrapper } from '@/components/cogniblend/legal/Pass3SectionNavWrapper';
import { Pass3AttributionBadge } from '@/components/cogniblend/legal/Pass3AttributionBadge';
import { ConfirmRegenerateDialog } from '@/components/cogniblend/lc/ConfirmRegenerateDialog';
import type { AutoSavePass3Status } from '@/hooks/cogniblend/useAutoSavePass3';
import { cn } from '@/lib/utils';

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

interface AutoSaveChipProps {
  status: AutoSavePass3Status;
  savedAt: string | null;
}

function AutoSaveChip({ status, savedAt }: AutoSaveChipProps) {
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" />
        Saved {formatRelative(savedAt)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
      Auto-save failed — click Save Draft
    </span>
  );
}

export interface Pass3EditorBodyProps {
  editor: Editor | null;
  unifiedDocHtml: string;
  isPass3Accepted: boolean;
  /** True when LC has submitted to curator (lc_compliance_complete) — locks edits. */
  isLocked: boolean;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  editedHtml: string;
  isRunning: boolean;
  isOrganizing: boolean;
  isSaving: boolean;
  isAccepting: boolean;
  isDirty: boolean;
  highlightActive?: boolean;
  onClearHighlights?: () => void;
  onRerun: () => void;
  onReorganize: () => void;
  onSave: () => void;
  onAccept: () => void;
  /** When the loaded UNIFIED_SPA was produced by Re-organize (no AI). */
  isOrganizedOutput?: boolean;
  /** Names of source documents that contributed extracted text. */
  sourceDocNames?: string[];
  /** Names of source documents whose text could not be extracted (e.g. PDFs). */
  skippedSourceDocNames?: string[];
  /** True if the server flagged any clause as not traceable to source docs. */
  hasUnverifiedSourceMatch?: boolean;
  /** Server-generated `ai_changes_summary` for the current unified doc. */
  aiChangesSummary?: string;
  autoSaveStatus?: AutoSavePass3Status;
  autoSavedAt?: string | null;
}

export function Pass3EditorBody({
  editor,
  unifiedDocHtml,
  isPass3Accepted,
  isLocked,
  reviewerUserId,
  reviewedAt,
  editedHtml,
  isRunning,
  isOrganizing,
  isSaving,
  isAccepting,
  isDirty,
  highlightActive = false,
  onClearHighlights,
  onRerun,
  onReorganize,
  onSave,
  onAccept,
  isOrganizedOutput = false,
  sourceDocNames = [],
  skippedSourceDocNames = [],
  hasUnverifiedSourceMatch = false,
  aiChangesSummary = '',
  autoSaveStatus = 'idle',
  autoSavedAt = null,
}: Pass3EditorBodyProps) {
  const containerRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const hasDraft = unifiedDocHtml.trim().length > 0;
  const canEdit = !isLocked;

  return (
    <>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <LegalDocEditorToolbar editor={editor} />
          <LegalDocQuickInserts editor={editor} />
          <div className="ml-auto">
            <AutoSaveChip status={autoSaveStatus} savedAt={autoSavedAt} />
          </div>
        </div>
      )}

      {isOrganizedOutput && canEdit && (
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Organize merged content from {sourceDocNames.length} source
                document{sourceDocNames.length === 1 ? '' : 's'}
                {sourceDocNames.length > 0 ? `: ${sourceDocNames.join(', ')}` : ''}.
                No new wording was generated.
              </span>
            </div>
            {skippedSourceDocNames.length > 0 && (
              <div className="pl-5 text-[11px] italic">
                {skippedSourceDocNames.length} source
                {skippedSourceDocNames.length === 1 ? ' had' : 's had'} no
                extractable text and {skippedSourceDocNames.length === 1 ? 'was' : 'were'}{' '}
                skipped: {skippedSourceDocNames.join(', ')}.
              </div>
            )}
          </div>
          {hasUnverifiedSourceMatch && (
            <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Some clauses could not be traced back to your uploaded sources.
                  Review carefully or re-upload more complete source documents
                  before accepting.
                </span>
              </div>
              {aiChangesSummary.trim().length > 0 && (
                <details className="pl-5">
                  <summary className="cursor-pointer text-[11px] font-medium underline-offset-2 hover:underline">
                    View AI summary
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] text-destructive/90">
                    {aiChangesSummary}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {highlightActive && canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-destructive">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Changes from previous version</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-destructive/15 ring-1 ring-destructive/40" />
              <span>Red = added or enhanced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded-sm bg-muted ring-1 ring-muted-foreground/40 line-through text-[8px] text-center text-muted-foreground leading-3">
                abc
              </span>
              <span>Strikethrough = removed</span>
            </div>
          </div>
          {onClearHighlights && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={onClearHighlights}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
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
            <div className={cn('legal-doc', isPass3Accepted && 'is-accepted')}>
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

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <ConfirmRegenerateDialog
            mode="organize"
            onConfirm={onReorganize}
            skipConfirm={!hasDraft}
            isDirty={isDirty}
            disabled={isRunning || isOrganizing || isSaving || isAccepting}
            trigger={
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Re-organize (No AI)
              </Button>
            }
          />
          <ConfirmRegenerateDialog
            mode="pass3"
            onConfirm={onRerun}
            skipConfirm={!hasDraft}
            isDirty={isDirty}
            disabled={isRunning || isOrganizing || isSaving || isAccepting}
            trigger={
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Re-run AI Pass 3
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
            {isPass3Accepted ? 'Re-confirm Acceptance' : 'Accept Legal Documents'}
          </Button>
        </div>
      )}
    </>
  );
}

export default Pass3EditorBody;
