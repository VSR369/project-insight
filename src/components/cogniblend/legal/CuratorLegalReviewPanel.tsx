/**
 * CuratorLegalReviewPanel — Pass 3 (Legal AI Review) UI for Curators in
 * STRUCTURED / CONTROLLED governance modes.
 *
 * Owns the TipTap editor instance and wires it to the toolbar, quick-inserts,
 * upload handler, and the controlled editor panel. Data access is delegated
 * to useCuratorLegalReview.
 */
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Loader2, Shield, Sparkles, RefreshCw, CheckCircle2, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCuratorLegalReview, type Pass3Confidence } from '@/hooks/cogniblend/useCuratorLegalReview';
import { LegalDocEditorToolbar } from './LegalDocEditorToolbar';
import { LegalDocQuickInserts } from './LegalDocQuickInserts';
import { LegalDocUploadHandler } from './LegalDocUploadHandler';
import { Pass3StaleAlert } from '@/components/cogniblend/creator/Pass3StaleAlert';
import { Pass3SectionNavWrapper } from './Pass3SectionNavWrapper';
import { Pass3AttributionBadge } from './Pass3AttributionBadge';
import { Pass3OverdueBanner } from './Pass3OverdueBanner';
import { Extension } from '@tiptap/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import '@/styles/legal-document.css';

export interface CuratorLegalReviewPanelProps {
  challengeId: string;
  /** When true, editor is non-editable, action buttons hidden, blue banner shown. */
  readOnly?: boolean;
}

const CONFIDENCE_VARIANT: Record<
  NonNullable<Pass3Confidence>,
  { label: string; className: string }
