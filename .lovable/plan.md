

# Plan — "No-change" toast + red diff highlighting for regenerated content

## Why the editor sometimes appears unchanged

The Consolidate / Re-run pipeline always regenerates and overwrites the `UNIFIED_SPA` row, but the **rendered HTML can be byte-for-byte (or near-identical) to what was already there** — especially when:
- The same source docs are fed in twice with no edits.
- Organize-only mode produces deterministic output (temperature 0.1).
- AI returns the same merged structure.

Today the UI silently swaps the same content back in — the user sees no visible change and assumes the action did nothing. We need to (a) detect "no meaningful change" and (b) make real changes visible.

## Two behaviours to add

### 1. Detect "no meaningful change" → toast instead of silent swap

After Consolidate / Re-run / Enhance returns, compare the new `unifiedDocHtml` against the previous one (snapshot taken **before** the mutation):

- Normalize both (strip whitespace runs, collapse `\n`, ignore attribute order on safe tags).
- If the normalized strings are equal:
  - Show toast: *"No changes — the regenerated document is identical to the current draft."*
  - Suppress the success toast ("Source documents organized & merged" / "Legal AI review completed") to avoid mixed signalling.
  - Editor content is left untouched.
- Else: proceed normally and trigger the red-diff highlight (below).

Implementation site: `useLcPass3Mutations.ts` already runs `onSuccess`. We capture `prevHtml` from `getCurrentDoc()` (extend the snapshot to expose `unifiedDocHtml`) before invoking the edge function, then compare against the freshly-fetched row inside `onSuccess`.

### 2. Red diff highlighting for changed content

Visually mark every clause that differs between `prevHtml` (pre-regenerate) and the new `unifiedDocHtml`.

**Approach (pragmatic, no heavy diff library):**

- Add a small utility `src/lib/cogniblend/legal/diffHighlight.ts` that:
  - Parses both HTML strings via `DOMParser`.
  - Walks block-level nodes (`p`, `li`, `h2`, `h3`, `h4`, `blockquote`, `td`) in document order.
  - For each new block, computes a normalized text fingerprint (lowercased, whitespace-collapsed).
  - If a block's fingerprint did NOT exist in the previous doc's fingerprint set, wrap its inner HTML with `<span class="legal-diff-added">…</span>`.
  - Returns the annotated HTML.
- This is content-level, not character-level — fits the legal-doc context where users care about clause-level changes, not punctuation churn.

**Where to apply:**

- `LcPass3ReviewPanel.tsx`: store a `pendingHighlightAgainst: string | null` ref that's set to the pre-regenerate HTML when a Consolidate/Re-run mutation starts.
- When `review.unifiedDocHtml` updates after the mutation:
  - If `pendingHighlightAgainst` is set and new HTML ≠ old HTML, run `annotateAdditions(prevHtml, newHtml)` and call `editor.commands.setContent(annotated, { emitUpdate: false })`.
  - Persist the **un-annotated** HTML to state for `editedHtml` so saves/accepts never store the `<span class="legal-diff-added">` markup.
  - Clear `pendingHighlightAgainst`.
- A subtle "Showing changes from previous version" pill renders in `Pass3ReviewHeader` while highlights are active, with a `Clear highlights` button.

**CSS** in `src/styles/legal-document.css`:

```css
.legal-doc .legal-diff-added {
  color: hsl(var(--destructive));
  background-color: hsl(var(--destructive) / 0.06);
  border-radius: 2px;
  padding: 0 2px;
}
.legal-doc.is-accepted .legal-diff-added {
  color: inherit;
  background-color: transparent;
  padding: 0;
}
```

The `is-accepted` class is added to the `.legal-doc` wrapper in `Pass3EditorBody` whenever `isPass3Accepted` is true — this guarantees red turns to black on Accept without touching the underlying HTML.

### 3. Stripping highlights on Save / Accept (data integrity)

Even though we never put the spans into editor state we control, a defensive `stripDiffSpans(html)` step runs inside `saveEdits` and `acceptPass3` mutationFns to scrub any `legal-diff-added` span from the HTML before it hits Postgres. The DB always stores clean, signable content.

