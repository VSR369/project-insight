

## Fix Timeline Format Mismatches in Seed & Fill Data

### Problem
The bidirectional sync introduced `4w/8w/16w/32w` as the only valid timeline dropdown values. But both seed sources still use old formats:
- **Fill Test Data**: MP_SEED uses `'24w'`, AGG_SEED uses `'20w'` — neither exists in the dropdown
- **Seed Demo edge function**: All 4 challenges use month-range strings (`"6-12"`, `"9-12"`, `"3-6"`) instead of week codes

This means the Target Timeline dropdown won't display a selection for seeded/filled data, and the bidirectional sync logic can't match these values.

### Changes

**File 1: `src/components/cogniblend/creator/creatorSeedContent.ts`**
- MP_SEED (line 124): Change `expected_timeline: '24w'` → `'32w'` (closest valid option for ~168 day challenge)
- AGG_SEED (line 232): Change `expected_timeline: '20w'` → `'16w'` (closest valid option for ~140 days)
- CONTROLLED branch (line 303-309): The phase_durations total 123 days → `daysToTimeline(123)` = `'16w'`, so the base `expected_timeline` inherited from MP/AGG seed will now be correct after the above fix

**File 2: `supabase/functions/setup-test-scenario/index.ts`**
- C1 CONTROLLED+AGG (line 261): `"6-12"` → `"16w"` (123 days of phases = 16w bucket)
- C2 CONTROLLED+MP (line 297): `"9-12"` → `"16w"` (140 days of phases = 16w bucket)
- C3 STRUCTURED+AGG (line 329): `"3-6"` → `"8w"` (structured, no phase dates)
- C4 STRUCTURED+MP (line 351): `"3-6"` → `"8w"`
- Also check C5/C6 (QUICK) for the same issue
- Redeploy the edge function

### Technical Notes
- The `daysToTimeline` snap boundaries: ≤35→4w, ≤84→8w, ≤168→16w, 169+→32w
- No schema changes needed — just value alignment
- Edge function redeploy required

