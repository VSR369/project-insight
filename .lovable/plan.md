

## Root Cause Analysis — Wave Pass-2 Failures (Increased After Recent Fixes)

### What the logs prove

From `review-challenge-sections` logs at the time of the failures:

| Wave / call | prompt_tokens | completion_tokens | Outcome |
|---|---|---|---|
| Pass 2 `evaluation_criteria` (solo) | 40,377 | **31,458** | **TRUNCATED** (`finish_reason: length`, hits 32,768 cap) |
| Pass 2 `success_metrics_kpis` (solo) | 40,741 | 2,362 | OK |
| Pass 2 `solver_expertise` (solo) | 40,492 | 3,072 | OK |
| Pass 2 `deliverables` (solo) | 41,099 | 2,417 | OK |
| Pass 2 `reward_structure` (solo) | 40,200 | 2,337 | OK |
| Pass 2 `current_deficiencies + preferred_approach + solution_type` (3-batch) | 44,978 | 2,361 | OK |
| Pass 2 `expected_outcomes + root_causes + affected_stakeholders` (3-batch) | 46,281 | 3,143 | OK |
| Pass 2 `maturity_level + data_resources + domain_tags` (3-batch) | 44,026 | 1,440 | OK |
| Pass 2 `ip_model + hook + visibility` (3-batch) | 43,265 | 944 | OK |
| Harmonization wave (Wave 12) | 5,621 | 6,801 | OK |

### The three real root causes

**RC-1 — Fixed PASS2_MAX_TOKENS = 32,768 is too low for solo-rendered, structured sections.**
`evaluation_criteria` alone produced 31,458 completion tokens and was 1 token away from the cap → truncated. `reward_structure`, `deliverables`, `solver_expertise` are also in `SOLO_SECTIONS` and are large structured outputs that can hit the same wall on richer challenges. Truncation marks the section as `is_pass2_failure: true` → diagnostics shows it as **FAILED** even though Pass 1 succeeded.

**RC-2 — Repair function fan-out re-truncates the same sections.**
`repair-malformed-sections` enqueues N background `review-challenge-sections` calls with `wave_action: 'review_and_generate'` (full Pass 1 + Pass 2). Each call runs solo on a single large section → hits the same 32K cap → re-marked FAILED. This is why the failure count **increased**: every repair attempt on `evaluation_criteria` / `reward_structure` adds a new failure row instead of fixing the old one.

**RC-3 — Background fan-out also competes for the 2 s CPU budget per worker.**
The recent fix wrapped the loop in `EdgeRuntime.waitUntil()` but kept it sequential inside one worker. Six heavy AI calls inside the same background task can still trip `WORKER_RESOURCE_LIMIT` (HTTP 546) because the upstream AI gateway response bodies are large JSON blobs whose synchronous JSON.parse counts against the worker's CPU budget. Logs show `546` patterns historically tied to these long-tail calls.

### Why "errors increased" is structural, not random

| Trigger | Effect |
|---|---|
| Re-analyse | Solo sections may truncate → 1–3 new failures |
| Repair button (current) | Re-runs the **same** solo sections → **adds** failures instead of healing them |
| Harmonization (Wave 12) | Reads `aiSuggestion`; sections marked failed are skipped → more "missing" entries on the diagnostics grid |

The diagnostics grid counts every failed Pass-2 outcome individually, so each repair pass compounds the visible count.

### Permanent fix plan (3 changes, ~80 lines, no schema)

**Fix 1 — Raise + dynamically size Pass 2 token cap (`supabase/functions/review-challenge-sections/aiPass2.ts`)**
- Change `PASS2_MAX_TOKENS` from `32768` → `48000` (model supports it).
- Compute per-call cap: `min(48000, 8000 * inputKeys.length + 16000)` — gives solo structured sections enough headroom while keeping multi-section calls bounded.
- Add `early_split` heuristic: if a section is in a new `LARGE_OUTPUT_SECTIONS` set (`evaluation_criteria`, `reward_structure`, `deliverables`, `phase_schedule`, `solver_expertise`, `submission_guidelines`) AND `originalContent.length > 4000`, request `reasoning_effort: 'medium'` instead of `'high'` to reduce verbose chains-of-thought that bloat output.

**Fix 2 — Make repair idempotent and surgical (`supabase/functions/repair-malformed-sections/index.ts`)**
- Pass `wave_action: 'review'` + `pass1_only: false` + `provided_comments: []` so the AI runs only Pass 2 with a slim system prompt (cuts ~40K input tokens to ~12K, freeing the output budget).
- Detect already-clean sections at the start of the background task and **skip** them, so a second click on Repair never re-adds failures for sections that previously succeeded.
- Tighten `MAX_PER_RUN` from 6 → 3 and add 1.5 s spacing between calls — eliminates the WORKER_RESOURCE_LIMIT margin.

**Fix 3 — Stop counting Pass 2 truncations as "errors" in the diagnostics grid (`src/services/cogniblend/waveExecutionHistory.ts` + `DiagnosticsSuggestionsPanel.tsx`)**
- Distinguish three Pass-2 outcomes: `success` / `truncated_recoverable` / `failed`.
- `truncated_recoverable` (TRUNCATED + section is solo-large) renders as **"Retry-needed"** (amber, with one-click retry button) instead of **"Failed"** (red).
- Add `getFailedRecoverable(sections)` helper so the "Repair" button only sends the truly recoverable subset, not every red row.

### What is explicitly out of scope

- ❌ No DB schema, RLS, or migration changes.
- ❌ No model swap — `google/gemini-3-flash-preview-20251217` stays.
- ❌ No new edge function — only existing `aiPass2.ts` and `repair-malformed-sections/index.ts` are touched.
- ❌ No change to the `useWaveExecutor` orchestration or wave count (still 11 + harmonize).

### Expected outcome after these three fixes

| Symptom | Today | After fix |
|---|---|---|
| `evaluation_criteria` truncating at 31,458 tokens | Fails | Succeeds (cap = 48K) |
| Solo large sections (reward, deliverables) | At-risk | Safe |
| Repair button on already-fixed sections | Adds new failures | No-ops |
| Diagnostics red count after Repair | Grows | Decreases monotonically |
| Worker resource limit (HTTP 546) on repair | Occasional | Eliminated by 3-section + 1.5 s spacing |

### Validation

- Re-run the existing `passResilience_test.ts` suite (proves split-retry still works).
- Add 1 test: `Pass 2 with 1 large solo section completes within 48K cap` (mocked LLM).
- Manual: re-Analyse the uploaded challenge → expect 0 red rows in Suggestions panel; click Repair → expect "No malformed sections detected".