### 4. Highlights survive only the current session

Highlights are session-only (in-memory). On page reload, the editor loads `unifiedDocHtml` clean (no spans, no comparison). This avoids stale cross-version diffs and keeps the DB pristine.

## Files touched

1. **`src/lib/cogniblend/legal/diffHighlight.ts`** — new (~80 lines). `annotateAdditions(prev, next)` + `stripDiffSpans(html)` + `htmlEqualsNormalized(a, b)`.
2. **`src/styles/legal-document.css`** — add the two `.legal-diff-added` rules and the `is-accepted` override.
3. **`src/hooks/cogniblend/useLcPass3Mutations.ts`** — capture `prevHtml` before mutation; in `onSuccess` re-read the new HTML, compare via `htmlEqualsNormalized`, suppress success toast and emit info toast on no-change. Strip diff spans in `saveEdits` + `acceptPass3` payloads.
4. **`src/hooks/cogniblend/useLcPass3Review.ts`** — extend `getCurrentDoc()` snapshot with current `unifiedDocHtml`; expose a `lastRegenerateOutcome: 'changed' | 'unchanged' | null` flag (small addition, stays under 250 lines).
5. **`src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`** — track `pendingHighlightAgainst`, run `annotateAdditions` on next-content arrival, drive `is-accepted` class via prop to `Pass3EditorBody`. Stay ≤ 250 lines (pull the highlight effect into `useLcPass3DiffHighlight.ts` if needed).
6. **`src/components/cogniblend/lc/Pass3EditorBody.tsx`** — accept `isAccepted` prop already present; add `is-accepted` class on the `.legal-doc` wrapper. Add a small "Showing changes" pill + Clear button slot.
7. **`src/components/cogniblend/lc/Pass3ReviewHeader.tsx`** — optional: surface the "Showing changes from previous version" pill (delegated from parent via prop), with a small `X` to clear.

No DB migration. No edge function change. No new dependency. All files remain ≤ 250 lines (R1).

## Behaviour matrix after this change

| Action | Resulting content differs? | Toast | Editor visual |
|---|---|---|---|
| Consolidate (first time, idle) | n/a (no prior) | "Source documents organized & merged" | Plain |
| Consolidate again, identical output | No | **"No changes — the regenerated document is identical to the current draft."** | Unchanged |
| Consolidate again, content differs | Yes | "Source documents organized & merged" | New content; **changed clauses in red** |
| Re-run Pass 3, content differs | Yes | "Legal AI review completed" | New content; **changed clauses in red** |
| Re-run Pass 3, identical output | No | **"No changes…"** info toast | Unchanged |
| LC edits a clause, autosaves | n/a | "Legal document saved" | Edits as plain text (no red — edits aren't AI changes) |
| LC clicks Accept | n/a | "Legal documents approved" | **All red turns to black** via `.is-accepted` class |
| Page reload after Accept | n/a | — | Plain black (DB has no span markup) |

## Verification

1. Fresh challenge, upload two docs, click Consolidate → draft appears, no red highlights (first generation).
2. Click Consolidate again with no upload changes → info toast *"No changes…"*; success toast does NOT appear; editor content unchanged.
3. Upload a third doc, click Consolidate → success toast; new clauses pulled from the third doc render in red; existing clauses remain black.
4. Edit a red clause manually → red span removed by editor on input; autosave persists clean HTML.
5. Click Re-run Pass 3 with substantive change → success toast; AI-rewritten clauses render in red.
6. Click Accept → all red text turns black instantly; DB row contains zero `legal-diff-added` spans (verified via Supabase read).
7. Reload page → editor shows clean black content.
8. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Character-level diff (would require `diff-match-patch` and add weight for marginal gain).
- Showing deletions inline (red strikethrough of removed clauses) — adds clutter for the legal-review use case; can be added later if requested.
- Persisting highlights across reloads or across users.
- Changing the regenerate-from-SOURCE_DOC architecture.

