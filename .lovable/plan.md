

# Plan — Unified Legal Document Workflow (Pass 3 single source of truth) — REVISED

## Goal

Collapse the 3 overlapping legal flows into ONE: source documents (Creator/Curator/LC uploads) feed Pass 3, which produces a single `UNIFIED_SPA` HTML document inside the TipTap editor. Curator sees the final pack read-only post-Phase 2 in CONTROLLED mode.

## Safety reaffirmed (no changes to)
- AI Pass 1 / Pass 2 / Zustand curation store
- `complete_phase`, `complete_legal_review`, `complete_curator_compliance`, `seed_default_legal_docs` RPCs (only A4 content tweak)
- `LegalDocEditorPanel`, `LegalDocEditorToolbar`, `LegalDocSectionNav`, `LegalDocUploadHandler`, `LcPass3ReviewPanel`, `useLcPass3Review`
- `challenges` table (only reuse of existing `pass3_stale` column)
- QUICK governance (legal docs auto-accepted; Pass 3 not run)

---

## Part A — Database (single migration)

**A1. Schema additions on `challenge_legal_docs`:**
```sql
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS source_origin TEXT
    CHECK (source_origin IN ('creator','curator','lc','platform_template'));
```

**A2. Trigger to mark Pass 3 stale on any non-`UNIFIED_SPA` insert/update:**
```sql
CREATE OR REPLACE FUNCTION public.fn_mark_pass3_stale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.document_type <> 'UNIFIED_SPA' THEN
    UPDATE public.challenges SET pass3_stale = true WHERE id = NEW.challenge_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_legal_source_marks_pass3_stale ON public.challenge_legal_docs;
CREATE TRIGGER trg_legal_source_marks_pass3_stale
  AFTER INSERT OR UPDATE ON public.challenge_legal_docs
  FOR EACH ROW EXECUTE FUNCTION public.fn_mark_pass3_stale();
```

**A3. DEV cleanup (per user authorization — destructive):**
```sql
DELETE FROM public.challenge_legal_docs
WHERE document_type NOT IN ('UNIFIED_SPA','SOURCE_DOC');
```
*(No production guard — explicitly authorized: "this development system no problem. Clean up".)*

**A4. Update `seed_default_legal_docs` RPC** so seeded platform-default rows insert with `source_origin='platform_template'` and `document_type='SOURCE_DOC'` (currently uses legacy `NDA`/etc.). Same return shape, idempotent.

**A5. Storage**: ensure `legal-docs` bucket exists with RLS allowing authenticated insert/select scoped by `challenge_id`. Create policies only if missing.

---

## Part B — Edge function `suggest-legal-documents`

**B1. `index.ts`** — delete entire non-`pass3_mode` branch. Return 400 `DEPRECATED` if `pass3_mode !== true`. Removes legacy `SYSTEM_PROMPT`, tool definition, persistence block.

**B2. `pass3Handler.ts`** — four changes:

1. **Broaden source query**: `.neq('document_type','UNIFIED_SPA')`, select `source_origin`.
2. **Lift content slice** 4_000 → 60_000 chars; total budget cap 180_000 (drop oldest overflow).
3. **Strict slotting block** in `buildSystemPrompt` (8 mandatory rules: best-fit `section_key`, no duplication, no invented sections, prefer uploaded clauses verbatim).
4. **Rename prompt block**: "Source documents (uploaded by Creator/Curator/LC — merge into appropriate sections)" with `source_origin` per item.

**B3. NEW — `arrange_only` mode** (replaces "manual concatenation"):
- Accept new request param `arrange_only: boolean` (default `false`).
- When `true`, override system prompt with **classification-only mode**:
  > *"You are a legal document arranger, NOT a content generator. You will receive uploaded source documents and a list of section_keys. For each clause/paragraph in the source documents, identify the BEST-FIT section_key and place it there VERBATIM (preserve original wording). Do NOT generate any new content. Do NOT enhance, summarize, or rewrite. Do NOT invent sections. If a clause does not fit any section, place it under 'General Provisions' and flag `requires_human_review=true`. Sections with no matching source content remain empty with a placeholder note '(No source content provided for this section)'."*
- Output written to `UNIFIED_SPA` row with `ai_review_status='arranged_only'` (new sentinel value).
- Token budget identical; AI temp lowered to 0.1 for deterministic slotting.

---

## Part C — New component `LcSourceDocUpload.tsx` (≤ 200 lines)

Path: `src/components/cogniblend/lc/LcSourceDocUpload.tsx`.

