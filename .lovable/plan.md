

## Fix Plan: 4 Root-Cause Bugs in Creator→Curator Data Flow

### Bug 1: `industry_segment_id` never fetched for Curator

**Root cause:** Creator saves `industry_segment_id` to the `challenges` table (line 204 of `challengePayloads.ts`), but neither `CHALLENGE_CORE_SELECT` nor `CHALLENGE_DEFERRED_SELECT` in `useCurationPageData.ts` includes it. So `resolveIndustrySegmentId` Rule 1 reads `undefined` and falls through to null.

**Fix:** Add `"industry_segment_id"` to `CHALLENGE_DEFERRED_SELECT` (line 44-53 of `useCurationPageData.ts`).

### Bug 2: Pre-flight ignores Creator-filled values

**Root cause:** `runPreFlight` in `useCurationAIActions.ts` (lines 68-78) builds `sectionContents` by iterating `state.sections` from the Zustand store, which starts empty on page load. Only `problem_statement` and `scope` have explicit fallbacks (lines 90-91). Creator-filled `maturity_level`, `domain_tags`, `deliverables`, `evaluation_criteria`, etc. are never seeded.

**Fix:** After the store iteration loop, seed ALL mandatory/recommended fields from the challenge DB object if not already in `sectionContents`:

```typescript
// Seed Creator-filled fields from DB if not already in store
const creatorFields = [
  'maturity_level', 'domain_tags', 'deliverables', 'evaluation_criteria',
  'reward_structure', 'phase_schedule', 'ip_model', 'expected_outcomes',
  'submission_guidelines', 'description', 'eligibility', 'visibility',
];
for (const field of creatorFields) {
  if (!sectionContents[field] && (challenge as any)?.[field] != null) {
    const v = (challenge as any)[field];
    sectionContents[field] = typeof v === 'string' ? v : JSON.stringify(v);
  }
}
```

### Bug 3: `maturity_level` "POC" always fails 50-char threshold

**Root cause:** `preFlightCheck` line 263 uses `content.length < 50` for ALL mandatory sections. `maturity_level` is an enum code ("POC", "BLUEPRINT", etc.) — max ~10 chars. Always fails.

**Fix:** Use per-section thresholds in the mandatory check loop:

```typescript
const SECTION_MIN_LENGTH: Record<string, number> = {
  maturity_level: 2,   // enum code like "POC"
  domain_tags: 3,      // at least one short tag like '["ai"]'
  problem_statement: 50,
};

for (const s of MANDATORY_SECTIONS) {
  const content = getSectionContent(sections, s.sectionId);
  const minLen = SECTION_MIN_LENGTH[s.sectionId] ?? 50;
  if (content.length < minLen) {
    missingMandatory.push(s);
  }
}
```

### Bug 4: Domain Tags duplicate warnings

**Root cause:** The domain coverage scorer can emit up to 3 separate warnings for `domain_tags`: thin coverage, moderate coverage, AND too many tags. This creates duplicate entries in the pre-flight dialog.

**Fix:** Emit at most one `domain_tags` warning — prioritize the most actionable one. Use an early return pattern:

```typescript
if (coverage.coverageLevel === 'thin') {
  warnings.push({ ... thin warning ... });
} else if (tags.length > 5) {
  warnings.push({ ... too many tags warning ... });
} else if (coverage.coverageLevel === 'moderate') {
  warnings.push({ ... moderate warning ... });
}
```

### Files Changed

| File | Change |
|------|--------|
| `useCurationPageData.ts` (line 44) | Add `industry_segment_id` to `CHALLENGE_DEFERRED_SELECT` |
| `useCurationAIActions.ts` (line 78) | Seed Creator-filled fields from challenge DB object into `sectionContents` |
| `preFlightCheck.ts` (line 263) | Per-section minimum length thresholds |
| `preFlightCheck.ts` (line 312-331) | Deduplicate domain_tags warnings |

### What stays the same
- No edge function changes
- No migrations needed
- No component/UI changes
- `resolveIndustrySegmentId` logic unchanged — it works correctly once the data is fetched

