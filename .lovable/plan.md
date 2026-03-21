

## Plan: Enhance LC Legal Workspace — Remove External Link, Robust AI Content, Delete & Add Docs

### Changes Overview

**4 areas of change:**
1. Remove External Link input from document cards
2. Upgrade AI prompt to generate full, legally robust document content
3. Add ability for LC to delete AI-generated/existing legal documents
4. Add ability for LC to manually add new legal documents with content + file upload

---

### 1. Remove External Link Option
**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**
- Remove the External Link section (lines 718-734) from document cards
- Remove `linkUrl` from `DocEditState` interface and all references
- Remove `LinkIcon` from imports

### 2. Upgrade AI Content Quality
**File: `supabase/functions/suggest-legal-documents/index.ts`**

Update the SYSTEM_PROMPT and the `content_summary` field description to instruct the AI to produce comprehensive, legally complete document content — not summaries. Key changes:

- Rename `content_summary` → keep the field name but change the AI instruction to: *"Generate the FULL legal document text — complete clauses, definitions, obligations, liability terms, governing law, and dispute resolution. The output must be ready for legal review, not a summary."*
- Add detailed instructions per document type (NDA should include definitions of Confidential Information, obligations period, exclusions, remedies; Challenge Terms should include eligibility, submission process, evaluation, disqualification, warranties, limitation of liability, etc.)
- Instruct the AI to reference the specific challenge details (IP model, maturity, scope) within the document text

### 3. Allow LC to Delete Legal Documents
**Database migration:**
- Add DELETE RLS policy on `challenge_legal_docs` for authenticated users (scoped to `attached_by = auth.uid()`)

**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**
- Add a `deleteDocMutation` using `supabase.from('challenge_legal_docs').delete().eq('id', docId)`
- Add a "Delete" button (with confirmation) on each accepted document card
- On success, remove from `acceptedDocs` set and invalidate queries
- Also add delete capability for AI-suggested docs (before acceptance) — simply removes from the local suggestions list

### 4. Allow LC to Add New Legal Documents
**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**
- Add an "Add Legal Document" section after the AI-generated cards
- Form fields: Document Title, Document Type (dropdown: NDA, CHALLENGE_TERMS, IP_ASSIGNMENT, etc.), Tier (1 or 2), Content (textarea), File Upload (using `FileUploadZone`), LC Notes
- File upload uses the existing `legal-docs` storage bucket
- On submit: insert into `challenge_legal_docs` with `lc_status: 'approved'`, upload file to storage if provided
- Add `addDocMutation` for the insert logic
- Import and use `FileUploadZone` component with PDF/DOCX config

### 5. Fetch & Display Already-Attached Docs
**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**
- Add a query to fetch existing `challenge_legal_docs` for this challenge (already attached from prior sessions or re-visits)
- Display them in a separate "Attached Documents" section above the AI suggestions
- Each attached doc shows type, tier, status, and has a delete button

---

### Technical Details

**DB Migration (1 statement):**
```sql
CREATE POLICY "LC can delete legal docs they attached"
  ON public.challenge_legal_docs FOR DELETE
  TO authenticated USING (attached_by = auth.uid());
```

**Edge Function prompt changes** — the `content_summary` description in the tool schema changes from "Brief summary of what the document should cover (3-5 key points)" to instructing full legal document generation with proper clauses, definitions, and terms. The SYSTEM_PROMPT gets expanded with per-document-type content requirements.

**No breaking changes** — all existing data and flows remain intact. The accept mutation, gate validation, and submit-to-curation flow are unchanged.

**Files modified:**
- `supabase/functions/suggest-legal-documents/index.ts` (prompt upgrade)
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx` (UI: remove link, add delete, add new doc, show attached)
- 1 new DB migration (DELETE RLS policy)