> = {
  high: { label: 'High confidence', className: 'bg-success/10 text-success border-success/30' },
  medium: { label: 'Medium confidence', className: 'bg-warning/10 text-warning border-warning/30' },
  low: { label: 'Low confidence', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

function buildHeadingGuard(protectedHeadings: string[]) {
  const normalized = protectedHeadings.map((h) => h.trim().toLowerCase()).filter(Boolean);
  return Extension.create({
    name: 'protectedHeadingGuard',
    addOptions() {
      return { protectedHeadings: normalized };
    },
  });
}

function collectProtectedHeadings(doc: any, protectedNormalized: string[]): Set<string> {
  const found = new Set<string>();
  doc?.descendants?.((node: any) => {
    if (node?.type?.name === 'heading' && node?.attrs?.level === 2) {
      const text = String(node.textContent ?? '').trim().toLowerCase();
      if (protectedNormalized.includes(text)) found.add(text);
    }
    return true;
  });
  return found;
}

export function CuratorLegalReviewPanel({ challengeId, readOnly = false }: CuratorLegalReviewPanelProps) {
  const review = useCuratorLegalReview(challengeId);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const protectedNormalized = review.protectedHeadings.map((h) => h.trim().toLowerCase());
  const isLocked = readOnly || review.isPass3Accepted;

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder: 'Legal document will appear here after Pass 3...' }),
        buildHeadingGuard(review.protectedHeadings),
      ],
      content: '',
      editable: !isLocked,
      onUpdate: ({ editor: e }) => setEditedHtml(e.getHTML()),
    },
    [protectedNormalized.join('|')],
  );

  // Install the protected-heading dispatch guard.
  useEffect(() => {
    if (!editor || protectedNormalized.length === 0) return;
    const view = editor.view;
    const original = view.props.dispatchTransaction ?? view.dispatch.bind(view);
    const guarded = (tr: typeof view.state.tr) => {
      if (tr.docChanged) {
        const before = collectProtectedHeadings(view.state.doc, protectedNormalized);
        const after = collectProtectedHeadings(tr.doc, protectedNormalized);
        for (const heading of before) {
          if (!after.has(heading)) {
            toast.info(
              'This section is mandatory for the Aggregator model and cannot be removed. You can edit the terms within it.',
            );
            return;
          }
        }
      }
      original(tr);
    };
    view.setProps({ dispatchTransaction: guarded });
    return () => {
      view.setProps({ dispatchTransaction: original });
    };
  }, [editor, protectedNormalized.join('|')]);

  // Sync hook content into the editor whenever it changes externally.
  useEffect(() => {
    if (!editor) return;
    if (review.unifiedDocHtml && review.unifiedDocHtml !== editor.getHTML()) {
      editor.commands.setContent(review.unifiedDocHtml, { emitUpdate: false });
      setEditedHtml(review.unifiedDocHtml);
    }
  }, [editor, review.unifiedDocHtml]);

  // Toggle editability when locked (accepted or read-only mode).
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isLocked);
  }, [editor, isLocked]);

  const handleUpload = (html: string) => {
    if (!editor) return;
    editor.commands.setContent(html, { emitUpdate: true });
    setEditedHtml(html);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Legal Review — Pass 3
          </CardTitle>
          {review.isPass3Accepted && (
            <Badge className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Legal Documents Approved
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {readOnly && (
          <Alert className="border-primary/30 bg-primary/5">
            <Lock className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">View-only — Approved by Legal Coordinator</AlertTitle>
            <AlertDescription>
              {review.reviewedAt
                ? `Legal documents were approved by the Legal Coordinator on ${new Date(review.reviewedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}. The Curator view is read-only.`
                : 'Legal documents are owned by the Legal Coordinator. The Curator view is read-only.'}
            </AlertDescription>
          </Alert>
        )}

        {review.isLoading && <Skeleton className="h-40 w-full" />}

        {!review.isLoading && review.pass3Status === 'idle' && !readOnly && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Run Pass 3 to generate the unified Solution Provider Agreement
              based on your curated challenge content. The AI will review the
              full challenge context and produce a single, formatted legal
              document for your review.
            </p>
            <Button
              size="lg"
              onClick={review.runPass3}
              disabled={review.isRunning}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Run Pass 3 AI Review
            </Button>
          </div>
        )}

        {!review.isLoading && review.pass3Status === 'idle' && readOnly && (
          <p className="text-sm text-muted-foreground italic">
            The Legal Coordinator has not yet generated the unified agreement.
          </p>
        )}

        {review.isRunning && (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              AI is reviewing legal documents against the full challenge context...
            </p>
          </div>
        )}

        {review.pass3Status === 'error' && !review.isRunning && (
          <Alert variant="destructive">
            <AlertTitle>Pass 3 generation failed</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{review.error ?? 'An unknown error occurred.'}</p>
              <Button size="sm" variant="outline" onClick={review.runPass3}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {review.pass3Status === 'completed' && !review.isRunning && (
          <>
            {review.creatorApproval?.isOverdue && (
              <Pass3OverdueBanner
                daysOverdue={review.creatorApproval.daysOverdue}
                onOverride={review.overrideCreatorApproval}
                isOverriding={review.isOverridingCreator}
              />
            )}
            {review.isStale && (
              <Pass3StaleAlert description="Creator made edits. Click 'Re-run Pass 3' to update legal documents." />
            )}
            {review.creatorComments && (
              <Alert>
                <AlertTitle>Creator Comments on Legal Documents</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap text-sm">
                  {review.creatorComments}
                </AlertDescription>
              </Alert>
            )}
            {review.changesSummary && (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Summary
                </AlertTitle>
                <AlertDescription className="whitespace-pre-wrap text-sm">
                  {review.changesSummary}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {review.confidence && (
                <Badge
                  variant="outline"
                  className={cn('font-medium', CONFIDENCE_VARIANT[review.confidence].className)}
                >
                  {CONFIDENCE_VARIANT[review.confidence].label}
                </Badge>
              )}
              {review.regulatoryFlags.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">Regulatory flags:</span>
                  {review.regulatoryFlags.map((flag) => (
                    <Badge key={flag} variant="secondary">
                      {flag}
                    </Badge>
                  ))}
                </>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Run #{review.runCount}
              </span>
            </div>

            {!review.isPass3Accepted && (
              <div className="flex flex-wrap items-center gap-2">
                <LegalDocEditorToolbar editor={editor} />
                <LegalDocQuickInserts editor={editor} />
                <LegalDocUploadHandler
                  onContentUploaded={handleUpload}
                  hasExistingContent={!!review.unifiedDocHtml}
                  disabled={review.isSaving || review.isAccepting}
                />
              </div>
            )}

            <div className="flex flex-col gap-4 lg:flex-row">
              <Pass3SectionNavWrapper
                containerRef={editorContainerRef}
                contentKey={review.unifiedDocHtml.length}
                isAccepted={review.isPass3Accepted}
              />
              <div className="flex-1 min-w-0">
                <div className="legal-doc-page" ref={editorContainerRef}>
                  <div className="legal-doc">
                    <EditorContent editor={editor} />
                  </div>
                </div>
                {review.isPass3Accepted && (
                  <Pass3AttributionBadge
                    reviewerUserId={review.reviewerUserId}
                    reviewedAt={review.reviewedAt}
                  />
                )}
              </div>
            </div>

            {!review.isPass3Accepted && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => review.runPass3()} disabled={review.isRunning || review.isSaving || review.isAccepting} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Re-run Pass 3
                </Button>
                <Button variant="outline" onClick={() => review.saveEdits(editedHtml)} disabled={review.isSaving || review.isAccepting || !editedHtml} className="gap-2">
                  {review.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </Button>
                <Button onClick={() => review.acceptPass3()} disabled={review.isAccepting || review.isSaving} className="gap-2">
                  {review.isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Accept Legal Documents
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CuratorLegalReviewPanel;
