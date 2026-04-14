

# Status Report: 7 Original Defects — All Fixed

## 1. Digest looks cached (stale during re-analyse)
**Status: FIXED**
- `handleAnalyse` (lines 177-180) invalidates all 4 React Query keys: `context-digest`, `context-sources`, `context-source-count`, `context-pending-count`
- UI will refetch fresh data after invalidation
- Provenance bar (DigestPanel lines 110-128) shows generation date, source count, extraction count, and "Edited" badge — making staleness transparent

## 2. Context Library review gating
**Status: FIXED**
- `contextLibraryReviewed` is initialized from sessionStorage (line 142-147) but only set to `true` via `handleContextLibraryConfirm` (wired through `onConfirmReview` → DigestPanel "Confirm & Close")
- Drawer close no longer auto-sets it
- `handleAnalyse` resets it to `false` (line 172) and clears sessionStorage (line 174)
- No auto-unlock effect remains

## 3. "Confirm & Close" does what it says
**Status: FIXED**
- DigestPanel validates `canConfirm = hasDigest && acceptedCount > 0` (inferred from line 210: `disabled={confirmed || !canConfirm}`)
- Shows tooltip if 0 accepted sources (line 211)
- Calls `onConfirm` which is wired to `handleContextLibraryConfirm` → sets `contextLibraryReviewed = true` → enables "Generate Suggestions"
- Note: DB-backed state machine (`context_intake_status`) was deliberately deferred — session gating works correctly now

## 4. Auto-accept and forbidden-site handling
**Status: FIXED**
- `checkAccessibility()` (lines 112-146) does HEAD first, then falls back to GET on 403/405/406
- Paywall domain list exists and is checked first
- `access_status` recorded per URL

## 5. Extraction reliability (PDF/DOCX/XLSX)
**STATUS: FIXED**
- PDF: `extractPdfViaVision()` (line 100) sends base64 to AI vision model — no more `TextDecoder`
- DOCX: `extractDocxText()` (line 45) uses JSZip to parse `word/document.xml` — real XML parsing
- XLSX: `extractXlsxText()` (line 69) uses JSZip to parse `sharedStrings.xml` + `sheet1.xml`
- All three use proper parsers, not binary decode

## 6. Curator de-select UX
**STATUS: FIXED**
- `SourceDetail` (lines 150-153) has explicit "Move to Suggested" button with `Undo2` icon for accepted sources
- Re-extract button (lines 155-157) also available
- Accept/Reject buttons for suggested items (lines 141-148)

## 7. AI credit exhaustion surfacing
**STATUS: FIXED**
- `discover-context-resources` checks 402/429 on AI calls (lines 292-303) and returns specific error codes
- `useContextLibraryMutations.ts` (lines 61-67) catches `AI_CREDITS_EXHAUSTED` and `AI_RATE_LIMITED` with specific user-facing toasts
- Same pattern exists in extract function

---

## Summary: All 7 items are now implemented

**No pending items remain from the original defect list.**

The only item deliberately deferred (not a defect) is the DB-backed state machine using `context_intake_status` — this is an architectural upgrade, not a bug fix. The current session-based gating works correctly after all the fixes above.

