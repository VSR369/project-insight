

# Reorganize Curation Review Tabs — 5 → 6 Tabs

## What Changes

Replace the current 5-tab GROUPS definition with a 6-tab structure and update the progress strip grid. **Zero functional changes** — only which tab each section lives under and tab labels.

## Changes — `CurationReviewPage.tsx`

### 1. Replace GROUPS array (lines 722-766)

Replace the entire `GROUPS` constant with 6 new tab definitions:

| # | Tab ID | Label | Sections (by key) | Color Theme |
|---|--------|-------|--------------------|-------------|
| 1 | `problem_definition` | Problem Definition | `context_and_background`, `problem_statement`, `scope`, `expected_outcomes` | emerald (reuse content) |
| 2 | `challenge_context` | Challenge Context | `root_causes`, `affected_stakeholders`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest` | teal (new) |
| 3 | `scope_complexity` | Scope & Complexity | `deliverables`, `maturity_level`, `complexity` | blue (reuse evaluation) |
| 4 | `solvers_schedule` | Solvers & Schedule | `solver_expertise`, `eligibility`, `phase_schedule`, `submission_guidelines` | slate (reuse publication) |
| 5 | `evaluation_rewards` | Evaluation & Rewards | `evaluation_criteria`, `reward_structure`, `ip_model`, `escrow_funding`, `legal_docs` | amber (reuse legal) |
| 6 | `publish_discover` | Publish & Discover | `hook`, `visibility`, `domain_tags` | violet (new) |

Verification: 4+5+3+4+5+3 = 24 sections total (unchanged).

### 2. Update progress strip grid (line 2380)

Change `lg:grid-cols-5` → `lg:grid-cols-6`.

### 3. Update default active group

If there's a default `activeGroup` state initialized to `"content"`, change it to `"problem_definition"`.

## What Does NOT Change

- All 24 section definitions in the `SECTIONS` array
- All rendering logic (switch-cases, component imports)
- AI review, acceptance, save handlers
- Right sidebar, top banner, bottom actions
- Role permissions, view-only locks, supervisor badges
- Progress calculation logic (already iterates GROUPS dynamically)

## Files Modified

1. `src/pages/cogniblend/CurationReviewPage.tsx` — GROUPS array, grid class, default active group

