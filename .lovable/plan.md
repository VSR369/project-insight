

# Plan — Allow multiple source uploads + simplify the LC legal UX

## What's broken today

1. **2nd upload fails with "row already exists"**
   - The DB has a UNIQUE constraint `uq_challenge_legal_docs_type_tier` on `(challenge_id, document_type, tier)`.
   - Every `SOURCE_DOC` is inserted with `tier = 'TIER_1'`.
   - First upload succeeds; second one violates the unique key.
   - This constraint was designed for the *single* `UNIFIED_SPA` row, not for multiple `SOURCE_DOC` uploads.

2. **UI complexity**
   - Two cards for one workflow ("Source Legal Documents" + "Pass 3 — AI Legal Review") with two actions on the upload card and three more in the editor.
   - Naming "Pass 3 — AI Legal Review" is jargon.
   - Unclear that "Re-organize" = consolidate uploads and "Run AI" = enhance the same content.

## Fix — two parts

### Part A — Database

New migration: relax the unique constraint so multiple SOURCE_DOC rows are allowed per challenge, while still enforcing one UNIFIED_SPA per tier.

```sql
ALTER TABLE public.challenge_legal_docs
  DROP CONSTRAINT IF EXISTS uq_challenge_legal_docs_type_tier;

-- One UNIFIED_SPA per (challenge, tier) — but unlimited SOURCE_DOC uploads.
CREATE UNIQUE INDEX uq_challenge_legal_docs_unified_per_tier
  ON public.challenge_legal_docs (challenge_id, document_type, tier)
  WHERE document_type <> 'SOURCE_DOC';
```

No other DB changes required — `ai_review_status` already accepts `organized`/`accepted`/`ai_suggested`.

### Part B — UI consolidation (LC workspace)

**Goal:** one card, one editor, one obvious action.

Layout after the change:

```text
┌─ Step 1 — Source Legal Documents ───────────────────────┐
│  [Add Documents]  .docx, .txt, .pdf · max 10 MB         │
│  • Creator: terms_v2.docx                               │
│  • Curator: addendum.docx                               │
│  • LC:      mnm_blueprint.docx           [delete]       │
└─────────────────────────────────────────────────────────┘

┌─ Step 2 — Legal Review ─────────────────────────────────┐
│  [ Consolidate uploaded documents ]   ← primary         │
│  [ Enhance with AI (optional) ]       ← secondary       │
│  ───────────────────────────────────────────────────    │
│  <TipTap editor — unified agreement live here>          │
│  ───────────────────────────────────────────────────    │
│  [Save Draft]   [Accept Legal Documents]   ← only two   │
└─────────────────────────────────────────────────────────┘
```

Concrete changes:

1. **`LcSourceDocUpload.tsx`**
   - Remove the `onRunPass3` / `onOrganizeOnly` props and the bottom action area.
   - It becomes a pure upload + list card.

2. **`LcPass3ReviewPanel.tsx`** → rename header to **"Legal Review"** (drop "Pass 3 — AI").
   - Add a top action row inside the card with two buttons:
     - **`Consolidate uploaded documents`** (primary) → calls `organizeOnly()`. Re-labels to **`Re-consolidate`** once a draft exists.
     - **`Enhance with AI (optional)`** (secondary) → calls `runPass3()`. Re-labels to **`Re-enhance with AI`** once a draft exists.
   - Tooltip / helper text: *"Consolidate merges all uploaded documents into one streamlined agreement. AI enhance rewrites it using the full challenge context."*
   - Remove the now-redundant `Re-run Pass 3` button from `Pass3EditorBody`. Keep only `Save Draft` and `Accept Legal Documents`.
   - Remove the existing `Pass3ReviewHeader` "Re-run / Re-organize" buttons (they're now in the card header) — keep the AI summary, confidence, regulatory chips.

3. **`LcLegalWorkspacePage.tsx`**
   - Stop passing `onRunPass3` / `onOrganizeOnly` to `LcSourceDocUpload`.
   - Keep step indicator: Step 1 = no draft, Step 2 = draft, Step 3 = accepted.

4. **`Pass3EditorBody.tsx`**
   - Remove the bottom "Re-run Pass 3" button.
   - Footer keeps `Save Draft` + `Accept Legal Documents` only.

5. **No backend logic change** — `organizeOnly` already merges Creator + Curator + LC source docs without AI; `runPass3` already enhances with AI. Both already feed the same editor row.

## Files touched

- `supabase/migrations/<new>_allow_multiple_source_docs.sql` — drop old unique, add partial unique excluding SOURCE_DOC.
- `src/components/cogniblend/lc/LcSourceDocUpload.tsx` — remove action props + bottom action block.
- `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` — rename to "Legal Review", add Consolidate / Enhance buttons inside card.
- `src/components/cogniblend/lc/Pass3EditorBody.tsx` — drop the Re-run button.
- `src/components/cogniblend/lc/Pass3ReviewHeader.tsx` — drop the duplicate Rerun/Reorganize buttons (the chips/summary stay).
- `src/components/cogniblend/lc/Pass3StatusStrip.tsx` — if its only buttons were `onRerunAi` / `onReorganize`, simplify or inline; verify after edit.
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx` — drop the action props passed to `LcSourceDocUpload`.
- `src/components/cogniblend/curation/CuratorComplianceTab.tsx` — same prop cleanup so STRUCTURED Curator path stays consistent.

## Verification

1. Upload 3 different `.docx` files in a row — all succeed and appear in the list.
2. Click **Consolidate uploaded documents** → unified agreement appears in the editor, status `organized`.
3. Click **Enhance with AI (optional)** → unified agreement updates, status `ai_suggested`.
4. Edit, click **Save Draft** → autosaved.
5. Click **Accept Legal Documents** → status `accepted`, banner appears.
6. Click **Submit to Curation** → success toast, returned to Curator.
7. STRUCTURED Curator legal tab still works (same buttons in its panel).
8. `npx tsc --noEmit` passes.

## Out of scope

- Renaming `document_type` enum values.
- Touching Pass 1 / Pass 2 / `complete_legal_review` RPC.
- Any change to the QUICK auto-accept path.

