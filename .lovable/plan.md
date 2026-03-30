

# Fix Remaining 2 Gaps in Prompt Quality

## Gap 1: Add DEFAULT_QUALITY_CRITERIA for 13 Missing Sections

**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`

After the `success_metrics_kpis` entry (line 203), before the closing `};` (line 204), add quality criteria for these 13 sections:

- `context_and_background` — External Solver Accessibility, Prior Attempts, Triggering Event
- `solution_type` — Deliverable Alignment, Coverage Without Dilution, Solver Pool Impact
- `root_causes` — Problem Traceability, Actionability, Completeness
- `affected_stakeholders` — Adoption Challenge Required, Role Specificity, Completeness
- `current_deficiencies` — Factual Observations, Problem Linkage, Quantification
- `preferred_approach` — Seeker Intent Preservation, Scope Consistency, Solver Guidance Value
- `approaches_not_of_interest` — Seeker Intent Preservation, Clarity, Preferred Approach Consistency
- `maturity_level` — Deliverable Consistency, Timeline Feasibility, Reward Proportionality
- `complexity` — Dimension Independence, Evidence-Based Justification, Empty Section Handling
- `data_resources_provided` — Solver Actionability, Deliverable Sufficiency, Restriction Clarity
- `eligibility` — Expertise Alignment, Pool Size Consideration, Master Data Compliance
- `ip_model` — Deliverable-IP Alignment, Solver Incentive Balance, Maturity Appropriateness
- `visibility` — Evaluation Bias Prevention, Challenge Type Match, Master Data Compliance

Each entry includes `name`, `severity` (error/warning/suggestion), `description`, and `crossReferences` where applicable — exactly as specified in the audit.

## Gap 3: Enhanced Domain Framework Detection

**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`

### 3a. Replace `detectDomainFrameworks` function (lines 231-247)

New signature: `detectDomainFrameworks(domainTags, problemStatement?, scope?)`

Strategy:
1. Match against `domain_tags` (existing logic)
2. If tags yield nothing, keyword-scan `problem_statement` and `scope` (HTML-stripped) against a `DOMAIN_KEYWORDS` map covering 19 domains (supply_chain, cybersecurity, ai_ml, healthcare, finance, sustainability, etc.)

### 3b. Update call site 1 — `buildStructuredBatchPrompt` (line 419)

Pass `challengeSections.problem_statement` and `challengeSections.scope` as additional args.

### 3c. Update call site 2 — `buildPass2SystemPrompt` (line 763)

Pass `challengeContext?.problem_statement` and `challengeContext?.scope` as additional args.

## Deployment

Redeploy edge function `review-challenge-sections` after changes.

## Expected Impact

All 25 active sections at 7.8+. 19 sections at 8.0+. Average: ~8.4/10.