Props: `{ challengeId: string; sourceOrigin: 'lc'|'curator'|'creator'; disabled?: boolean }`.

Layered per R2:
- **Service**: `src/services/legal/sourceDocService.ts` — `parseFileToHtml(file)` (mammoth `.docx`, `\n→<p>` `.txt`, null `.pdf`), MIME validation.
- **Hook**: `src/hooks/queries/useSourceDocs.ts` — `useSourceDocs(challengeId)`, `useUploadSourceDoc()`, `useDeleteSourceDoc()`, `useArrangeIntoSections()` (calls edge fn with `arrange_only=true`). All Supabase calls live here.
- **Component**: pure presentation — Card "Upload Source Legal Documents", `FileUploadZone` (multiple), list with file name + date + origin badge + remove, yellow info alert *"After uploading, click 'Run Pass 3 AI Review' below to generate the unified agreement, OR use 'Arrange into Sections' for verbatim slotting without AI enhancement."*
- **Secondary CTA**: `"Arrange into Sections (No AI Enhancement)"` (variant=outline) — calls `useArrangeIntoSections`. NOT a dumb concatenation; invokes the edge fn `arrange_only` mode so AI does pure classification/slotting.

Inserts: `document_type='SOURCE_DOC'`, `tier='TIER_1'`, `status='uploaded'`, `source_origin=<prop>`, `content_html=<extracted|null>`, `document_name=<filename>`. Trigger A2 sets `pass3_stale=true` automatically.

PDF files: store at `{challengeId}/source/{uuid}_{filename}`, save path on row's `lc_review_notes`; UI shows "PDF — content extracted by AI during Pass 3" badge.

---

## Part D — Page / panel wiring

**D1. `LcLegalWorkspacePage.tsx`** — strip ALL legacy:
- Delete imports: `AssembledCpaSection`, `LcAiSuggestionsSection`, `LcAddDocumentForm`, `usePersistedSuggestions`.
- Delete state: `generating`, `generateError`, `openCards`, `docEdits`, `showAddForm`, `newDoc*`, `handleGenerate`, `acceptDocMutation`, `dismissSuggestionMutation`, `handleSaveContent`, `handleAddNewDoc`, `getDocEdit`, `updateDocEdit`, `initDocContent`, `toggleCard`, `savingContent`.
- Keep: `deleteDocMutation`, `handleSubmitToCuration`, gate validation, header, `WorkflowProgressBanner`, `LcFullChallengePreview`, `LcAttachedDocsCard`, `LcReturnToCurator`, `LcApproveAction`, PWA gate.
- New JSX order: Header → ComplianceComplete alert → `WorkflowProgressBanner` → `LcFullChallengePreview` → `<LcSourceDocUpload sourceOrigin="lc" />` → `<LcPass3ReviewPanel />` → `<LcAttachedDocsCard />` → action footer.
- Remove `hasSuggestions` validation alert (replaced by Pass 3 acceptance gate).
- Net: ~250 → ~150 lines.

**D2. `CuratorComplianceTab.tsx`** — same simplification:
- Drop `LcAiSuggestionsSection`, `LcAddDocumentForm`, `usePersistedSuggestions`.
- Trim `useLcLegalActions` consumers (only `deleteDocMutation` remains).
- Add `<LcSourceDocUpload sourceOrigin="curator" />` above `<LcPass3ReviewPanel />` in Legal tab.
- Keep `seed_default_legal_docs` auto-seed effect.

**D3. `CuratorLegalReviewPanel.tsx`** — **add `readOnly` capability**:
- Add prop `readOnly?: boolean` (default `false`).
- When `true`:
  - Editor renders non-editable (TipTap `editable={false}`).
  - Action buttons (Accept/Re-run/Save) hidden.
  - Blue info banner above editor: *"Legal documents approved by Legal Coordinator on {accepted_at}. View-only."* (date pulled from `UNIFIED_SPA.reviewed_at`).
  - "Source Input" docs list still visible (read-only).

**D4. `CurationReviewPage.tsx`** — **widen visibility condition**:
- Change `current_phase === 2` gate for `<CuratorLegalReviewPanel>` → `govMode !== 'QUICK'` so Curator sees panel at any phase.
- Pass `readOnly={govMode === 'CONTROLLED' && current_phase > 2}` so post-Phase-2 view in CONTROLLED is locked.
- Remove the `<CuratorCpaReviewPanel>` JSX block entirely (template assembly redundant).
- STRUCTURED Curators continue to edit through `CuratorComplianceTab` Legal tab; the `CuratorLegalReviewPanel` is the read-only mirror after acceptance.

