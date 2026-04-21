

# Plan — Make Re-organize provably faithful to uploaded source documents

## What's actually wrong (confirmed from your DB + the prompt code)

I queried `challenge_legal_docs` for this challenge. Two source docs exist:

| Doc | Type | `content_html` length | What's in it |
|---|---|---|---|
| `M&M_Strategic Blueprint.docx` | SOURCE_DOC | 9,111 chars | A **CNC predictive-maintenance blueprint** — operational plan, not legal terms |
| `legal_architecture_requirements.md.pdf` | SOURCE_DOC | **NULL** | PDF body never extracted — only the storage path was saved |

The "organized" Solution Provider Agreement (id `871e97e7…`, 6,785 chars) contains clauses about "Autonomous Multi-Agent Systems", "₹50 Lakhs HITL threshold", "Manufacturing Hubs (Pune, Chennai, Manesar, Pithampur)", "Medallion Architecture", "DPDPA 2023" — **none of which appear in either source document**. They came from the curated **challenge context** (problem statement, scope, deliverables, geo pack), which `pass3Handler.buildUserPrompt` injects into the prompt for *both* modes.

So Re-organize is currently doing exactly what you suspected: **inventing legal clauses from the challenge brief** rather than merging your uploaded sources, because:

1. **PDFs are silently empty.** `parseFileToHtml` in `src/services/legal/sourceDocService.ts` returns `{ contentHtml: null }` for `.pdf` and `useUploadSourceDoc` only stores the storage path in `lc_review_notes`. The Pass 3 handler reads `content_html` — which is `NULL` — so the PDF contributes zero text to the AI.
2. **The DOCX has no legal content.** Mammoth extracted the operational blueprint correctly, but the AI was told to produce a legal SPA, so it ignored the irrelevant content and back-filled from the challenge context.
3. **`buildUserPrompt` injects the full challenge brief, org, industry pack and geo pack in BOTH modes** (`pass3Handler.ts` lines 323-354). In organize mode the system prompt says "do not generate new substantive content" — but the model is still given the full brief, so it manufactures clauses from it. The system prompt is too weak; the *user prompt* contradicts it.
4. **No grounding check after generation.** Output is persisted as-is. No verification that organize-mode clauses actually trace back to source-doc text.

## Fix — Three coordinated changes

### A. Make organize mode strictly source-only (server)

**File:** `supabase/functions/suggest-legal-documents/pass3Handler.ts`

1. **Branch `buildUserPrompt`** on `organizeOnly`. In organize mode, send ONLY:
   - The section list (titles + keys, no per-section instructions, no regulatory frameworks).
   - The source documents block (verbatim).
   - **Do NOT** send `challengeSlim`, `orgSlim`, `industryPack`, or `geoContext`. Replace with a one-line note: *"Challenge context is intentionally withheld in organize mode. Use ONLY the source documents above."*
2. **Strengthen the organize system prompt** with hard rules:
   - *"You will receive ONLY source documents and a section list. You will NOT receive the challenge brief. If a source document contains no clause for a section, output exactly the placeholder paragraph and the section_html field for that section MUST be only that placeholder — no invented content."*
   - *"Every sentence in `unified_document_html` and `section_html` MUST be a near-verbatim quote, paraphrase, or merge of text from the supplied source documents. If you cannot trace a sentence to a source document, do not include it."*
   - Require each section's `changes_summary` to name the **source document(s) the content was drawn from** (e.g., *"Merged from M&M Strategic Blueprint §2.1 and Legal Architecture Requirements §4"*) or to say *"(no source content — placeholder)"*.
