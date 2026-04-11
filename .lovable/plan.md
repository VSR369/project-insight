

## Fix All 7 Context Intelligence Bugs

### Summary
Seven bugs in the Context Intelligence pipeline are degrading curator workflow quality. Fixes span 2 edge functions, 1 hook file, 2 UI components, and 1 drawer orchestrator.

---

### Bug 1 — Discovery blind to Pass 1 review comments (CRITICAL)

**File:** `supabase/functions/discover-context-resources/index.ts`

- Add `ai_section_reviews` and `extended_brief` to the challenge SELECT query (line 49)
- Extract actionable comments (error/warning/suggestion) from `ai_section_reviews` into a gap map
- Add `{{specificGaps}}` and `{{problemStatement}}` to `variableMap`
- Rewrite `systemPrompt` (line 227) to include the gap map and instruct the AI to target specific gaps rather than generic domain queries
- Add `addresses_gap` field to the insert block's `relevance_explanation`
- Increase max suggestions from 25 to 30

---

### Bug 2 — File upload UI missing (CRITICAL)

**File:** `src/components/cogniblend/curation/ContextLibraryDrawer.tsx`

- Import and wire `useUploadContextFile` hook (already exists in `useContextLibrary.ts`)
- Add an "Upload File" button next to the existing "Add URL" button in the header toolbar
- Add a hidden `<input type="file">` with accepted formats (PDF, DOCX, XLSX, CSV, TXT, MD, images)
- Add a section selector for the uploaded file (reuse existing `SECTION_LABELS` select pattern)
- Handle the upload mutation with toast feedback

---

### Bug 3 — URL extraction fires-and-forgets, digest regenerates too early

**File:** `src/hooks/cogniblend/useContextLibrary.ts` — `useAddContextUrl` (line 303)

- Replace the fire-and-forget extraction + 5s setTimeout digest pattern
- Instead: call extraction, `await` it, then call digest generation only after extraction completes
- If extraction fails, still regenerate digest (graceful degradation) but log a warning toast
- Move logic into `mutationFn` so it's properly awaited

---

### Bug 4 — Digest upsert resets curator edits

**File:** `supabase/functions/generate-context-digest/index.ts` (line 179)

- Before upserting, check if `curator_edited = true` on the existing digest
- If curator has edited: preserve `original_digest_text` (set to new AI text), keep `curator_edited = true`, and do NOT overwrite `digest_text`. Instead store the new AI version in `original_digest_text` so curator can compare
- Alternative simpler approach: always set `original_digest_text` to the new AI text, but only overwrite `digest_text` if `curator_edited` is false. This way the curator's version is preserved and they can "Restore AI original" to see the latest AI version

---

### Bug 5 — DigestPanel is a basic textarea

**File:** `src/components/cogniblend/curation/context-library/DigestPanel.tsx`

- Add word count indicator below the textarea (target: ~600 words, show warning if significantly over/under)
- Add character count
- Keep the existing textarea approach (a full markdown editor would exceed scope), but improve with visual feedback

---

### Bug 6 — Discovery directives are generic templates

**File:** `supabase/functions/discover-context-resources/index.ts`

This is largely addressed by Bug 1 fix — the gap-driven prompt replaces generic templates with challenge-specific context. Additionally:
- Strip HTML from `problem_statement` and `scope` before inserting into prompt (substring to 500 chars)
- Include `solution_type` and `maturity_level` in the prompt context

---

### Bug 7 — Suggested sources have no inline accept/reject

**File:** `src/components/cogniblend/curation/context-library/SuggestionCard.tsx`

- Add inline Accept/Reject icon buttons directly on each SuggestionCard (small icon buttons, no text)
- Pass `onAccept` and `onReject` callbacks from SourceList through to SuggestionCard
- This allows single-card accept/reject without needing to click into SourceDetail

**File:** `src/components/cogniblend/curation/context-library/SourceList.tsx`

- Accept new `onAcceptOne` and `onRejectOne` props
- Forward them to each SuggestionCard

**File:** `src/components/cogniblend/curation/ContextLibraryDrawer.tsx`

- Pass `acceptOne` and `rejectOne` mutations to SourceList

---

### Files Changed

| File | Bugs Fixed |
|------|-----------|
| `supabase/functions/discover-context-resources/index.ts` | 1, 6 |
| `supabase/functions/generate-context-digest/index.ts` | 4 |
| `src/hooks/cogniblend/useContextLibrary.ts` | 3 |
| `src/components/cogniblend/curation/ContextLibraryDrawer.tsx` | 2, 7 |
| `src/components/cogniblend/curation/context-library/DigestPanel.tsx` | 5 |
| `src/components/cogniblend/curation/context-library/SuggestionCard.tsx` | 7 |
| `src/components/cogniblend/curation/context-library/SourceList.tsx` | 7 |

### Deployment
Both edge functions (`discover-context-resources`, `generate-context-digest`) will be redeployed after changes.