---

## Part E — `LcAttachedDocsCard.tsx`

- Add `documentType` and `sourceOrigin` to `AttachedDoc` type.
- Badge logic:
  - `document_type='UNIFIED_SPA'` → green "Final Agreement ✓", no delete button.
  - `document_type='SOURCE_DOC'` → blue "Source Input" + origin sub-badge (Creator / Curator / LC / Platform).
- Section header: "Legal Documents ({count})".
- Card hidden only when both lists empty.

---

## Part F — `useLcLegalData.ts`

- `useAttachedLegalDocs`: select adds `source_origin, ai_review_status`, drop `.neq('status','ai_suggested')`, replace with `.in('document_type', ['SOURCE_DOC','UNIFIED_SPA'])` so no legacy types resurface.
- Delete `usePersistedSuggestions` export.
- Update `AttachedDoc` interface in `lcLegalHelpers.ts`.

---

## Part G — File deletions

- `src/components/cogniblend/lc/LcAiSuggestionsSection.tsx`
- `src/components/cogniblend/lc/LcAddDocumentForm.tsx`
- `src/components/cogniblend/lc/AssembledCpaSection.tsx`
- `src/components/cogniblend/curation/CuratorCpaReviewPanel.tsx` (after `CurationReviewPage` updated)
- `src/hooks/cogniblend/useCuratorCpaActions.ts`
- `src/components/cogniblend/LegalDocUploadSection.tsx` (orphaned)
- Trim `useLcLegalActions.ts` to `deleteDocMutation` only.

---

## Part H — Verification

1. **DB**: trigger fires on SOURCE_DOC insert → `challenges.pass3_stale=true` (psql probe).
2. **LC flow**: `/cogni/challenges/:id/lc-legal` → upload `.docx` → `source_origin='lc'` row inserted → Pass 3 stale alert → Run Pass 3 → unified SPA reflects clauses → Accept → `LcAttachedDocsCard` shows "Final Agreement ✓".
3. **Arrange-only flow**: upload 2 `.txt` files → click "Arrange into Sections" → AI runs in `arrange_only` mode → editor populated with VERBATIM clauses slotted into matching sections → `ai_review_status='arranged_only'`.
4. **STRUCTURED Curator**: same path through `CuratorComplianceTab`.
5. **CONTROLLED Curator post-Phase-2**: `CurationReviewPage` shows `<CuratorLegalReviewPanel readOnly>` with locked editor + "Approved by LC on …" banner.
6. **QUICK**: untouched (verify Pass 3 panel hidden).
7. Update memory `mem://cogniblend/legal/architecture-v2-framework`.

---

## Files touched

| File | Action | Δ |
|---|---|---|
| `supabase/migrations/<new>.sql` | new | +95 |
| `supabase/functions/suggest-legal-documents/index.ts` | edit | −110 |
| `supabase/functions/suggest-legal-documents/pass3Handler.ts` | edit | +60 (incl arrange_only) |
| `src/components/cogniblend/lc/LcSourceDocUpload.tsx` | new | +180 |
| `src/services/legal/sourceDocService.ts` | new | +60 |
| `src/hooks/queries/useSourceDocs.ts` | new | +130 |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | edit | −300 |
| `src/components/cogniblend/curation/CuratorComplianceTab.tsx` | edit | −60 |
| `src/components/cogniblend/legal/CuratorLegalReviewPanel.tsx` | edit | +35 (readOnly) |
| `src/components/cogniblend/lc/LcAttachedDocsCard.tsx` | edit | +30 |
| `src/hooks/cogniblend/useLcLegalData.ts` | edit | −30 |
| `src/lib/cogniblend/lcLegalHelpers.ts` | edit | +5 |
| `src/hooks/cogniblend/useLcLegalActions.ts` | trim | −230 |
| `src/pages/cogniblend/CurationReviewPage.tsx` | edit | +5 (readOnly + phase gate) |
| Delete: `LcAiSuggestionsSection`, `LcAddDocumentForm`, `AssembledCpaSection`, `CuratorCpaReviewPanel`, `useCuratorCpaActions`, `LegalDocUploadSection` | delete | −1500 |

**Net:** ~−1630 lines, single canonical Pass 3 flow with arrange-only fallback, all components ≤ 250 lines (R1).

---

## Out of scope
- Renaming `document_type` enum values
- Pass 1 / Pass 2 prompt changes
- QUICK auto-accept path

