

# Corrected Gap Analysis & Implementation Plan

## Claude's Feedback is Factually Incorrect

Every "NOT DONE" claim in the feedback is **wrong**. I verified each against the actual codebase:

- **Phase 0**: DONE. `DEFAULT_PLATFORM_PREAMBLE` says "Principal Consultant at a Big 4 firm". `ai_review_level` column exists (migration `20260416091831`). `buildConfiguredBatchPrompt` deleted. Pass 2 imports `DEFAULT_PLATFORM_PREAMBLE`.
- **Phase 1**: DONE. `reasoning_effort` column added and wired. `confidence`/`evidence_basis` in Pass 1 schema. Self-critique block (`PRINCIPAL_SELF_CRITIQUE`) appended.
- **Phase 2**: DONE. `aiConsistencyPass.ts` and `aiAmbiguityPass.ts` exist and are called from `index.ts`.
- **Phase 3**: DONE. `curator_corrections` table, `embed-curator-corrections`, `extract-correction-patterns` (with activation gating, dedup, correction_class), `fetchHardCorrections`, `SupervisorLearningPage` — all exist.
- **Phase 5**: DONE. `challenge_quality_telemetry` table, telemetry insert in `index.ts`, `QualityTelemetryPage` with dashboard — all exist.

**No action needed for Prompts 1-13. They are implemented.**

---

## Genuine Remaining Gaps (not covered by any prompt yet)

These are the items from the master plan that have NOT been implemented:

### Gap 1: Dedicated Consistency/Ambiguity Findings Tables + UI Panels
- Consistency/ambiguity passes run inline and merge findings into section comments
- Missing: `challenge_consistency_findings` and `challenge_ambiguity_findings` tables
- Missing: `ConsistencyFindingsPanel` and `AmbiguityFindingsPanel` with accept/dismiss buttons
- Missing: "Quality Score" summary at top of diagnostics

### Gap 2: PII Scanning & Redaction
- No PII regex scanning before corpus storage
- No symmetric redaction with `[REDACTED_EMAIL]`/`[REDACTED_PHONE]` placeholders

### Gap 3: Supervisor Rule Management Enhancements
- Current UI is read-only (stats + table + pipeline triggers)
- Missing: inline rule text editing, merge-duplicates, manual confidence promote/override
- Missing: correction rate trend chart

### Gap 4: Framework Library (Phase 4)
- No `ai_review_frameworks` table
- No `buildFrameworkLibraryBlock` retrieval function
- No framework seed data (80-120 entries)

### Gap 5: Watch-Items Not Yet Addressed
- `IMPORTANCE_TO_LEVEL` usage audit not performed
- No tunable `similarity_threshold` in global config
- No dynamic model context budget (hardcoded 24K chars)
- No baseline measurement captured

---

## Recommended Implementation Order

### Prompt 14 — Supervisor Learning UI Enhancements (~1 day)
- Add inline rule editing (edit `learning_rule` text)
- Add manual confidence promote button (supervisor override for sub-threshold rules)
- Add merge-duplicate rules function
- Add correction rate trend chart (weekly edit magnitude trend)

### Prompt 15 — Consistency/Ambiguity Findings Tables + UI (~2 days)
- Create `challenge_consistency_findings` and `challenge_ambiguity_findings` tables
- Wire existing inline passes to persist findings to these tables
- Build `ConsistencyFindingsPanel` and `AmbiguityFindingsPanel` with accept/dismiss
- Add "Quality Score" summary to diagnostics header

### Prompt 16 — PII Scanning & Corpus Hygiene (~1 day)
- Add deterministic PII regex in `persistCuratorCorrections` (emails, phones)
- Symmetric redaction in both `ai_content` and `curator_content`
- Add `similarity_threshold` config to `ai_review_global_config`

### Prompt 17 — Framework Library Infrastructure (~2-3 days engineering + content)
- Create `ai_review_frameworks` table with pgvector embedding column
- Build `buildFrameworkLibraryBlock` in `industryGeoPrompt.ts`
- Seed framework entries (content to be provided separately)

**Which of these prompts (14-17) should I implement first?**

