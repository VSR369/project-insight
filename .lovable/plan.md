<final-text>Diagnosis

I went through the actual code path. The module is not “just cached in localStorage,” but it is behaving stale because several state and backend rules are fighting each other.

What is actually wrong

1. Digest is DB-backed, but it looks cached
- `useContextDigest()` reads from `challenge_context_digest`, not localStorage.
- The stale feeling comes from old digest rows remaining in DB and React Query cache during re-analyse.
- `handleAnalyse()` resets some UI flags, but it does not clear or stale-mark the existing digest row.

2. Context Library review gating is logically broken
- In `useCurationPageOrchestrator.ts`, closing the drawer marks `contextLibraryReviewed = true` even if the curator did not really review/confirm anything.
- A second effect auto-unlocks review whenever `pass1DoneSession` is true, including hydrated old analysis.
- This is why Generate can appear enabled from previous state.

3. “Confirm & Close” does not do what the label implies
- In `ContextLibraryDrawer.tsx`, `onConfirm={handleClose}`.
- In `DigestPanel.tsx`, the confirm button only closes the drawer.
- It does not explicitly mark digest as confirmed in backend, does not validate freshness, and does not trigger Pass 2.

4. Auto-select is fragile by design
- In `discover-context-resources/index.ts`, auto-accept only happens if:
  - score >= `0.85`
  - and `HEAD` accessibility check returns accessible
- Many sites return `403` to `HEAD` even when `GET` works, so relevant sources never auto-accept.
- The “forbidden/paywalled” enforcement is only a small hardcoded list, not a robust exclusion system.

5. Extraction is the biggest backend weakness
- `extract-attachment-text/index.ts` is decoding PDF/DOCX/XLSX binaries with `TextDecoder`, which is not reliable parsing.
- JS-heavy URLs fall back to metadata-only.
- This directly explains missing summary, full text, and key data for many accepted URLs/PDFs.

6. Curator de-select exists, but UX is too weak
- Accepted items can be moved back only through a small hover `X` in `SourceList`.
- `SourceDetail` does not expose a clear “Move back to suggested / Reject” action for accepted items.
- So the capability exists, but it is effectively hidden.

7. AI credit exhaustion is not clearly surfaced
- `generate-context-digest` handles `402` explicitly.
- Discovery and extraction do not clearly surface credit exhaustion the same way.
- So yes, exhausted credits are possible, but the current UX would hide that behind generic failure/no-result behavior.

Implementation plan

1. Replace session-based gating with a DB-backed workflow
- Use the existing `context_intake_status` field as the source of truth.
- States:
  - `not_started`
  - `analysed`
  - `reviewing`
  - `confirmed`
  - `generating`
  - `generated`
- Stop using drawer close / hydrated pass1 state as proof of review.

2. Fix re-analyse so it truly starts fresh
- On Analyse:
  - reset pass-1 UI state
  - reset generate completion state
  - clear stale AI reviews
  - clear Context Library reviewed/confirmed state
  - invalidate digest/source queries
  - mark existing digest stale or remove it
- Preserve manual sources, but invalidate all AI-discovered context from the previous run unless explicitly retained.

3. Make Confirm & Close the real handoff step
- Change `Confirm & Close` from “close dialog only” to:
  - validate accepted/extracted source set
  - regenerate digest if stale
  - persist `context_intake_status = confirmed`
  - then either:
    - enable Generate Suggestions, or
    - directly trigger Pass 2 (matching your requested behavior)
- If automatic Pass 2 is desired, this becomes a true chained workflow.

4. Fix auto-accept and forbidden-site handling
- Replace `HEAD`-only accessibility check with:
  - `HEAD`
  - then fallback `GET` when `403/405` occurs
- Add a real forbidden-domain exclusion layer before scoring/inserting.
- Record exact access reason per URL: `forbidden`, `paywall`, `head_403_get_ok`, `blocked`, `failed`.

5. Rebuild extraction reliability
- URLs:
  - use rendered extraction for JS-heavy pages
  - keep metadata-only as last fallback, not normal success
- PDFs:
  - use proper PDF text extraction
  - OCR fallback for scanned PDFs
- DOCX/XLSX:
  - use real parsers instead of binary decode
- Keep `extraction_status` honest: `completed`, `partial`, `failed` with visible reason.

6. Make digest provenance explicit
- Show:
  - how many accepted sources were used
  - how many had real extracted content
  - when the digest was generated
  - whether it is stale
- Add visible source chips/list behind the digest so the curator knows its basis.
- Mark digest stale whenever accepted sources change or re-analyse runs.

7. Improve curator controls
- Add explicit accepted-source actions in `SourceDetail`:
  - Move back to Suggested
  - Reject
  - Re-extract
- Keep list controls, but do not rely on hover-only affordances.

8. Add diagnostics so failures are explainable
- Surface separate error states for:
  - AI credits exhausted (`402`)
  - rate limits (`429`)
  - blocked URL / `403`
  - parser failure
  - no extractable content
- Add richer toast + inline status messages from discovery, extraction, and digest generation.

Files to update

Frontend
- `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
- `src/hooks/cogniblend/useCurationAIActions.ts`
- `src/components/cogniblend/curation/ContextLibraryDrawer.tsx`
- `src/components/cogniblend/curation/context-library/DigestPanel.tsx`
- `src/components/cogniblend/curation/context-library/SourceDetail.tsx`
- `src/components/cogniblend/curation/context-library/SourceList.tsx`
- `src/hooks/cogniblend/useContextLibraryMutations.ts`
- `src/hooks/cogniblend/useContextLibraryQueries.ts`

Edge functions
- `supabase/functions/discover-context-resources/index.ts`
- `supabase/functions/extract-attachment-text/index.ts`
- `supabase/functions/generate-context-digest/index.ts`

Lovable-aligned technical approach

- Reuse existing query/mutation hooks instead of adding component-level Supabase calls.
- Reuse the existing `useIntakeStatus()` path instead of session-only gating.
- Keep changes split across hooks/components/functions to stay within the project’s R1/R2 structure.
- Preserve the current two-pass architecture, but make the handoff explicit and deterministic.

Expected result

After this fix set:
- Re-analyse will truly reset stale context state
- Auto-accept will work for genuinely reachable sources
- Forbidden sites will be excluded before they pollute the library
- Curators will be able to clearly unaccept/deselect sources
- Digest basis will be transparent
- Confirm & Close will become the real bridge into Pass 2
- AI credit exhaustion and extraction failures will be visible instead of mysterious</final-text>