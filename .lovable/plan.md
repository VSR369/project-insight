

# Add Default Quality Criteria for 3 Remaining Sections

## Status Assessment

The DB (`ai_review_section_config`) already has structured JSONB `quality_criteria` for `legal_docs`, `escrow_funding`, and `visibility`. The system uses these when DB configs load. The gap is purely in the **code-level fallback defaults** — `DEFAULT_QUALITY_CRITERIA` in `promptConstants.ts` has no entries for these 3 sections. If DB configs are unavailable (rare but possible), these sections get zero structured quality criteria.

## Changes

### File: `supabase/functions/review-challenge-sections/promptConstants.ts`

**1. Add `DEFAULT_QUALITY_CRITERIA` entries for 3 sections** (after the existing `scope` and `expected_outcomes` entries, ~line 186):

```typescript
legal_docs: [
  { name: 'IP Consistency', severity: 'error', description: 'Legal terms must match the selected IP Model. An IP-EA challenge with an NDA that allows solver retention is contradictory.', crossReferences: ['ip_model'] },
  { name: 'Jurisdiction Coverage', severity: 'warning', description: 'Legal documents should cover all jurisdictions implied by Eligibility settings. Global eligibility requires cross-border IP and dispute resolution clauses.', crossReferences: ['eligibility'] },
],
escrow_funding: [
  { name: 'Amount Match', severity: 'error', description: 'Escrow deposit must equal total prize pool defined in Reward Structure. Any discrepancy blocks publication.', crossReferences: ['reward_structure'] },
  { name: 'Timing', severity: 'warning', description: 'Escrow funding must be secured before challenge opens for submissions. Timeline must align with Phase Schedule.', crossReferences: ['phase_schedule'] },
],
visibility: [
  { name: 'Data Sensitivity', severity: 'error', description: 'Challenges involving proprietary data or sensitive IP must NOT use public visibility. Flag if scope references confidential assets with public solver visibility.', crossReferences: ['scope', 'legal_docs'] },
],
```

**2. Add `EXTENDED_BRIEF_FORMAT_INSTRUCTIONS` entries** for structured output guidance:

```typescript
legal_docs: 'Output: JSON array of document objects with keys: document_type, tier ("tier_1"|"tier_2"), status, document_name. Validate completeness against IP model requirements.',
escrow_funding: 'Output: JSON object with keys: escrow_status ("funded"|"pending"|"not_required"), deposit_amount (number), currency (ISO code), matches_prize_pool (boolean), funding_deadline (ISO date or null).',
visibility: 'Output: JSON object with keys: solver_visibility ("anonymous"|"visible"|"semi_anonymous"), rationale (string explaining why this visibility setting is appropriate for this challenge type).',
```

### No other files changed

The existing `getEffectiveQualityCriteria()` function already checks DB first, then falls back to these defaults. The `buildStructuredBatchPrompt` and `buildConfiguredBatchPrompt` functions already iterate over effective criteria and inject them. No wiring changes needed.

### Result
- All 25 sections now have code-level default quality criteria (previously 22/25)
- Gap 6 closed -- zero remaining gaps from the AI prompt analysis