3. **Add a server-side fidelity check** before persisting: for each non-placeholder section, take the first 80 chars of `section_html` (whitespace-collapsed, lowercased) and confirm a meaningful substring appears in the concatenation of source docs' `content_html`. If it doesn't, mark `requires_human_review=true` and append a flag `"unverified_source_match"` to `ai_regulatory_flags`. (Pattern follows the cross-validation pattern in our Lovable knowledge base.)
4. **Hard-fail organize mode when no source has extractable text.** If every source doc has `content_html IS NULL` (e.g., only a PDF was uploaded), return a 400 with code `NO_EXTRACTABLE_SOURCE` and message: *"Organize requires at least one source document with extractable text. PDF text extraction is not yet enabled — please upload a .docx or .txt version, or run AI Pass 3 instead."*

### B. Stop silently accepting PDFs with no extracted text (client)

**Files:** `src/services/legal/sourceDocService.ts`, `src/hooks/queries/useSourceDocs.ts`

PDF parsing isn't implemented. Two options to choose between:

- **B1 (recommended, smaller scope):** Remove `.pdf` from `SOURCE_DOC_CONFIG.allowedExtensions` / `allowedTypes`. Update upload helper text to *"DOCX or TXT only — PDF support is coming soon."* This prevents the silent-empty-content bug end-to-end. Existing PDF rows stay in the DB but no new ones can be added; the server hard-fail in (A4) catches the historical ones.
- **B2 (larger scope):** Wire `pdfjs-dist` in `parseFileToHtml` to actually extract PDF text to HTML before insert. Bigger change (~80 lines + dep), and quality varies by PDF. Out of scope for this fix unless you ask for it explicitly.

I'll go with **B1** unless you say otherwise.

### C. Make the difference visible to you (UI)

**File:** `src/components/cogniblend/lc/Pass3EditorBody.tsx` (banner) — small additive tweak.

When the loaded UNIFIED_SPA row has `ai_review_status='organized'`:
- Show a one-line provenance strip above the editor: *"Organize merged content from N source document(s): {names}"* — read from the existing `useSourceDocs` query (no new fetch).
- If the new server flag `unverified_source_match` is present in `ai_regulatory_flags`, show an amber warning: *"Some clauses could not be traced back to your uploaded sources. Review carefully or re-upload more complete source documents."*

This makes it obvious at a glance whether the document on screen is faithful to your uploads.

## Behaviour after fix

| You upload | You click | What you'll see |
|---|---|---|
| Only a PDF | Re-organize | Hard error: *"Organize requires extractable text. Upload .docx/.txt or run AI Pass 3."* |
| A DOCX with operational (non-legal) content | Re-organize | A document containing **only your DOCX text reorganized into matching sections**, with placeholders in every legal section (definitions, IP, indemnity, etc.) the source doesn't cover. Banner says *"merged from 1 source"*. Amber warning if any clause failed verification. |
| A DOCX of actual legal terms | Re-organize | Clauses from your DOCX placed into best-fit sections, deduped and harmonised. Sections with no source content show the placeholder. |
| Same DOCX | Re-run AI Pass 3 | Full SPA, drafted using sources + challenge context + regulatory packs (current behaviour — this mode is allowed to generate). The diff banner now makes the difference between Organize and Pass 3 obvious. |

## Verification

1. With the current data (one DOCX of CNC blueprint + one empty PDF) → click **Re-organize** → expect either a placeholder-heavy document attributed to the DOCX, or a hard error if PDFs are blocked. Either way: zero invented legal clauses.
2. Inspect the persisted row: `ai_changes_summary` names the source doc(s); per-section `changes_summary` says either *"Merged from {filename}"* or *"(no source content — placeholder)"*.
3. Upload a DOCX containing a real confidentiality clause → Re-organize → that clause appears verbatim/near-verbatim in the **Confidentiality** section; all other sections are placeholders.
4. Re-run AI Pass 3 on the same data → full SPA generated; diff banner shows additions/deletions vs the organize output.
5. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Implementing real PDF text extraction (option B2 above) — flag if you want it and I'll plan it as a follow-up.
- Word-level diff inside paragraphs — block-level remains the unit.
- Edge function deployment / DB migration — none required.

