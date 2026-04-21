

# Plan — Word-style track changes (additions in red + deletions as strikethrough) for the Pass 3 editor

## What changes for the user

After running **Re-organize** then **Re-run AI Pass 3** (or vice-versa), the editor will show, side-by-side in place:

- **Added/enhanced clauses** — wrapped in red with a small `+ NEW` marker (current behaviour, refined).
- **Removed clauses** — re-inserted as a struck-through, muted block with a `− REMOVED` marker, anchored under the section heading they came from.

This makes the difference between the two operations unmissable: Organize typically produces few markers; Pass 3 produces many (new sections + regulatory clauses + rewrites).

## Files to change

### 1. `src/lib/cogniblend/legal/diffHighlight.ts` (rewrite — stays ≤ 250 lines)

- Add a second class constant: `DIFF_REMOVED_CLASS = 'legal-diff-removed'`.
- Introduce **`annotateDiff(prev, next)`**: block-level diff that
  - marks blocks present in `next` but not in `prev` with `legal-diff-added` (existing behaviour),
  - re-inserts blocks present in `prev` but not in `next` as a new element with class `legal-diff-removed`, anchored after the matching `<h2>` in `next` (or at the top as fallback).
- Helpers `findPrecedingH2` and `findH2ByText` for anchoring.
- Keep `annotateAdditions` exported as a thin alias to `annotateDiff` so no other call site breaks.
- Update **`stripDiffSpans`** to also remove every `.legal-diff-removed` element entirely (keeps deletions out of saved/persisted HTML).
- `htmlEqualsNormalized` keeps working — it normalises via `stripDiffSpans` already.

### 2. `src/styles/legal-document.css` (additions only)

Add the deletion styling and an accepted-state hide rule:

```css
.legal-doc .legal-diff-removed {
  color: hsl(var(--muted-foreground));
  background-color: hsl(var(--muted) / 0.3);
  border-left: 3px solid hsl(var(--muted-foreground));
  border-radius: 2px;
  padding: 2px 6px;
  margin: 8px 0 8px -6px;
  display: block;
  position: relative;
  opacity: 0.8;
  text-decoration: line-through;
  text-decoration-color: hsl(var(--destructive) / 0.5);
}
.legal-doc .legal-diff-removed::before {
  content: '− REMOVED';
  position: absolute; top: -1px; right: 6px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  color: hsl(var(--muted-foreground));
  font-family: system-ui, sans-serif;
  text-decoration: none;
}
.legal-doc.is-accepted .legal-diff-removed { display: none; }
```

The existing `.legal-diff-added` rule already handles additions; no changes needed there.

### 3. `src/hooks/cogniblend/useLcPass3DiffHighlight.ts` (one-line swap)

- Import `annotateDiff` instead of `annotateAdditions` and call it where the annotation is built. All other logic (arming, clearing, accepted-state handling) stays as-is.

### 4. `src/components/cogniblend/lc/Pass3EditorBody.tsx` (banner copy + legend)

Replace the current single-line diff banner with a two-key legend so both colours are explained:

- 🟥 small swatch — *Red = added or enhanced content*
- ⊟ small strikethrough swatch — *Strikethrough = removed from previous version*

The Clear button stays. Keeps the file ≤ 250 lines.

### 5. `src/components/cogniblend/lc/LcSourceDocUpload.tsx` (tooltips — already in scope from prior plan, finalise here)

- Tooltip on **Re-organize**: *"Cleans and merges clauses from your uploaded source documents into the unified agreement. No new wording. Status becomes 'organized'."*
- Tooltip on **Re-run AI Pass 3**: *"Full AI legal pass — drafts and rewrites the unified agreement using your sources, the challenge context, and the regulatory packs configured for this challenge. Can add and remove clauses. Status becomes 'AI-suggested'."*

## Persistence / safety guarantees

- Every save / accept path already calls `stripDiffSpans` before writing to `challenge_legal_docs.ai_modified_content_html` (`useLcPass3Mutations.ts` lines for `saveEdits` and `acceptPass3`). After this change, `stripDiffSpans` removes both additions (unwrap) and deletions (delete element), so **no diff markup ever reaches the database**.
- The `.is-accepted` CSS rule hides any residual `.legal-diff-removed` and neutralises `.legal-diff-added` once `ai_review_status='accepted'`, so an accepted contract renders clean.
- `clearHighlights` in `useLcPass3DiffHighlight` re-runs `stripDiffSpans` on the editor HTML, so the existing **Clear** button removes both markings together.

## Behaviour after fix

| Scenario | Editor shows |
|---|---|
| First Pass 3 (no prior version) | Plain document, no markings. |
| Organize → Pass 3 generates new section | Red `+ NEW` block under that section's `<h2>`. |
| Organize → Pass 3 rewrites a clause | New clause shown red; old clause shown immediately above as struck-through `− REMOVED`. |
| Pass 3 deletes a clause entirely | Old clause shown as struck-through `− REMOVED` under its original section. |
| User clicks **Clear** | All red and strikethrough markings vanish; editor content unchanged. |
| User clicks **Save Draft** | DB row contains zero `legal-diff-added` / `legal-diff-removed` strings. |
| User clicks **Accept Legal Documents** | Additions render plain; deletions hidden via `.is-accepted` rule. |

## Verification

1. Upload sources → click **Re-organize** → click **Re-run AI Pass 3** → editor shows red additions and struck-through removals; banner legend matches.
2. Click **Clear** → all markings gone; document content intact.
3. **Save Draft** → query `challenge_legal_docs.ai_modified_content_html` → no `legal-diff-*` strings.
4. **Accept Legal Documents** → reload page → no markings render; document is clean.
5. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Word-level (intra-clause) diff — block-level remains the legal-review unit.
- Edge function / DB migration — no server change required.
- Persisting per-run history viewer — `version_history` JSONB already records actor/action/timestamp; surfacing it is a separate feature.
- Mutex / spinner work — already shipped.

