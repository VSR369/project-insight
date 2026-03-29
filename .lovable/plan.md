

# Phase 7 Gap Analysis: Completeness, Consistency & Correctness Review

## Summary

After cross-referencing the attached spec (Phases 2-7) with the implemented codebase, Phase 7 is **largely complete** but has several gaps ranging from minor naming inconsistencies to missing seed data and a few structural omissions.

---

## GAP 1: Completeness Checks — No Seed Data in Migration (CRITICAL)

**Issue**: The migration `20260329090343` creates the `completeness_checks` table and adds columns to `challenges`, but does **not seed the 10 default check rows**. The spec requires 10 pre-populated checks (Target user, Measurable success criteria, Technology constraints, etc.).

**Impact**: The `useCompletenessCheckDefs()` query returns empty → the card renders with no items → the feature is non-functional.

**Fix**: Insert the 10 default rows via a migration or seed SQL matching the spec's `DEFAULT_COMPLETENESS_CHECKS` array.

---

## GAP 2: Section Key Mismatch — `complexity_assessment` vs `complexity` (WARNING)

**Issue**: The spec's dependency map and completeness checks reference `complexity_assessment`, but the codebase uses `complexity` as the canonical key (see `sectionDependencies.ts` line 7 comment). The completeness check seed data for "Integration requirements" references `complexity_assessment` in its `checkSections` array, but this key doesn't exist in `SECTION_FORMAT_CONFIG`.

**Affected checks**: Concepts 5 ("Integration requirements") and 8 ("Budget/reward rationale") reference `complexity_assessment`. Same for `legal_documents` vs `legal_docs`.

**Fix**: When seeding, map spec keys to codebase keys: `complexity_assessment` → `complexity`, `legal_documents` → `legal_docs`, `challenge_hook` → `hook`.

---

## GAP 3: New Sections Missing from `ai_review_section_config` Seed (MEDIUM)

**Issue**: The plan says "Seed AI prompt configs for the 2 new sections" (Step 9), but we need to verify the migration actually inserted rows for `data_resources_provided` and `success_metrics_kpis` into `ai_review_section_config`. The Phase 6 seeding covered 24 sections — these 2 new sections would be 25 and 26.

**Impact**: Without prompt configs, AI review of these sections uses fallback/generic prompts with no quality criteria.

**Fix**: Insert 2 new rows into `ai_review_section_config` with the quality criteria from the spec (COMPLETENESS, ACCESS CLARITY, FORMAT SPECIFICITY for Data & Resources; QUANTITATIVE, OUTCOME ALIGNMENT, EVALUATION ALIGNMENT, BASELINE REALITY for Success Metrics).

---

## GAP 4: Wave Config Comment Says "24 sections" but Now Has 26 (MINOR)

**Issue**: `waveConfig.ts` line 4 says "6 dependency-ordered waves covering all 24 curation sections" but now covers 26 sections after adding `data_resources_provided` and `success_metrics_kpis`.

**Fix**: Update comment to say "26 curation sections".

---

## GAP 5: Completeness Check `checkSections` — Spec vs Codebase Key Alignment (MEDIUM)

**Issue**: The spec's completeness check #4 ("Data availability") has `checkSections: ['scope', 'deliverables', 'submission_guidelines']` — this is fine. But check #9 ("IP clarity") references `['ip_model', 'legal_documents']` while the codebase key is `legal_docs`. If these were seeded literally from the spec, the engine won't find content for `legal_documents`.

**Fix**: Ensure all seeded `check_sections` JSONB arrays use the canonical codebase keys from `SECTION_FORMAT_CONFIG`.

---

## GAP 6: `extended_brief` Section in Formats Config but NOT in Waves or Groups (MINOR)

**Issue**: `extended_brief` exists in `SECTION_FORMAT_CONFIG` and `SECTION_DB_FIELD_MAP` but is not assigned to any wave in `EXECUTION_WAVES` and not in any tab group. This is likely intentional (it's a container for subsections), but worth confirming it doesn't cause issues with the completeness check engine iterating over `SECTION_KEYS`.

**Impact**: Low — the engine will check it but find no completeness checks reference it.

---

## GAP 7: `data_resources_provided` Dependency — Spec Says Depends on `scope` AND `deliverables`, But Only `scope` Lists It as Downstream (MINOR)

**Issue**: In `sectionDependencies.ts`, `data_resources_provided` is listed as a downstream of `scope` (line 17) but NOT of `deliverables` (line 22). The spec says it depends on both.

**Fix**: Add `data_resources_provided` to the `deliverables` dependency array.

---

## GAP 8: `success_metrics_kpis` Tab Placement (VERIFY)

**Issue**: Spec says "Tab 1 (Problem Definition), position 5 (after Expected Outcomes)". The implementation adds it at the end of the `problem_definition` group. The current group is: `["context_and_background", "problem_statement", "scope", "expected_outcomes", "success_metrics_kpis"]`. This matches the spec.

**Status**: ✅ Correct.

---

## GAP 9: `data_resources_provided` Tab Placement (VERIFY)

**Issue**: Spec says "Tab 3 (Scope & Complexity), position 2 (after Deliverables, before Maturity Level)". The implementation has: `["deliverables", "data_resources_provided", "maturity_level", "complexity"]`. 

**Status**: ✅ Correct.

---

## GAP 10: Auto-Trigger After Global AI Review — Potential Race Condition (LOW)

**Issue**: The completeness check auto-triggers when `waveProgress?.overallStatus === 'completed'`. However, at that point the curation store may not yet have the freshly generated content synced from the DB. The check runs against store data, which could still show pre-wave content.

**Impact**: The first auto-run might show inaccurate results. The user can re-run manually.

**Fix**: Add a small delay or ensure the store is hydrated from the wave results before running the check.

---

## CONSISTENCY CROSS-CHECK: Spec vs Implementation

| Spec Requirement | Status |
|---|---|
| `completeness_checks` table created with RLS | ✅ |
| 10 default checks seeded | ❌ Missing |
| `data_resources_provided` column on challenges | ✅ |
| `success_metrics_kpis` column on challenges | ✅ |
| Completeness engine (`completenessCheck.ts`) | ✅ |
| React Query hook (`useCompletenessChecks.ts`) | ✅ |
| Sidebar card (`CompletenessChecklistCard.tsx`) | ✅ |
| Card placed in right rail | ✅ |
| Progress bar + pass/fail icons | ✅ |
| Remediation hint on hover | ✅ |
| Click failed item → navigate to section | ✅ |
| Auto-trigger after Global AI Review | ✅ (with race condition risk) |
| New sections in `curationSectionFormats.ts` | ✅ |
| New sections in `sectionDependencies.ts` | ✅ (partial — Gap 7) |
| New sections in `waveConfig.ts` | ✅ |
| New sections in `SECTION_DB_FIELD_MAP` | ✅ |
| New sections in GROUPS/tabs | ✅ |
| New sections in SECTIONS array with renderers | ✅ |
| AI prompt configs seeded for new sections | ❓ Needs verification |

---

## Recommended Fix Priority

1. **Seed 10 completeness checks** (Gap 1) — Feature is broken without this
2. **Fix section key mapping** (Gaps 2, 5) — Ensure canonical keys used in seed data
3. **Seed AI configs for 2 new sections** (Gap 3) — AI review quality
4. **Add `data_resources_provided` to deliverables dependencies** (Gap 7)
5. **Update wave config comment** (Gap 4)
6. **Address auto-trigger timing** (Gap 10) — Low priority

