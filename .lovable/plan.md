

## Plan: Surgical Memory Fix for `review-challenge-sections` (No Architectural Change)

### Context
The 546 `WORKER_RESOURCE_LIMIT` error is caused by 50-60K-token prompts being built per sub-batch and held in memory across consecutive batches in the same wave. Logs confirm: `prompt_tokens: 53,536` for a 2-section batch. Background processing (`EdgeRuntime.waitUntil`) is the wrong fix — it would require a 15-file refactor and break the synchronous principal-grade scoring contract.

### Three targeted edits — all in `supabase/functions/review-challenge-sections/index.ts`

**Edit 1 — Truncate attachment bodies in per-batch prompt (lines ~1014-1047)**
- Keep `ref.summary` + `ref.keyData` in full (these are the distilled signal).
- Truncate `ref.content` to first 2000 chars + "...[truncated for context window]" suffix.
- Net saving: ~30-50% of attachment block size.

**Edit 2 — Deduplicate context digest across sub-batches (lines ~1007-1010)**
- Track `digestInjectedForWave` flag scoped to the `batches` loop.
- First sub-batch: inject full `contextDigestText`.
- Subsequent sub-batches in same wave: inject a 1500-char header summary only.
- The system prompt (`contextIntel`) already carries the verified intelligence anchor, so per-batch digest repetition is redundant.

**Edit 3 — Release prompt memory between sub-batches (after line ~1180)**
- After `allNewSections.push(...batchResults)`:
  ```ts
  // Release large per-batch strings to let the runtime reclaim memory
  // before constructing the next batch's prompt.
  userPrompt = '';
  systemPrompt = '';
  batchResults = [];
  await new Promise(resolve => setTimeout(resolve, 0));
  ```
- The `setTimeout(0)` yields to the event loop, giving the V8 GC a chance to run between batches.

### What is preserved (zero functional change)
- Principal-grade scoring runs synchronously per batch (compliance % still telemetered).
- Pass 1 → Pass 2 → QA wave handoff stays synchronous.
- Diagnostics panel still updates in real time.
- All grounding sources (digest, attachments, corrections, examples) still injected.
- Cross-section dependency logic (FIX 1) untouched.
- `MAX_BATCH_SIZE = 3` and `SOLO_SECTIONS` rules untouched.

### Verification (after deploy)
1. Re-analyse the same draft (`25ca71a0-...`) end-to-end → confirm no 546 error.
2. Check edge logs: `prompt_tokens` should drop from ~53K to ~30-35K per batch on multi-batch waves.
3. Confirm `ai_principal_artifact_coverage` telemetry still shows `compliance_pct: 100`.
4. Confirm Wave 6 (SOLO sections, multi sub-batch) completes without batch failures.
5. Confirm Pass 2 suggestions still ground in attachments (spot-check one suggestion against attachment summary).

### Files Touched
- `supabase/functions/review-challenge-sections/index.ts` — ~25 lines changed across 3 sites.

### Deployment
Auto-deploy via Lovable's edge function pipeline; no migration, no client changes, no new tables.

### Rejected alternatives
- **`EdgeRuntime.waitUntil` background jobs** — rejected: requires polling table, RLS, 15-file client refactor, breaks synchronous principal-grade gating, 2-3 day effort with high regression risk.
- **Reducing `MAX_BATCH_SIZE` to 1** — rejected: doubles wave latency and increases LLM API costs; doesn't fix the per-batch prompt size issue.
- **Removing context digest injection** — rejected: would compromise grounding quality and violate the Context Intelligence Architecture rule (`mem://cogniblend/ai/context-intelligence-architecture`).

