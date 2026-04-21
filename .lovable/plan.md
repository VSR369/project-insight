

# Plan — Legal Workflow Final Consolidation

## Why this revision

The previous sprint built the unified workflow (SOURCE_DOC + UNIFIED_SPA) but left behind 4 UX issues: duplicated upload buttons, opaque "AI re-ran without my consent" status, an `arrange_only` mode that still uses AI tokens (not what users asked for), and toolbar/page split confusion. This plan fixes all four with **no new DB columns** and **no rewrite of working pieces**.

## Safety contract (unchanged)
- AI Pass 1 / Pass 2 / Zustand curation store
- `complete_phase`, `complete_legal_review`, `complete_financial_review`, `seed_default_legal_docs` RPCs
- `LegalDocEditorPanel`, `LegalDocSectionNav`, `LcPass3ReviewPanel`, `useLcPass3Review`, `useChallengeForLC`
- `challenges` table (only reuses existing `pass3_stale`)
- QUICK governance — auto-accept untouched
- CONTROLLED Curator post-Phase-2 read-only view (already shipped)

---

## Part A — Database (single migration, additive)

**A1.** Expand `ai_review_status` CHECK to allow `'organized'` (the no-AI mode emits this). The previous migration used `'arranged_only'` informally — formalize with a CHECK update so we get DB-level safety.

```sql
ALTER TABLE public.challenge_legal_docs
  DROP CONSTRAINT IF EXISTS challenge_legal_docs_ai_review_status_check;
ALTER TABLE public.challenge_legal_docs
  ADD CONSTRAINT challenge_legal_docs_ai_review_status_check
  CHECK (ai_review_status IN ('pending','ai_suggested','accepted','rejected','stale','organized'));
```
*(No `'arranged_only'` value — we standardise on `'organized'`. Backfill any pre-existing `'arranged_only'` rows to `'organized'` in the same migration.)*

**A2.** No other DB changes. `source_origin` column, `fn_mark_pass3_stale()` trigger, dev cleanup, and `seed_default_legal_docs` RPC update all shipped in the prior sprint — verified present.

## Part B — Edge function `suggest-legal-documents`

**B1. `index.ts`** — accept `organize_only: boolean` in the request body, forward to handler. Already returns 400 `DEPRECATED` for `pass3_mode !== true` — keep.

**B2. `pass3Handler.ts`** — replace the existing `arrangeOnly` parameter and behaviour (currently only changes the system prompt) with full `organizeOnly` semantics:

1. Rename `arrangeOnly` → `organizeOnly` throughout (also rename the param sent from `index.ts`).
2. **Source query**: already broadened to `.neq('document_type','UNIFIED_SPA')` and selects `source_origin` — confirmed present, no change.
3. **Truncation**: already lifted to 60_000 / 180_000 chars — confirmed, no change.
4. **System prompt** for `organizeOnly === true` — replace the current "verbatim-slotting" wording with the **deduplicate + harmonise** wording (10 mandatory rules: read every clause, slot to best-fit `section_key`, MERGE overlapping clauses from multiple sources into ONE coherent version, harmonise wording across sections, never duplicate, never invent sections, empty sections show placeholder text, no new substantive content, output reads as one seamless agreement).
5. **System prompt** for `organizeOnly === false` — keep the existing strict slotting rules but ADD the merge directive: prefer source content where it overlaps with AI content, harmonise language, zero gaps.
6. **Persistence**: `ai_review_status = organizeOnly ? 'organized' : 'ai_suggested'`. Drop the `'arranged_only'` literal entirely.
7. **AI call params**: when `organizeOnly`, set `temperature: 0.1` and `max_tokens: 12288`.
8. **User prompt**: switch the source-doc block from JSON dump to a labelled list (`### {document_name} (uploaded by: {source_origin})\n{content_html}`) separated by `---` for AI clarity.

## Part C — `useLcPass3Review` hook

