
# Plan — Fix source legal document upload and restore the LC legal flow

## What is actually broken

Two separate issues are causing the current behavior:

1. **Upload still fails in the database**
   - The new function `public.enforce_legal_doc_status()` exists and correctly allows:
     `uploaded, organized, accepted, APPROVED`
   - But the live table trigger on `challenge_legal_docs` is still bound to the **old** function:
     `trg_challenge_legal_docs_validate()`
   - That old trigger still allows only:
     `ATTACHED, TRIGGERED, SIGNED, EXPIRED, ai_suggested`
   - Result: uploads still fail with:
     `Invalid status: uploaded`

2. **No source docs are visible because none were saved**
   - For challenge `25ca71a0-3880-4338-99b3-e157f2b88b3b`, the DB currently contains only:
     - one `UNIFIED_SPA`
   - It contains **zero** `SOURCE_DOC` rows
   - So the upload card correctly shows nothing from Creator / Curator / LC yet

## Confirmed current state

- The UI code for the upload card is present:
  - `LcSourceDocUpload.tsx` already shows the bottom action area for:
    - `Run AI Pass 3 (Merge + Enhance)`
    - `Organize & Merge (No AI)`
- The Pass 3 panel now tells users to use the buttons in the upload card
- The footer file no longer contains `Approve Legal Compliance`
- The database function update was only **partially** applied: function replaced, trigger not redirected

## Required implementation

### A. Fix the real DB trigger
Create a new migration that does one of these cleanly:

**Preferred**
- `CREATE OR REPLACE FUNCTION public.trg_challenge_legal_docs_validate()` so it allows:
  - `ATTACHED`
  - `TRIGGERED`
  - `SIGNED`
  - `EXPIRED`
  - `ai_suggested`
  - `uploaded`
  - `organized`
  - `accepted`
  - `APPROVED`

This is the safest fix because the existing trigger already points to this function.

**Alternative**
- Drop and recreate the trigger so it uses `enforce_legal_doc_status()`

Either approach is fine, but only one source of truth should remain afterward.

### B. Remove the dead duplicate validator
After A, clean up the redundant validator path so there is no future mismatch:
- keep **one** status-validation function for `challenge_legal_docs`
- document in the migration why this is the canonical source-doc + unified-doc status set

### C. Verify the LC page reflects the intended workflow
No architecture rewrite is needed; just verify/finalize the already-added UX:

1. **Step 1**
   - Upload source legal docs from LC
   - show inherited Creator/Curator docs when present

2. **Decision point in same card**
   - `Organize & Merge (No AI)`
   - `Run AI Pass 3 (Merge + Enhance)`

3. **Step 2**
   - Unified agreement appears in the Pass 3 review/editor area

4. **Step 3**
   - LC accepts inside the unified agreement editor

5. **Final action**
   - `Submit to Curation` advances the challenge back to Curator

### D. Small code cleanup while touching this area
1. In `useSourceDocs.ts`
   - add a brief comment that `status: 'uploaded'` is intentional and supported by the challenge legal-doc trigger
2. Remove the `as any` on the insert if possible with a typed insert payload
3. Keep query invalidations as-is

### E. Verification after implementation
Run these checks:

1. Upload a `.docx`, `.txt`, and `.pdf` on:
   `/cogni/challenges/25ca71a0-3880-4338-99b3-e157f2b88b3b/lc-legal`
   - each should save successfully
   - each should create a `SOURCE_DOC` row

2. Confirm the upload card now shows the uploaded docs immediately

3. Confirm `Legal Documents` list shows:
   - source docs as `Source Input`
   - unified SPA as `Final Agreement`

4. Confirm the two action buttons are visible in the source-doc card

5. Click `Organize & Merge`
   - unified agreement updates
   - status becomes `organized`

6. Click `Run AI Pass 3`
   - unified agreement updates
   - status becomes `ai_suggested`

7. Accept the unified agreement
   - status becomes `accepted`
   - LC approval banner appears

8. Click `Submit to Curation`
   - success toast says it is handed back to Curator

## Files to touch

- `supabase/migrations/<new>_fix_challenge_legal_doc_status_trigger.sql`
- `src/hooks/queries/useSourceDocs.ts`

Possibly, only if cleanup is needed after verification:
- `src/components/cogniblend/lc/LcSourceDocUpload.tsx`
- `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`
- `src/components/cogniblend/lc/LcLegalSubmitFooter.tsx`

## Why this is the right fix

The visible UI problem is downstream of a DB trigger mismatch, not a missing React feature. The app is already trying to save `SOURCE_DOC` rows and already has the intended LC actions in the upload card. Once the trigger is corrected, the missing documents and downstream workflow should start behaving as designed.
