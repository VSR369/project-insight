

# Fix "Unknown" Tab Labels in Pre-Flight Dialog

## Problem

The `SECTION_TO_TAB` mapping in `preFlightCheck.ts` is missing entries for several sections that appear in the pre-flight dialog. When a section key isn't found, it falls back to `'Unknown'` — confusing the user about where to navigate.

## Fix

Add the missing section keys to `SECTION_TO_TAB` in `src/lib/cogniblend/preFlightCheck.ts`:

| Section Key | Tab Label |
|---|---|
| `creator_references` | Problem Definition |
| `reference_urls` | Problem Definition |
| `escrow_funding` | Evaluation & Rewards |
| `solution_type` | Scope & Complexity |
| `data_resources_provided` | Scope & Complexity |
| `success_metrics_kpis` | Evaluation & Rewards |
| `hook` | Publish & Discover |
| `organization_context` | Problem Definition |
| `solver_audience` | Solution Providers & Schedule |
| `evaluation_config` | Evaluation & Rewards |
| `legal_docs` | Legal & Compliance |
| `creator_legal_instructions` | Legal & Compliance |

This ensures every section that can appear in the pre-flight dialog shows its correct parent tab name instead of "Unknown".

## Files to Change

| File | Change |
|---|---|
| `src/lib/cogniblend/preFlightCheck.ts` | Add ~12 missing entries to `SECTION_TO_TAB` |

## No Other Changes Needed

Single constant update. No database changes.

