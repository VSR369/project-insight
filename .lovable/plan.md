

# Implement 4 Claude Feedback Fixes for Prompt Studio

## Summary
Apply 4 tuning adjustments identified from Claude's review of the assembled prompt output. These involve a mix of database updates (migration) and code changes to the default platform preamble.

## What Changes

### Fix 1 — Verify Expected Outcomes in Deliverables Cross-References
**Status: Already done.** The DB already has `expected_outcomes` in both `cross_references` and the OUTCOME COVERAGE quality criterion's `crossReferences`. No action needed.

### Fix 2 — Change SELF-CONTAINED Severity from "error" to "warning"
The current DB has `SELF-CONTAINED` at severity `"error"`. Claude's feedback recommends `"warning"` — it's a real problem but not as severe as a maturity mismatch or missing outcome coverage.

**Change:** Migration to update the `quality_criteria` JSONB for `deliverables` section, changing SELF-CONTAINED severity from `error` to `warning`.

### Fix 3 — Add Open Innovation Benchmarking Search Query
Add a new web search directive to the `deliverables` section's `web_search_queries`:
- Purpose: "Comparable challenge deliverables"
- Query: "InnoCentive HeroX open innovation challenge deliverables {{domain}}"
- When: "if_available"

**Change:** Migration to append to `web_search_queries` JSONB array.

### Fix 4 — Expand Platform Preamble with All 17 Solution Domains
The current preamble lists ~11 domains with trailing "...". Based on the platform's proficiency areas and sub-domains, expand to the full 17 domains. Update in both:
1. `src/lib/cogniblend/assemblePrompt.ts` (DEFAULT_PLATFORM_PREAMBLE)
2. `supabase/functions/review-challenge-sections/promptTemplate.ts` (DEFAULT_PLATFORM_PREAMBLE)
3. Migration to update all rows in `ai_review_section_config` where `platform_preamble` contains the old text

The 17 domains (derived from the 4 proficiency areas and their sub-domains):
1. Digital Business Models
2. Digital Strategy
3. Enterprise Strategy Design
4. Intelligent Process Design (SCM, Procurement, Finance, HR)
5. Process Excellence & Automation
6. Technology Architecture
7. Enterprise Architecture
8. Data Strategy & Analytics
9. AI/ML Solutions
10. Agentic AI & GenAI Lifecycle Management
11. Cybersecurity & Trust
12. Cloud Modernization & Infrastructure
13. Smart Workplaces & Digital Experience
14. Operating Model Transformation
15. Product & Service Innovation
16. Platform Ecosystems & API Strategy
17. Workforce Transformation & Change Management

## Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | Update deliverables quality_criteria (Fix 2), web_search_queries (Fix 3), and all platform_preamble rows (Fix 4) |
| `src/lib/cogniblend/assemblePrompt.ts` | Update DEFAULT_PLATFORM_PREAMBLE with 17 domains (Fix 4) |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Update DEFAULT_PLATFORM_PREAMBLE with 17 domains (Fix 4) |

## Technical Notes
- Fix 2 uses a JSONB manipulation query to update just the severity field of the SELF-CONTAINED criterion without touching other criteria
- Fix 3 appends to existing `web_search_queries` array
- Fix 4 updates all rows sharing the same preamble text in one UPDATE statement
- The edge function must be redeployed after the code change to promptTemplate.ts

