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

/** Run a setContent while preserving the page scroll position. */
function setContentPreservingScroll(editor: Editor, html: string) {
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  editor.commands.setContent(html, { emitUpdate: false });
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
  }
}

export function useLcPass3DiffHighlight({
  editor,
  unifiedDocHtml,
  isPass3Accepted,
  setEditedHtml,
}: UseLcPass3DiffHighlightArgs) {
  const pendingHighlightAgainst = useRef<string | null>(null);
  const lastAppliedHtmlRef = useRef<string | null>(null);
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

    // Skip back-to-back identical refetches (autosave settle, focus events).
    if (!prev && cleanIncoming === lastAppliedHtmlRef.current) return;

    // Compare against the editor's *cleaned* current HTML so leftover diff
    // markers don't cause a false-positive rebuild.
    const cleanCurrent = stripDiffSpans(editor.getHTML());
    if (cleanIncoming === cleanCurrent) {
      // Local edits already converged with server — no rebuild needed.
      lastAppliedHtmlRef.current = cleanIncoming;
      pendingHighlightAgainst.current = null;
      return;
    }

    if (prev) {
      const annotated = annotateDiff(stripDiffSpans(prev), cleanIncoming);
      setContentPreservingScroll(editor, annotated);
      setEditedHtml(cleanIncoming);
      setHighlightActive(annotated !== cleanIncoming);
      pendingHighlightAgainst.current = null;
      lastAppliedHtmlRef.current = cleanIncoming;
    } else {
      setContentPreservingScroll(editor, cleanIncoming);
      setEditedHtml(cleanIncoming);
      setHighlightActive(false);
      lastAppliedHtmlRef.current = cleanIncoming;
    }
  }, [editor, unifiedDocHtml, setEditedHtml]);

  useEffect(() => {
    if (isPass3Accepted && highlightActive) setHighlightActive(false);
  }, [isPass3Accepted, highlightActive]);

  const clearHighlights = () => {
    if (!editor) return;
    const clean = stripDiffSpans(editor.getHTML());
    setContentPreservingScroll(editor, clean);
    setEditedHtml(clean);
    setHighlightActive(false);
    lastAppliedHtmlRef.current = clean;
  };

  return { highlightActive, clearHighlights, armRegenerate };
}
