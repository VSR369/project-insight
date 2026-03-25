

# Verification Result: "Review Sections by AI" Already Covers All Sections

## Finding

After thorough code inspection of both the edge function and frontend, **all sections are already covered**. No code changes needed.

### Edge function (`review-challenge-sections/index.ts`)

The `CURATION_SECTIONS` array (lines 28-57) defines **26 section keys** that are reviewed:

```text
Content (7):        problem_statement, scope, deliverables, expected_outcomes,
                    submission_guidelines, maturity_level, hook

Evaluation (3):     evaluation_criteria, reward_structure, complexity

Legal & Finance (4): ip_model, legal_docs, escrow_funding, domain_tags

Publication (7):    phase_schedule, eligibility, visibility, solver_expertise,
                    submission_deadline, challenge_visibility, effort_level

Extended Brief (7): context_and_background, root_causes, affected_stakeholders,
                    current_deficiencies, extended_brief_expected_outcomes,
                    preferred_approach, approaches_not_of_interest
```

Total: **28 section keys** — all sent to the LLM in batches of 12 (MAX_BATCH_SIZE).

### Frontend batch call (`CurationReviewPage.tsx` line 1269)

```typescript
await supabase.functions.invoke("review-challenge-sections", {
  body: { challenge_id: challengeId, role_context: 'curation' },
});
```

No `section_key` filter is passed → **all sections are reviewed**.

### Result display

- Top-level sections: mapped via `aiReviews.find(r => r.section_key === section.key)` (line 2428)
- Extended Brief subsections: `ExtendedBriefDisplay` receives `aiSectionReviews` prop and maps each subsection key (`context_and_background`, `root_causes`, etc.) to its AI review result
- Empty sections: AI receives `null` data and generates "Draft with AI" suggestions via `AIReviewInline`

### DB-driven config takes precedence

If `ai_review_section_config` table has active rows for `role_context = 'curation'`, those override the fallback list. If your DB config has fewer sections than the fallback, some sections won't be reviewed. **Check the DB config** to confirm all 28 keys are present:

```sql
SELECT section_key, is_active
FROM ai_review_section_config
WHERE role_context = 'curation'
ORDER BY section_key;
```

If some sections are missing from this table, the system falls back to the hardcoded list — but only if **zero** DB configs exist. If even one DB config exists, only DB-configured sections are reviewed.

### Most likely issue

If you're seeing incomplete reviews, the cause is one of:
1. **DB config has fewer than 28 active sections** — add missing section_key rows to `ai_review_section_config`
2. **The `?mode=view` URL parameter** was still making the page appear read-only (hiding AI review panels), making it seem like reviews weren't generated — this was fixed in the previous round
3. **LLM batch truncation** — if a batch of 12 sections overwhelms the model, some sections get backfilled with generic "Review could not be completed" warnings (line 274-284)

### Recommended verification

1. Open browser DevTools Network tab
2. Click "Review Sections by AI"
3. Check the response JSON — count how many `section_key` entries are in `all_reviews`
4. If fewer than 28, run the SQL query above to check DB config completeness

No code changes are required — the architecture already supports full coverage.

