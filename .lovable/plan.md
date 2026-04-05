

# Fix: Seed Scenario — Invalid UUID for hq_country_id

## Root Cause
Line 218 of `supabase/functions/setup-test-scenario/index.ts` passes `hq_country_id: "IN"` but the column is type UUID. The correct UUID for India is `b386af94-4e21-4b78-9235-eb8c75c12016`.

## Fix (1 change, 1 file)

**File:** `supabase/functions/setup-test-scenario/index.ts`

**Line 218** — Replace hardcoded country code with a dynamic lookup:

Add a country lookup query before the org INSERT (after line 201):

```typescript
// Look up India's UUID from countries table
const { data: indiaRow } = await supabaseAdmin
  .from("countries")
  .select("id")
  .eq("code", "IN")
  .maybeSingle();
const indiaCountryId = indiaRow?.id ?? null;
```

Then change line 218 from:
```typescript
hq_country_id: "IN",
```
to:
```typescript
hq_country_id: indiaCountryId,
```

## Result
- Org creation uses the correct UUID for India
- Seed scenario completes successfully
- No hardcoded UUIDs (lookup is resilient to different environments)

