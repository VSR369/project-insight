

# Phase 10 Gap Analysis

I reviewed every file created/modified against the spec document. Here are the gaps found:

---

## Gap 1: Dynamic Example Injection into AI Prompts (Prompt 10.6 Part 3) -- NOT DONE

The spec requires `assemblePrompt.ts` to fetch and inject up to 2 dynamic examples from `section_example_library` matched by domain + maturity. Currently `harvestExamples.ts` writes to the table, but **nothing reads from it during prompt assembly**. No `fetchRelevantExamples` function exists.

**Fix:** Add `fetchRelevantExamples()` function and wire it into `assemblePrompt.ts` after existing static example injection.

---

## Gap 2: Solver Feedback Not Wired into SolutionSubmitPage (Prompt 10.5 Part 3) -- NOT DONE

`ChallengeClarityFeedback.tsx` exists but is **never rendered**. The spec says: after successful solution submit, show feedback card (skippable, once per solver per challenge). `SolutionSubmitPage.tsx` has no reference to `ChallengeClarityFeedback`.

**Fix:** Import and render `ChallengeClarityFeedback` in the success state of `SolutionSubmitPage.tsx`.

---

## Gap 3: Domain Coverage Scorer Not Wired into PreFlight (Prompt 10.7) -- PARTIAL

The spec requires `scoreDomainCoverage()` to be called in `preFlightCheck.ts` with the actual domain tags, producing a coverage level warning. Currently, preFlightCheck only checks if `tags.length > 5` — it does **not call `scoreDomainCoverage()`** and does not warn about "thin" domains.

**Fix:** Import and call `scoreDomainCoverage()` in `preFlightCheck.ts`, adding a RECOMMENDED warning when coverage is `thin` or `moderate`.

---

## Gap 4: Org Context Scorer Not Wired Anywhere (Prompt 10.7) -- NOT DONE

`scoreOrgContext()` exists but is **never called**. The spec requires:
1. Show org context score in pre-flight check panel
2. Show org context score badge in the `OrgContextPanel` on CurationReviewPage

**Fix:** Wire `scoreOrgContext()` into `preFlightCheck.ts` and add a score badge to `OrgContextPanel`.

---

## Gap 5: Section Heatmap Missing from Dashboard (Prompt 10.4) -- NOT DONE

The spec describes a "27 sections x color" heatmap showing which sections are mostly accepted (green) vs rewritten (red). The dashboard only has grade distribution, recent challenges table, and solver feedback table. No heatmap.

**Fix:** Add a "Section Heatmap" tab to `AIQualityDashboardPage.tsx` that aggregates `section_breakdown` data to show per-section rewrite rates with color coding.

---

## Gap 6: Dashboard Filters Missing (Prompt 10.4) -- NOT DONE

The spec requires "Filter by: governance mode, domain, maturity level, time period." The dashboard has no filters.

**Fix:** Add filter dropdowns above the tabs in `AIQualityDashboardPage.tsx` and pass filter params to the query hooks.

---

## Gap 7: "Promote to AI Config" Button Missing (Prompt 10.6 Part 2) -- NEEDS VERIFICATION

The spec says ExampleLibraryManagerPage should have a "Promote to AI Config" button that copies an excellent example to `ai_review_section_config.example_good`. Need to verify if this exists in the current `ExampleLibraryManagerPage.tsx`.

---

## Gap 8: Confidence Scorer Factors Don't Match Spec (Prompt 10.2) -- DEVIATION

The spec's scoring formula is:
- Creator input present: +30 pts
- Reference materials: +20 pts  
- Context digest: +15 pts
- Master data constrained: +20 pts
- Rich text unconstrained: -10 pts
- Strong domain: +15 pts
- Niche domain: -15 pts

Current implementation uses a different formula (baseline 50, cross-section context +25, problem statement +10, etc.). The overall intent is met but the weights don't match the spec.

**Fix:** Align scoring weights to match the spec's formula.

---

## Summary of Required Changes

| # | Gap | Severity | Files to Change |
|---|-----|----------|----------------|
| 1 | Dynamic example injection | High | `assemblePrompt.ts` + new fetch function |
| 2 | Solver feedback not wired | High | `SolutionSubmitPage.tsx` |
| 3 | Domain scorer not wired | Medium | `preFlightCheck.ts` |
| 4 | Org context scorer not wired | Medium | `preFlightCheck.ts`, `OrgContextPanel.tsx` |
| 5 | Section heatmap missing | Medium | `AIQualityDashboardPage.tsx` |
| 6 | Dashboard filters missing | Medium | `AIQualityDashboardPage.tsx` |
| 7 | Promote to AI Config button | Low | `ExampleLibraryManagerPage.tsx` |
| 8 | Confidence scorer weights | Low | `confidenceScorer.ts` |

All gaps are additive changes — no existing functionality needs to be modified or broken.

