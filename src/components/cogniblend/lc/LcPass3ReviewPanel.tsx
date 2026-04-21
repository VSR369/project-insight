/**
 * LcPass3ReviewPanel — Pass 3 (Legal AI Review) UI for the Legal Coordinator.
 * Mirrors CuratorLegalReviewPanel; uses useLcPass3Review for data access.
 *
 * Header chips/summary live in Pass3ReviewHeader; editor + nav in
 * Pass3EditorBody. This panel orchestrates state + composition only.
 */
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Loader2, RefreshCw, Shield, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLcPass3Review } from '@/hooks/cogniblend/useLcPass3Review';
import { type Pass3StatusKind } from '@/components/cogniblend/lc/Pass3StatusStrip';
import { Pass3EditorBody } from '@/components/cogniblend/lc/Pass3EditorBody';
import { Pass3ReviewHeader } from '@/components/cogniblend/lc/Pass3ReviewHeader';
import { annotateAdditions, stripDiffSpans } from '@/lib/cogniblend/legal/diffHighlight';
import '@/styles/legal-document.css';

export interface LcPass3ReviewPanelProps {
  challengeId: string;
}

function buildHeadingGuard(protectedHeadings: string[]) {
  const normalized = protectedHeadings.map((h) => h.trim().toLowerCase()).filter(Boolean);
  return Extension.create({
    name: 'protectedHeadingGuard',
    addOptions() {
      return { protectedHeadings: normalized };
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectProtectedHeadings(doc: any, protectedNormalized: string[]): Set<string> {
  const found = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const pendingHighlightAgainst = useRef<string | null>(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const review = useLcPass3Review(challengeId, {
    onRegenerateComplete: (prevHtml, outcome) => {
      if (outcome === 'changed') {
        pendingHighlightAgainst.current = prevHtml;
      } else {
        pendingHighlightAgainst.current = null;
      }
    },
  });
  const [editedHtml, setEditedHtml] = useState<string>('');
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
    const incoming = review.unifiedDocHtml;
    if (!incoming) return;
    // Strip any incoming spans first so we never re-stack diff highlights
    // when the row is reloaded.
    const cleanIncoming = stripDiffSpans(incoming);
    if (cleanIncoming === editor.getHTML()) return;

    const prev = pendingHighlightAgainst.current;
    if (prev) {
      const annotated = annotateAdditions(stripDiffSpans(prev), cleanIncoming);
      editor.commands.setContent(annotated, { emitUpdate: false });
      setEditedHtml(cleanIncoming); // store CLEAN html for save/accept
      setHighlightActive(annotated !== cleanIncoming);
      pendingHighlightAgainst.current = null;
    } else {
      editor.commands.setContent(cleanIncoming, { emitUpdate: false });
      setEditedHtml(cleanIncoming);
      setHighlightActive(false);
    }
  }, [editor, review.unifiedDocHtml]);

  // When LC accepts, clear the highlighted state visually (CSS handles colour
  // override too, but clearing the flag hides the "Showing changes" pill).
  useEffect(() => {
    if (review.isPass3Accepted && highlightActive) setHighlightActive(false);
  }, [review.isPass3Accepted, highlightActive]);

  const clearHighlights = () => {
    if (!editor) return;
    const clean = stripDiffSpans(editor.getHTML());
    editor.commands.setContent(clean, { emitUpdate: false });
    setEditedHtml(clean);
    setHighlightActive(false);
  };

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!review.isPass3Accepted);
  }, [editor, review.isPass3Accepted]);

  const showBody =
    (review.pass3Status === 'completed' ||
      review.pass3Status === 'organized' ||
      review.pass3Status === 'accepted') &&
    !review.isRunning;

  const headerStatus: Pass3StatusKind =
    review.pass3Status === 'accepted'
      ? 'accepted'
      : review.pass3Status === 'organized'
        ? 'organized'
        : 'ai_suggested';

  const isDirty =
    !review.isPass3Accepted &&
    editedHtml.trim().length > 0 &&
    editedHtml !== review.unifiedDocHtml;

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

        {!review.isLoading && review.pass3Status === 'idle' && !review.isRunning && (
          <p className="text-xs text-muted-foreground italic">
            Use the action buttons in the Source Legal Documents card above to
            generate the unified agreement.
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

        {showBody && (
          <>
            <Pass3ReviewHeader
              status={headerStatus}
              runCount={review.runCount}
              reviewedAt={review.reviewedAt}
              isStale={review.isStale && !review.isPass3Accepted}
              isBusy={review.isRunning || review.isOrganizing || review.isPass3Accepted}
              isDirty={isDirty}
              changesSummary={review.changesSummary}
              confidence={review.confidence}
              regulatoryFlags={review.regulatoryFlags}
              onRerunAi={() => review.runPass3()}
              onReorganize={() => review.organizeOnly()}
            />

            <Pass3EditorBody
              editor={editor}
              unifiedDocHtml={review.unifiedDocHtml}
              isPass3Accepted={review.isPass3Accepted}
              reviewerUserId={review.reviewerUserId}
              reviewedAt={review.reviewedAt}
              editedHtml={editedHtml}
              isRunning={review.isRunning}
              isSaving={review.isSaving}
              isAccepting={review.isAccepting}
              isDirty={isDirty}
              onRerun={() => review.runPass3()}
              onSave={() => review.saveEdits(editedHtml)}
              onAccept={() => review.acceptPass3()}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LcPass3ReviewPanel;
