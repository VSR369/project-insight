<final-text>Final confirmation

- Yes: the old full-wave path should be removed from the global Analyse/Generate flow.
- No: `review-challenge-sections` should not be deleted entirely; it should remain only for single-section review/re-review. That matches the existing project rules.
- I checked the current code. The main PreFlight/Analyse buttons already no longer call the old path. But legacy wave infrastructure still exists underneath and is still used for stale re-review, so the old combined-pass behavior is not fully gone.

What is still failing now

1. Pass 1 is not a true end-to-end pipeline yet.
   - `runAnalyseFlow()` calls `analyse-challenge`, then `discover-context-resources`, then stops.
   - It does not wait for auto-accepted source extraction.
   - It does not build the digest before handing off to Pass 2.

2. Discovery still allows bad sources through.
   - In `discover-context-resources`, if fewer than 8 accessible URLs exist, it falls back to all non-paywalled results.
   - That still allows `blocked` and `failed` URLs into the saved list.
   - So inaccessible links are not truly forbidden today.

3. Auto-accepted extraction is still fire-and-forget.
   - Discovery inserts accepted sources and then triggers `extract-attachment-text` in the background.
   - So digest often runs while sources are still `pending`, `seed`, or only partially extracted.

4. The digest consumer is weaker than the digest producer.
   - `generate-context-digest` creates `digest_text`, `key_facts`, and `raw_context_block`.
   - But `_shared/buildUnifiedContext.ts` only passes `digest_text` into `generate-suggestions`.
   - So Pass 2 is not grounded on the full extracted corpus.

5. Generate Suggestions is currently too permissive for your target workflow.
   - It now treats digest as optional.
   - That was a temporary unblocker, but it is not the architecture you want.
   - If digest must be the key input, Pass 2 must require a completed, confirmed digest.

6. One legacy layer is still risky.
   - `useCurationAIActions` still receives old wave executor props.
   - `useCurationWaveSetup` still builds a full executor, and `reReviewStale` still uses combined-pass logic.
   - That keeps regression risk alive.

One final solution

1. Make one canonical Pass 1 pipeline
   - Use a single orchestrator for:
     `analyse -> discover -> extract accepted sources -> build digest -> open Context Library`
   - The existing `curation-intelligence` function is the right base, but it must be fixed and become the only global Pass 1 entrypoint.

2. Remove old global wave behavior completely
   - Keep `review-challenge-sections` only for per-section review/re-review.
   - Remove old wave executor props from `useCurationAIActions`.
   - Change stale re-review to review-only behavior, not combined pass/generate behavior.

3. Make discovery strict
   - In `discover-context-resources`, only persist `accessible` sources.
   - Do not insert `blocked`, `failed`, or `paywall` results at all.
   - Return filtered counts so the UI can explain what was discarded.

4. Make extraction deterministic
   - Discovery should return auto-accepted attachment IDs.
   - The orchestrator must await extraction completion for those IDs before digest generation.
   - Manual accept/add URL/add file already waits; auto-accept must behave the same way.

5. Make digest truly high-signal
   - Build digest only from accepted sources with real extracted content.
   - Use each source’s `full_text + extracted_summary + extracted_key_data`.
   - Preserve citations/source structure and rebuild `raw_context_block` from the accepted extracted set.
   - If there are zero valid extracted sources, fail with a precise reason instead of producing generic digest text.

6. Make Pass 2 digest-grounded by design
   - Update `_shared/buildUnifiedContext.ts` to expose:
     `digest_text`, `original_digest_text`, `curator_edited`, `key_facts`, `raw_context_block`
   - Update `generate-suggestions` to consume the full digest context, not just `digest_text`.
   - Require confirmed digest before Pass 2 runs.

7. Tighten the UI handoff
   - Progress should be:
     `Analyzing... -> Discovering sources... -> Extracting accepted sources... -> Building digest... -> Complete`
   - `Generate Suggestions` stays disabled until digest is generated and confirmed.
   - `DigestPanel` should not allow digest generation when `extractedCount === 0`.
   - Show discarded counts for blocked/paywalled/failed URLs.

Files to change

- `src/hooks/cogniblend/useCurationAIActions.ts`
- `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
- `src/hooks/cogniblend/useCurationWaveSetup.ts`
- `src/hooks/useWaveExecutor.ts`
- `src/components/cogniblend/curation/CurationRightRail.tsx`
- `src/components/cogniblend/curation/context-library/DigestPanel.tsx`
- `supabase/functions/curation-intelligence/index.ts`
- `supabase/functions/discover-context-resources/index.ts`
- `supabase/functions/generate-context-digest/index.ts`
- `supabase/functions/_shared/buildUnifiedContext.ts`
- `supabase/functions/generate-suggestions/index.ts`

Bottom line

This is not failing because the prompts are impossible. It is failing because the pipeline is still split into loosely coupled async steps. That causes weak inputs, incomplete extraction, and a digest that Pass 2 barely uses.

The correct fix is:
remove the legacy global wave path, keep only per-section legacy review, and convert Pass 1 into one deterministic pipeline that finishes with a real digest before Pass 2 is allowed.</final-text>