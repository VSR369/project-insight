

# Plan — Close the gaps from Final Consolidation sprint

## Status against the approved plan

| Part | Status |
|---|---|
| A · DB migration + CHECK includes `'organized'` | ✅ Verified in DB |
| B · Edge fn `organize_only` flow, prompt, status | ✅ All 7 sub-points present |
| C · `useLcPass3Review` adds `organizeOnly` + `pass3Status` | ✅ Wired (but file is **337 lines** — R1 violation) |
| D · `useOrganizeAndMerge` rename | ✅ With deprecated alias |
| E · `LcSourceDocUpload` upload+list only | ✅ 202 lines |
| F · `LcLegalWorkspacePage` 3-step + two buttons | ⚠️ Step indicator present; **page is 273 lines** — R1 violation. `LcUnifiedAgreementCard` not extracted |
| G · `LegalDocUploadHandler` deleted | ✅ Gone |
| H · `CuratorComplianceTab` mirrors LC | ⚠️ Mounts `LcSourceDocUpload` but the **two action buttons are NOT yet added** above the embedded panel |
| I · `LcAttachedDocsCard` badge for `organized→accepted` | ✅ Keys off `UNIFIED_SPA` only |
| J · `useLcLegalData` filter | ✅ No change needed |
| K · Orphan deletion | ✅ |
| L · Memory update | ✅ Updated last sprint |

**Three real gaps remain — all R1 (file size) and one missing UI mirror in Curator tab.**

## Fixes

### 1 · Decompose `useLcPass3Review.ts` (337 → ≤ 250)
Extract the two heavy mutations into a sibling hook and re-export from the main hook so all consumers keep working unchanged.

- New `src/hooks/cogniblend/useLcPass3Mutations.ts` (~160 lines): `runPass3`, `organizePass3`, `acceptPass3`, `saveEdits` mutations + their toast/invalidation logic.
- Trim `useLcPass3Review.ts` to: query + derived selectors (`pass3Status`, `isStale`, `unifiedDocHtml`, `runCount`, `reviewerUserId`, `reviewedAt`, `changesSummary`, `confidence`, `regulatoryFlags`) + thin re-export of mutation handles. Target ≤ 180 lines. Public API unchanged.

### 2 · Decompose `LcLegalWorkspacePage.tsx` (273 → ≤ 250)
Per the original plan's contingency: extract the Step 2 editor block.

- New `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx` (~150 lines): owns the editor card header (title by status, Run #N badge, summary alert, confidence chips, status strip, `Pass3EditorBody` mount, action footer). Receives `review` (return shape of `useLcPass3Review`) + `editor` as props.
- Page becomes pure composition: header → step indicator → challenge details collapse → Step 1 (`LcSourceDocUpload` + 2 buttons) → `LcUnifiedAgreementCard` → Step 3 alert → `LcLegalSubmitFooter`. Target ≤ 200 lines.

### 3 · Decompose `LcPass3ReviewPanel.tsx` (275 → ≤ 250)
Extract its header (title, run badge, AI summary, confidence/regulatory chips) into `Pass3ReviewHeader.tsx` (~90 lines). Panel keeps mutation orchestration + body composition. Target ≤ 200 lines.

### 4 · Mirror two-button decision point in `CuratorComplianceTab.tsx`
Currently the tab mounts `LcSourceDocUpload sourceOrigin="curator"` but relies on whatever buttons live inside `LcPass3ReviewPanel`. Add an explicit decision-point block immediately under the upload card (mirrors LC page exactly):

```tsx
<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
  <p className="text-sm font-medium">
    {n > 0 ? `${n} document(s) ready to process` : 'No documents — AI will draft from challenge context'}
  </p>
  <div className="flex flex-wrap gap-2">
    <Button onClick={review.runPass3} disabled={busy}>
      <Sparkles/> Run AI Pass 3 (Merge + Enhance)
    </Button>
    {n > 0 && (
      <Button variant="outline" onClick={review.organizeOnly} disabled={busy}>
        <FileText/> Organize & Merge (No AI)
      </Button>
    )}
  </div>
</div>
```

Wire to the existing `useLcPass3Review(challengeId)` already in scope. Helper text stays the same wording as the LC page for consistency.

### 5 · Drop the deprecated `useArrangeIntoSections` alias and legacy `arrange_only` in edge fn
Plan said "drop the `'arranged_only'` literal entirely" and "rename throughout". Currently:
- `index.ts` still accepts `arrange_only` as a fallback (lines 50-52).
- `useSourceDocs.ts` still exports `useArrangeIntoSections = useOrganizeAndMerge`.

Both are dead — no callers remain (verified by grep at handoff). Delete the `arrange_only` fallback in `index.ts` (keep only `organize_only`) and remove the deprecated alias export. Update the leading comment block in `index.ts` (still references `arrange_only`).

## Files touched

| File | Action | Δ |
|---|---|---|
| `src/hooks/cogniblend/useLcPass3Mutations.ts` | new | +160 |
| `src/hooks/cogniblend/useLcPass3Review.ts` | trim | −150 |
| `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx` | new | +150 |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | trim | −90 |
| `src/components/cogniblend/lc/Pass3ReviewHeader.tsx` | new | +90 |
| `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | trim | −85 |
| `src/components/cogniblend/curation/CuratorComplianceTab.tsx` | edit | +30 (button row) |
| `src/hooks/queries/useSourceDocs.ts` | edit | −5 (drop alias) |
| `supabase/functions/suggest-legal-documents/index.ts` | edit | −10 (drop fallback + comment) |

**Net:** ~+90 lines, every file ≤ 250 (R1 satisfied), one canonical `organize_only` flag, one canonical `'organized'` status, identical two-button UX in both LC and Curator entry points.

## Verification

1. `wc -l` on every changed file ≤ 250.
2. `grep -rn "arrange_only\|useArrangeIntoSections\|arranged_only"` returns zero hits across `src/` and `supabase/functions/`.
3. LC page (`/cogni/challenges/:id/lc-legal`) — both buttons render, both fire correct edge-function payloads, status strip + step indicator unchanged.
4. STRUCTURED Curator Legal tab — same two buttons appear above the unified-agreement card, click "Organize & Merge" persists `ai_review_status='organized'`.
5. CONTROLLED Curator post-Phase-2 (`CurationReviewPage`) — read-only banner unchanged.
6. QUICK governance — page short-circuit unchanged.
7. TS build passes (`npx tsc --noEmit`).

## Out of scope
- Pass 1 / Pass 2 logic
- DB schema changes
- Any new public API on `useLcPass3Review`

