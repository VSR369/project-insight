

# Plan: Update AI Review Config — Increase Limits + Seed Claude's Content

## Summary

Two changes: (1) increase character limits on DB columns and UI textareas, (2) update all 28 provided sections with Claude's detailed prompt engineering content via UPDATE statements.

## Deliverable 1 — SQL Migration: ALTER example columns

The `example_good` and `example_poor` columns are currently `VARCHAR(500)`. Claude's examples (e.g., spec/problem_statement at ~530 chars) exceed this.

```sql
ALTER TABLE public.ai_review_section_config
  ALTER COLUMN example_good TYPE TEXT,
  ALTER COLUMN example_poor TYPE TEXT;
```

No other columns need schema changes — `review_instructions`, `dos`, `donts` are already `TEXT`.

## Deliverable 2 — UI Updates in AIReviewConfigPage.tsx

| Field | Current | New | Rationale |
|-------|---------|-----|-----------|
| `example_good` | 500 chars, 3 rows | 800 chars, 5 rows | Claude's examples are 400-530 chars |
| `example_poor` | 500 chars, 3 rows | 800 chars, 5 rows | Same |
| `review_instructions` | No limit, 3 rows | 2000 char counter, 6 rows | Claude's instructions are 500-900 chars |
| `dos` | No limit, 2 rows | 1000 char counter, 4 rows | Claude's dos are 200-400 chars |
| `donts` | No limit, 2 rows | 1000 char counter, 4 rows | Same |
| `section_description` | No limit, 2 rows | 500 char counter, 3 rows | Keeps descriptions concise |

Changes in `AIReviewConfigPage.tsx`:
- Lines 300, 304, 306: Change `max={500}` → `max={800}`, `.slice(0, 500)` → `.slice(0, 800)`, `maxLength={500}` → `maxLength={800}`
- Lines 313, 317, 319: Same for `example_poor`
- Lines 242-246: Add `CharCounter` for `review_instructions` with max 2000, increase rows to 6
- Lines 252-256: Add `CharCounter` for `dos` with max 1000, increase rows to 4
- Lines 260-264: Add `CharCounter` for `donts` with max 1000, increase rows to 4
- Lines 233-236: Add `CharCounter` for `section_description` with max 500, increase rows to 3

## Deliverable 3 — Data Updates: 28 Sections

Update all 28 sections (intake: 4, spec: 9, curation: 14, legal: 1) with Claude's detailed content using the INSERT tool (UPDATE statements). Each section gets updated `review_instructions`, `dos`, `donts`, `required_elements`, `example_good`, and `example_poor`.

The remaining 8 sections (legal: 2, finance: 3, evaluation: 3) keep their current seed content — Claude's message was truncated at section 28.

Updates are grouped into 6 batches by role_context:
1. **intake** — 4 UPDATEs (problem_statement, scope, beneficiaries_mapping, budget_reasonableness)
2. **spec** — 9 UPDATEs (problem_statement, expected_outcomes, scope, beneficiaries_mapping, description, deliverables, evaluation_criteria, hook, ip_model)
3. **curation** — 14 UPDATEs (problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, submission_guidelines, eligibility, complexity, ip_model, legal_docs, escrow_funding, maturity_level, visibility_eligibility)
4. **legal** — 1 UPDATE (nda_adequacy)

## Files Changed

| Type | File | Change |
|------|------|--------|
| Migration | New SQL migration | ALTER example_good/example_poor to TEXT |
| UI | `src/pages/admin/seeker-config/AIReviewConfigPage.tsx` | Increase textarea rows, add CharCounters, raise char limits |
| Data | 28 UPDATE statements via insert tool | Full Claude content for all provided sections |

## What Does NOT Change

Edge function, promptTemplate.ts, aiReviewPromptTemplate.ts, AIReviewInline, any review orchestration files.

