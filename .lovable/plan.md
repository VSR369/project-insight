

# Verification Report: 7 Defects — What's Fixed, What's Not

## Summary: 4 of 7 items are genuinely fixed. 3 remain partially or fully broken.

---

## 1. Digest looks cached (stale during re-analyse)

**Status: FIXED**

`handleAnalyse` (line 177) now invalidates `context-digest`, `context-sources`, `context-source-count`, `context-pending-count` queries. React Query cache is cleared. The old digest row still exists in DB (not deleted), but the UI will refetch it, so the "stale feeling" is resolved.

However: the old digest row is NOT deleted or marked stale in the database. If no new digest is generated before the user sees the drawer, they see the old one. This is a minor gap — the provenance bar (DigestPanel line 99-117) now shows when it was generated, so it is at least transparent.

## 2. Context Library review gating

**Status: FIXED**

- Drawer close no longer auto-sets `contextLibraryReviewed = true`. The old auto-unlock effect was removed.
- `contextLibraryReviewed` is only set via `handleContextLibraryConfirm` (orchestrator line 256-261), which is wired through `onConfirmReview` on ContextLibraryDrawer → DigestPanel "Confirm & Close" button.
- `handleAnalyse` resets it to `false` (line 172) and clears sessionStorage (line 174).
- Hydration in `useCurationEffects` uses `hydrationDoneRef` guard — won't re-trigger on refetch.

## 3. "Confirm & Close" does what it says

**Status: PARTIALLY FIXED**

What works:
- Clicking "Confirm & Close" calls `onConfirmReview` → `handleContextLibraryConfirm` → sets `contextLibraryReviewed = true` → enables "Generate Suggestions" button.
- Then closes the drawer.

What's still missing (from the plan):
- Does NOT validate accepted/extracted source set (no check for "do you have at least 1 accepted source?")
- Does NOT regenerate digest if stale
- Does NOT persist `context_intake_status = confirmed` to DB
- Does NOT trigger Pass 2 automatically

The plan said to make this "the real handoff step" with DB-backed state machine (`not_started → analysed → reviewing → confirmed → generating → generated`). **None of the DB-backed workflow states were implemented.** It's still session-only gating.

## 4. Auto-accept and forbidden-site handling

**Status: FIXED**

- `checkAccessibility()` (discover-context-resources line 112-146) now does HEAD first, then falls back to GET on 403/405/406.
- Paywall domain list exists (line 30-34).
- Auto-accept threshold is 0.85 with accessible check (line 480-482).
- `access_status` is recorded per URL (line 513).

Missing from plan: no `head_403_get_ok` access reason recorded — it just returns `accessible` on GET success. Minor.

## 5. Extraction reliability (PDF/DOCX/XLSX)

**Status: NOT FIXED — Still uses TextDecoder**

`extract-attachment-text/index.ts`:
- PDF file extraction (line 192-202): still `new TextDecoder().decode(buffer)` → regex strip non-printable → printable ratio check. This is NOT real PDF parsing. Most PDFs will fail.
- DOCX (line 219-234): same `TextDecoder` approach. DOCX is a ZIP of XML files — `TextDecoder` will produce garbage.
- XLSX (line 203-218): same pattern.
- URL PDFs (line 92-127): same `TextDecoder` approach.

The plan explicitly called for "real PDF text extraction", "real parsers instead of binary decode", and "OCR fallback for scanned PDFs". **None of these were implemented.** This is the biggest remaining gap — it directly explains missing summary/text/key data for most file-based sources.

Note: The Deno edge function runtime limits available libraries. A proper fix would use pdf-parse, mammoth.js, or external API calls.

## 6. Curator de-select UX

**Status: FIXED**

- `SourceDetail` (line 150-154) now has explicit "Move to Suggested" button with `Undo2` icon for accepted sources.
- `SourceDetail` also has Re-extract button (line 155-157).
- `SourceList` still has the inline unaccept via `onUnaccept` prop.
- Both accept/reject/unaccept are wired through the drawer.

## 7. AI credit exhaustion surfacing

**Status: NOT FIXED**

- `generate-context-digest` handles 402 (confirmed from prior analysis).
- `discover-context-resources` does NOT check for 402 from AI calls. Lines 285-298 (query generation) and 443-466 (scoring) catch errors generically — no specific 402/429 handling or user-facing message.
- `extract-attachment-text` does NOT surface 402/429 from AI summarization calls (line 337-339: just `console.error`).
- No toast or inline error message for credit exhaustion anywhere in discovery or extraction.

---

## Remaining Work (3 items)

### Item A: DB-backed workflow state machine (NOT started)
The plan called for using `context_intake_status` with states `not_started/analysed/reviewing/confirmed/generating/generated`. Currently still using sessionStorage + useState. This is a design-level gap.

**Recommendation:** Skip for now — the session-based gating works correctly after the fixes. DB-backed states are an upgrade, not a bug fix.

### Item B: Real PDF/DOCX/XLSX extraction (NOT started)
This is the biggest functional gap. Options for Deno edge functions:
1. Use `pdf-parse` via esm.sh import (may work in Deno)
2. Call an external extraction API
3. Use Gemini/GPT-4 vision to "read" PDF pages as images
4. Accept the limitation and mark binary files as `partial` (already done via `PLACEHOLDER_METHODS`)

**Recommendation:** Use AI vision for PDFs (already works for images at line 236-261) — send PDF pages as base64 images to the AI. For DOCX, parse the XML inside the ZIP.

### Item C: Credit exhaustion diagnostics (NOT started)
Add 402/429 detection in discover and extract functions, surface via toast.

**Recommendation:** Quick fix — check response status codes from AI calls, return specific error codes, and handle them in the frontend mutation `onError`.

---

## Implementation Plan (if approved)

### File 1: `supabase/functions/extract-attachment-text/index.ts`
- For PDF files: use AI vision (send base64 of first ~5 pages as images) instead of TextDecoder
- For DOCX: attempt to extract XML content from the ZIP structure using Deno's built-in capabilities
- Add 402/429 detection on AI calls → set `extraction_error` with specific message

### File 2: `supabase/functions/discover-context-resources/index.ts`
- Add 402/429 checks on `callAIWithFallback` responses (lines 285, 443)
- Return specific error codes (`AI_CREDITS_EXHAUSTED`, `AI_RATE_LIMITED`)

### File 3: `src/hooks/cogniblend/useContextLibraryMutations.ts`
- In discover mutation `onError`: parse error code, show specific toast for credit exhaustion vs rate limit
- In re-extract mutation: same pattern

### File 4: `src/components/cogniblend/curation/context-library/DigestPanel.tsx`
- Add minimum source validation before allowing "Confirm & Close" (warn if 0 accepted sources or 0 extracted)