Add `organizeOnly` mutation that invokes the edge function with `{ pass3_mode: true, organize_only: true }`. On success: invalidate `['pass3-legal-review', challengeId]` and clear `pass3_stale`. Returns `{ organizeOnly: mutate, isOrganizing: isPending }`. Add a derived `pass3Status: 'idle' | 'completed' | 'organized' | 'accepted'` computed from the cached `UNIFIED_SPA.ai_review_status`.

Verify `useLcPass3Review` stays under 250 lines after the addition (currently well under — confirmed).

## Part D — `useSourceDocs` hook (already exists)

`useArrangeIntoSections` exists but is named after the old verbatim concept. Rename to `useOrganizeAndMerge` and route through the new `organizeOnly` mutation in `useLcPass3Review` for a single source of truth (avoids the hook duplicating edge-function logic). Keep existing `useSourceDocs`, `useUploadSourceDoc`, `useDeleteSourceDoc` exports as-is.

## Part E — `LcSourceDocUpload.tsx` (already exists)

Trim to **upload + list only** — remove any embedded action button. The two action buttons live one level up in the page so users see them next to the live count. Keep file picker, list with origin badge, remove button (only for rows where `source_origin` matches the current role's). Add a small "from Creator" / "from Curator" sub-list when those origins are present so LC sees inherited material clearly. Component stays under 200 lines.

## Part F — `LcLegalWorkspacePage.tsx` rewrite

Restructure into three explicit visual steps with a top step-indicator (`1. Upload → 2. Review & Edit → 3. Approved`). Step is derived from `pass3Status`/`isPass3Accepted` in `useLcPass3Review`.

**Step 1 card** — `LcSourceDocUpload sourceOrigin="lc"`, then a **count summary line**, then **two action buttons side-by-side**:
- `⚡ Run AI Pass 3 (Merge + Enhance)` → `review.runPass3()`
- `📄 Organize & Merge (No AI Enhancement)` → `review.organizeOnly()` (only shown when ≥1 source doc)

Helper text under each explains the trade-off in plain language.

**Step 2 card** — only renders once `pass3Status !== 'idle'`. Header shows: title ("Organized Agreement" vs "AI-Generated Agreement" by status), `Run #N` badge, Pass 3 summary, confidence/regulatory chips, and a status strip:
- `ai_suggested` → green dot + "Drafted by Pass 3 AI · Run #N · {date}"
- `organized` → blue dot + "Organized & Merged from {n} source docs · {date}"
- `pass3_stale` → amber alert with `Re-run Pass 3` and `Re-organize` buttons

Editor renders only here. `LegalDocSectionNav` (left, hidden on `<lg`) + `LegalDocEditorToolbar` + `EditorContent`. Editor is editable when `pass3Status !== 'accepted'`.

**Step 3 card** — green confirmation alert with approval date once accepted.

**Footer** — `LcReturnToCurator`, `LcApproveAction` (Approve disabled until accepted).

Delete remaining legacy state/imports (`generating`, `generateError`, `openCards`, `docEdits`, `showAddForm`, `newDoc*`, `handleGenerate`, `acceptDocMutation`, `dismissSuggestionMutation`, `handleSaveContent`, `handleAddNewDoc`, etc. — most are already gone from the prior sprint; do a final pass).

Page must stay **≤ 250 lines** (per workspace rule R1). If close, extract two presentational subcomponents:
- `LcLegalStepIndicator.tsx` (~40 lines)
- `LcUnifiedAgreementCard.tsx` (~150 lines, wraps Step 2 editor block)

## Part G — `LegalDocEditorToolbar.tsx`

Already contains formatting buttons only — confirmed no Upload Document button present. **No code change** beyond verifying the orphaned `LegalDocUploadHandler` (`src/components/cogniblend/legal/LegalDocUploadHandler.tsx`) is still present and unused. Delete it as cleanup so it cannot be re-imported by mistake.

## Part H — `CuratorComplianceTab.tsx` (STRUCTURED Curator)

Mirror the LC page changes inside the Legal tab:
- Already mounts `LcSourceDocUpload sourceOrigin="curator"` — confirmed.
- Add the same two action buttons (`Run AI Pass 3` / `Organize & Merge`) above the embedded `LcPass3ReviewPanel`.
- Keep `seed_default_legal_docs` auto-seed effect (platform templates flow into AI as `platform_template` source_origin).

## Part I — `LcAttachedDocsCard.tsx`

Already shows source-vs-final badges. Only tweak: ensure rows with `ai_review_status='organized'` get the same green "Final Agreement" badge once accepted (i.e., badge keys off `document_type='UNIFIED_SPA' && ai_review_status='accepted'`, regardless of which mode produced it).

## Part J — `useLcLegalData.ts`

Already filters `.in('document_type', ['SOURCE_DOC','UNIFIED_SPA'])` and exposes `source_origin`/`ai_review_status`. **No change.**

## Part K — File deletions

- `src/components/cogniblend/legal/LegalDocUploadHandler.tsx` (orphan, 167 lines).

All other legacy files (`LcAiSuggestionsSection`, `LcAddDocumentForm`, `AssembledCpaSection`, `CuratorCpaReviewPanel`, `useCuratorCpaActions`, `LegalDocUploadSection`) were already removed in the prior sprint — verified. No deletion needed.

## Part L — Verification

1. `psql` probe: insert `SOURCE_DOC` row → `challenges.pass3_stale=true`.
2. LC flow with **0 source docs** → only "Run AI Pass 3" button visible → click → unified SPA generated → editor populated → Accept → Step 3 alert + green badge in Attached Docs.
3. LC flow with **2 source docs from Creator** → both buttons visible → click "Organize & Merge" → status strip blue, no token-spend on enhancement, all 11 sections present (empty sections show placeholder), `ai_review_status='organized'`.
4. Same flow → click "Run AI Pass 3" instead → status strip green, AI fills empty sections, source content preserved verbatim where it overlaps.
5. Upload another source doc post-acceptance gates → cannot (Step 3 disables upload).
6. Re-upload after a build → amber stale strip → click "Re-organize" → completes without spending generation tokens.
7. STRUCTURED Curator flow through `CuratorComplianceTab` — identical buttons, identical outcomes.
8. CONTROLLED Curator post-Phase-2 in `CurationReviewPage` — read-only banner, locked editor (already shipped).
9. QUICK governance — page short-circuits, Pass 3 untouched.
10. Update memory `mem://cogniblend/legal/architecture-v2-framework` to reflect the `'organized'` status name and the two-button decision point.

## Files touched

| File | Action | Δ |
|---|---|---|
| `supabase/migrations/<new>.sql` | new | +25 |
| `supabase/functions/suggest-legal-documents/index.ts` | edit | +5 (forward `organize_only`) |
| `supabase/functions/suggest-legal-documents/pass3Handler.ts` | edit | +50 / −20 (rename + merge prompt + status) |
| `src/hooks/cogniblend/useLcPass3Review.ts` | edit | +30 (organizeOnly + pass3Status) |
| `src/hooks/queries/useSourceDocs.ts` | edit | +5 / −15 (rename, route through hook above) |
| `src/components/cogniblend/lc/LcSourceDocUpload.tsx` | edit | −20 (drop embedded button if any) |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | rewrite | net −80 (final pass) |
| `src/components/cogniblend/lc/LcLegalStepIndicator.tsx` | new (if needed) | +45 |
| `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx` | new (if needed) | +160 |
| `src/components/cogniblend/curation/CuratorComplianceTab.tsx` | edit | +25 (two buttons) |
| `src/components/cogniblend/lc/LcAttachedDocsCard.tsx` | edit | +5 (badge tweak) |
| `src/components/cogniblend/legal/LegalDocUploadHandler.tsx` | delete | −167 |

**Net:** ~+80 lines, but redistributes editor block out of the page so all components remain ≤ 250 lines (R1). Two-button decision point at the same visual location for both roles. `'organized'` becomes the canonical no-AI status.

## Out of scope
- DB schema additions beyond the CHECK update
- Pass 1 / Pass 2 logic
- QUICK auto-accept path
- Renaming `document_type` enum values

