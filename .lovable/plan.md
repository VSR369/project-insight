

## Plan: Two surgical fixes — batch-exclude non-DB sections + same-tab Diagnostics refresh

Both fixes are low-risk, additive, and align with existing architecture. No DB changes, no new tables, no RLS work.

---

### Fix 1 — Exclude non-DB-column sections from AI batch calls

**Problem.** Sections without backing columns on `challenges` (`creator_references`, `reference_urls`, `legal_docs`, `escrow_funding`, `creator_legal_instructions`, `evaluation_config`, `organization_context`) get sent to the edge function with empty/missing content. The model returns malformed JSON for them, and the surrounding sub-batch (real DB-backed sections like `current_deficiencies`, `solution_type`) dies in the parser.

**Why prior `NO_DRAFT_SECTIONS` didn't cover this.** That list only blocks Pass 2 (`generate`). `ATTACHMENT_SECTIONS` re-enables Pass 1 (`review`) for `creator_references` + `reference_urls`. And `legal_docs`, `escrow_funding`, `evaluation_config`, `creator_legal_instructions`, `organization_context` aren't in either list.

**Implementation.**

1. `src/lib/cogniblend/waveConfig.ts` — add a single new constant:
   ```ts
   export const BATCH_EXCLUDE_SECTIONS: readonly SectionKey[] = [
     'creator_references', 'reference_urls',
     'legal_docs', 'escrow_funding',
     'creator_legal_instructions', 'evaluation_config',
     'organization_context',
   ];
   ```
   No changes to `NO_DRAFT_SECTIONS`, `ATTACHMENT_SECTIONS`, `SOLO_SECTIONS`, or wave membership. These sections still appear in waves and still display in the UI — they're just not sent to the LLM batch.

2. `src/services/cogniblend/waveBatchInvoker.ts` — partition `sectionActions` before the invoke:
   - Reviewable = `action !== 'skip' && !BATCH_EXCLUDE_SECTIONS.includes(sectionId)`
   - Excluded = `BATCH_EXCLUDE_SECTIONS.includes(sectionId)` → emit per-section outcome `{ status: 'skipped', reason: 'no_db_column' }` and DO NOT include in the edge function payload.
   - If `reviewable.length === 0`, short-circuit: skip the network call entirely and return only the skipped outcomes (prevents an empty-batch invocation).

3. `src/hooks/useWaveExecutor.ts` — when writing per-section results into the curation store and `wave-exec-*` localStorage record, treat `'skipped'` outcomes as a clean terminal status (not `error`, not `pending`). They show as "Skipped (no draft)" in Diagnostics.

**What stays unchanged.** Wave config, executor flow, principal-grade enforcement, store sync, autosave, telemetry. The edge function itself needs no edit — it just receives a smaller payload.

---

### Fix 2 — Make Diagnostics refresh in the same tab via custom events

**Problem.** `StorageEvent` only fires across tabs. The Diagnostics drawer subscribes to `storage` but `saveExecutionRecord` writes from the same tab, so `refreshKey` never bumps during a live run.

**Status check first.** A previous round already added `WAVE_EXEC_CHANGED_EVENT` dispatch in `waveExecutionHistory.ts` and listeners in `DiagnosticsSheet.tsx` / `CurationDiagnosticsPage.tsx` (per the prior diff). I will:

1. **Verify the event name + payload shape are wired end-to-end.** If the listener filters by `challengeId` but the dispatch detail omits it (or vice-versa), refresh silently no-ops. This is the most likely reason the user is still seeing stale data.
2. **Standardise the event name** to `wave-execution-updated` (per the user's spec) — alias the existing constant if needed for backward compatibility, or update both sides to one canonical string.
3. **Confirm dispatch sites cover all four mutation paths**: `saveExecutionRecord`, `saveAcceptanceRecord`, `clearAllExecutionRecords`, `clearPass2ExecutionRecord`. Any missing dispatch = stale panel.
4. **Confirm listeners always re-attach when `open` toggles** (StrictMode double-mount safe), and don't early-return before subscribing.

No new files. ~5–10 line touch-up in two files at most.

---

### Files touched

| File | Change |
|---|---|
| `src/lib/cogniblend/waveConfig.ts` | +1 exported constant |
| `src/services/cogniblend/waveBatchInvoker.ts` | partition + short-circuit empty batch |
| `src/hooks/useWaveExecutor.ts` | recognise `'skipped'` outcome (small) |
| `src/services/cogniblend/waveExecutionHistory.ts` | verify/align event name + ensure all 4 mutators dispatch |
| `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx` | confirm listener uses canonical event name |
| `src/pages/cogniblend/CurationDiagnosticsPage.tsx` | same |

No file expected to exceed 250 lines after the edit. No DB migration. No edge function redeploy required for Fix 1 (smaller payload is backward compatible) or Fix 2 (client-only).

---

### Verification

1. Open a draft with attachments + legal docs configured.
2. Click **Re-analyse**. Confirm waves containing `creator_references`, `legal_docs`, `escrow_funding`, etc. complete cleanly — those sections show "Skipped (no draft)", neighbours like `current_deficiencies`, `solution_type` show "Reviewed".
3. Keep Diagnostics open during the run. Confirm Pass 1 rows populate live wave-by-wave with no manual refresh.
4. Trigger Pass 2 and Accept-All. Confirm Suggestions and Acceptance panels also update live in the same tab.
5. Confirm Telemetry trend still shows historical runs.

### Rejected alternatives

- **Fixing the AI prompt to handle empty sections gracefully** — rejected: still wastes tokens, still risks malformed JSON, doesn't address the root architectural mismatch (these sections have no `challenges.*` column to serialise).
- **Per-section solo calls for each excluded section** — rejected: adds 7 extra LLM round-trips per wave with no quality gain; their content (attachments / legal / escrow) is reviewed by dedicated panels (Discovery wave, legal compliance UI, escrow UI), not by the section reviewer.
- **Polling Diagnostics on a timer** — rejected: wasteful re-renders, laggy UX vs event-driven refresh.

