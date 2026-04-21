/**
 * useLcPass3DiffHighlight — applies clause-level diff highlighting in the
 * Pass 3 editor when a Consolidate / Re-run produced changed content.
 *
 * Extracted from LcPass3ReviewPanel to keep that component ≤ 250 lines (R1).
 */
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { annotateDiff, stripDiffSpans } from '@/lib/cogniblend/legal/diffHighlight';

export interface UseLcPass3DiffHighlightArgs {
  editor: Editor | null;
  unifiedDocHtml: string;
  isPass3Accepted: boolean;
  setEditedHtml: (html: string) => void;
}

export function useLcPass3DiffHighlight({
  editor,
  unifiedDocHtml,
  isPass3Accepted,
  setEditedHtml,
}: UseLcPass3DiffHighlightArgs) {
  const pendingHighlightAgainst = useRef<string | null>(null);
  const [highlightActive, setHighlightActive] = useState(false);

  // Capture pre-regenerate HTML so the next content update can be diffed.
  const armRegenerate = (prevHtml: string, outcome: 'changed' | 'unchanged') => {
    pendingHighlightAgainst.current = outcome === 'changed' ? prevHtml : null;
  };

  useEffect(() => {
    if (!editor) return;
    if (!unifiedDocHtml) return;
    const cleanIncoming = stripDiffSpans(unifiedDocHtml);
    const prev = pendingHighlightAgainst.current;

    // Only short-circuit when there's no pending diff to render. When a
    // regenerate has been armed we always render — even on byte-equal HTML —
    // so reordered/identical-text-different-position changes still annotate.
    if (!prev && cleanIncoming === editor.getHTML()) return;

    if (prev) {
      const annotated = annotateDiff(stripDiffSpans(prev), cleanIncoming);
      editor.commands.setContent(annotated, { emitUpdate: false });
      setEditedHtml(cleanIncoming);
      setHighlightActive(annotated !== cleanIncoming);
      pendingHighlightAgainst.current = null;
    } else {
      editor.commands.setContent(cleanIncoming, { emitUpdate: false });
      setEditedHtml(cleanIncoming);
      setHighlightActive(false);
    }
  }, [editor, unifiedDocHtml, setEditedHtml]);

  useEffect(() => {
    if (isPass3Accepted && highlightActive) setHighlightActive(false);
  }, [isPass3Accepted, highlightActive]);

  const clearHighlights = () => {
    if (!editor) return;
    const clean = stripDiffSpans(editor.getHTML());
    editor.commands.setContent(clean, { emitUpdate: false });
    setEditedHtml(clean);
    setHighlightActive(false);
  };

  return { highlightActive, clearHighlights, armRegenerate };
}
