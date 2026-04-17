

## Pass 2 Streamlining — Final Integrated Plan

### Validation of Claude's claims against actual code

| Claim | Verified? | Notes |
|---|---|---|
| No `max_tokens` set on Pass 1/Pass 2 → silent truncation | ✅ TRUE | `aiPass2.ts` body has no `max_tokens`; default ~8192 is exhausted by HIGH reasoning + structured JSON. **Single highest-impact fix.** |
| Truncated batch returns empty Map → all sections in batch lose suggestions | ✅ TRUE | `aiPass2.ts:341–353` |
| `callAIBatchTwoPass` swallows Pass 2 errors → marks success with null suggestion | ✅ TRUE | `aiCalls.ts:185–189` — returns Pass 1 results with `suggestion: null`; invoker treats as success |
| Action column shows raw `review`/`generate` in Pass 2 | ✅ TRUE | `DiagnosticsSuggestionsPanel.tsx:173` — Pass 1 fix wasn't ported here |
| Wave 12 (Harmonization) exists | ✅ TRUE | `aiHarmonizationPass.ts` exists, runs after Pass 2 |
| Wave 11 (QA) skipped in Pass 2 | ✅ TRUE & **intentional** — QA done in Pass 1 | UI just doesn't explain it |

### Why "many sections are skipped"
Three distinct causes — all need fixing:

1. **Silent truncation** (Claude #1) — biggest cause; whole sub-batch loses suggestions
2. **Swallowed Pass 2 errors** (Claude #2) — null suggestion masquerades as success
3. **Architecturally skipped sections** — `BATCH_EXCLUDE_SECTIONS` (creator_references, reference_urls, legal_docs, escrow_funding, organization_context) and `NO_DRAFT_SECTIONS` are correctly skipped but UI shows blank `—` with no reason

### Final integrated fix plan (5 surgical changes)

| # | File | Change | Source |
|---|---|---|---|
| **F1** | `supabase/functions/review-challenge-sections/aiPass2.ts` | Add `max_tokens: 16384` to request body. Implement **split-and-retry** when `finishReason === 'length'` AND batch > 1 (recursive halving). On single-section truncation OR JSON parse fail, return per-section failure marker `{ section_key, error_code: 'TRUNCATED'\|'MALFORMED' }` instead of empty Map. Log every input key returned without a suggestion as `MISSING`. | Claude #1 + my F1 |
| **F2** | `supabase/functions/review-challenge-sections/aiPass1.ts` | Add `max_tokens: 16384` to Pass 1 request body (defensive — prevents same truncation bug). | Claude #2 |
| **F3** | `supabase/functions/review-challenge-sections/aiCalls.ts` (`callAIBatchTwoPass`) + `src/services/cogniblend/waveBatchInvoker.ts` | Stop swallowing Pass 2 errors. Propagate `is_pass2_failure: true` + `errorCode` (`TRUNCATED`/`MALFORMED`/`MISSING`) per section to the execution record. Translate `BATCH_EXCLUDE`/`skip` outcomes into `skipped_reason` strings (`"Excluded — no DB column"`, `"Empty no-draft section"`) so UI can explain blanks. | Claude #3 + my F2 |
| **F4** | `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | (a) Action column: show **"Suggest"** uniformly during Pass 2 (per Claude — clearer than my "Refine/Draft New" split). (b) Add **Reason** column reading `errorCode`/`skipped_reason`. (c) Render Wave 11 row with explicit "Skipped — QA already done in Pass 1". (d) Render Wave 12 row with `crossSectionScore`, `issuesFound`, `appliedCount`, `droppedCount`. | Claude #4 + my F3 |
| **F5** | `src/hooks/useWaveExecutor.ts` (Wave 12 block) | Before Wave 12, count cluster sections with non-null suggestions; if any cluster section's Pass 2 failed, surface UI warning "Wave 12 running with N/M cluster suggestions (X failed — re-run those sections first)". After Wave 12, persist metrics into the execution record (currently only toasted). | My F4 — verifies Claude #5 |

### Reconciliation: my plan vs Claude's

- ✅ **Adopted from Claude**: `max_tokens: 16384` for Pass 1 + Pass 2 (was missing from my plan — this is the root cause of most missing suggestions)
- ✅ **Adopted from Claude**: uniform `"Suggest"` label in Pass 2 Action column (cleaner than my Refine/Draft split)
- ✅ **Kept from my plan**: split-and-retry on truncation, per-section error markers, Reason column, Wave 11/12 visibility, Wave 12 metrics persistence, BATCH_EXCLUDE reason surfacing
- ❌ Claude's plan didn't address: split-and-retry, BATCH_EXCLUDE blanks, Wave 11/12 UI gaps — kept all from my plan

### What is NOT changed
- ❌ Wave structure / numbering / SOLO_SECTIONS / MAX_BATCH_SIZE
- ❌ Pass 1 logic (already streamlined)
- ❌ Harmonization prompt or schema
- ❌ Accept All path
- ❌ Edge function timeouts / reasoning effort

### Architecture compliance
- R1: each touched file stays under 250 lines (split-and-retry as private helper in `aiPass2.ts`)
- R2: no DB calls in components; new fields flow via edge response → invoker → execution record
- R3: typed `Pass2SectionFailure { code: 'TRUNCATED'\|'MALFORMED'\|'MISSING'\|'EXCLUDED'\|'NO_DRAFT'; reason: string }` — no `any`
- R6: every blank in Suggestions panel now has a Reason
- R9: failures via `handleMutationError`/`logWarning` — no new `console.*` in client

### Verification

1. Re-run Pass 2 on a challenge that previously had blank suggestions for `submission_guidelines`, `phase_schedule`, `evaluation_criteria` → suggestions now generated (max_tokens fix).
2. Force a truncation on a 3-section batch → split-and-retry kicks in, all 3 sections get suggestions OR specific `TRUNCATED` reason.
3. Diagnostics Pass 2 panel: Action column shows **"Suggest"** for every non-skipped section; Reason column populated for every blank.
4. BATCH_EXCLUDE sections (e.g. `creator_references`) show "Excluded — no DB column" instead of `—`.
5. Wave 11 row appears with "Skipped — QA done in Pass 1".
6. Wave 12 row shows `crossSectionScore`, `issuesFound`, `appliedCount`, `droppedCount`.
7. Wave 12 emits warning if any cluster section's Pass 2 suggestion is missing.
8. No regression in Pass 1 diagnostics, Accept All, or Wave 12 application.

