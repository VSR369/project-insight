/**
 * LcPass3ReviewPanel — Pass 3 (Legal AI Review) UI for the Legal Coordinator.
 * Mirrors CuratorLegalReviewPanel; uses useLcPass3Review for data access.
 */
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { CheckCircle2, Loader2, RefreshCw, Save, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLcPass3Review, type Pass3Confidence } from '@/hooks/cogniblend/useLcPass3Review';
import { LegalDocEditorToolbar } from '@/components/cogniblend/legal/LegalDocEditorToolbar';
import { LegalDocQuickInserts } from '@/components/cogniblend/legal/LegalDocQuickInserts';
import { Pass3StaleAlert } from '@/components/cogniblend/creator/Pass3StaleAlert';
import { Pass3SectionNavWrapper } from '@/components/cogniblend/legal/Pass3SectionNavWrapper';
import { Pass3AttributionBadge } from '@/components/cogniblend/legal/Pass3AttributionBadge';
import { Pass3StatusStrip, type Pass3StatusKind } from '@/components/cogniblend/lc/Pass3StatusStrip';
import { cn } from '@/lib/utils';
import '@/styles/legal-document.css';

export interface LcPass3ReviewPanelProps {
  challengeId: string;
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

export function LcPass3ReviewPanel({ challengeId }: LcPass3ReviewPanelProps) {
  const review = useLcPass3Review(challengeId);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const protectedNormalized = review.protectedHeadings.map((h) => h.trim().toLowerCase());

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
      editable: !review.isPass3Accepted,
      onUpdate: ({ editor: e }) => setEditedHtml(e.getHTML()),
    },
    [protectedNormalized.join('|')],
  );

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

  useEffect(() => {
    if (!editor) return;
    if (review.unifiedDocHtml && review.unifiedDocHtml !== editor.getHTML()) {
      editor.commands.setContent(review.unifiedDocHtml, { emitUpdate: false });
      setEditedHtml(review.unifiedDocHtml);
    }
  }, [editor, review.unifiedDocHtml]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!review.isPass3Accepted);
  }, [editor, review.isPass3Accepted]);

  const handleUpload = (html: string) => {
    if (!editor) return;
    editor.commands.setContent(html, { emitUpdate: true });
    setEditedHtml(html);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Pass 3 — AI Legal Review
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
        {review.isLoading && <Skeleton className="h-40 w-full" />}

        {!review.isLoading && review.pass3Status === 'idle' && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Generate the unified Solution Provider Agreement. Choose
              <strong> Run AI Pass 3 </strong> to merge uploaded source documents
              and have the AI fill any gaps with grounded content, OR choose
              <strong> Organize &amp; Merge </strong> to deduplicate and
              harmonise uploaded source clauses without any new AI-generated
              content (empty sections show a placeholder).
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                onClick={review.runPass3}
                disabled={review.isRunning || review.isOrganizing}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Run AI Pass 3 (Merge + Enhance)
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={review.organizeOnly}
                disabled={review.isRunning || review.isOrganizing}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Organize &amp; Merge (No AI Enhancement)
              </Button>
            </div>
          </div>
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
            {review.isStale && (
              <Pass3StaleAlert description="Creator made edits. Click 'Re-run Pass 3' to update legal documents." />
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
                <Button
                  variant="outline"
                  onClick={() => review.runPass3()}
                  disabled={review.isRunning || review.isSaving || review.isAccepting}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-run Pass 3
                </Button>
                <Button
                  variant="outline"
                  onClick={() => review.saveEdits(editedHtml)}
                  disabled={review.isSaving || review.isAccepting || !editedHtml}
                  className="gap-2"
                >
                  {review.isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Draft
                </Button>
                <Button
                  onClick={() => review.acceptPass3()}
                  disabled={review.isAccepting || review.isSaving}
                  className="gap-2"
                >
                  {review.isAccepting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
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

export default LcPass3ReviewPanel;
