

# Plan: Fix AM Brief Data Flow to Challenge Architect View

## Problem
The "Account Manager's Original Brief" panel on the AISpecReviewPage (Challenge Architect's view) has several data-binding bugs that prevent AM-entered data from displaying correctly:

1. **Wrong field for Problem Summary**: Panel reads `challenge.description` but AM intake saves to `problem_statement`
2. **Missing Solution Expectations**: AM enters "What success looks like commercially" (saved to `scope`), but it is not shown
3. **Missing Beneficiaries Mapping**: AM optionally enters this (saved to `extended_brief.beneficiaries_mapping`), but it is not shown
4. **Timeline not resolving**: `expected_timeline` is stored inside `phase_schedule` JSONB, but panel reads it as a top-level field — always empty
5. **Plain text rendering**: Rich HTML from `RichTextEditor` rendered as plain `<p>` instead of `SafeHtmlRenderer`
6. **Panel duplicated**: Same broken panel exists in both QUICK mode (line 1366) and STRUCTURED mode (line 1490) branches

## Changes

### File: `src/pages/cogniblend/AISpecReviewPage.tsx`

Both AM Brief panels (QUICK + STRUCTURED) will be updated identically:

1. **Fix visibility condition**: Change `challenge.description || challengeRecord.reward_structure` to `challenge.problem_statement || challengeRecord.reward_structure`

2. **Fix Problem Summary**: Change `challenge.description` to `challenge.problem_statement` and render with `<SafeHtmlRenderer>` instead of `<p>`

3. **Add Solution Expectations**: Show `challenge.scope` (the AM's "What success looks like commercially") with `<SafeHtmlRenderer>`

4. **Fix Timeline**: Extract from `phase_schedule` JSONB — `(challengeRecord.phase_schedule as any)?.expected_timeline` instead of `challengeRecord.expected_timeline`

5. **Add Beneficiaries Mapping**: Show `extended_brief.beneficiaries_mapping` if present, with `<SafeHtmlRenderer>`

6. **Add AM Approval flag**: Show whether the AM requested approval before publication

7. **Import `SafeHtmlRenderer`** (already imported or add if missing)

## Impact
This is a read-only display fix. No database changes, no schema changes, no data migration. The data is already being saved correctly by the AM intake — the Architect's view just was not reading the right fields.

