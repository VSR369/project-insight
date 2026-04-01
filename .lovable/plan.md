

# Fix: maturity_level SOLUTION_DEMO Validation Mismatch

## Root Cause

There's a mismatch between three layers:

1. **`md_solution_maturity` table** (master data): has codes `SOLUTION_BLUEPRINT`, `SOLUTION_DEMO`, `SOLUTION_POC`, `SOLUTION_PROTOTYPE`
2. **DB trigger `trg_challenges_validate_cogniblend`**: validates maturity_level against `BLUEPRINT | POC | PROTOTYPE | PILOT`
3. **Client normalizer `challengeFieldNormalizer.ts`**: validates against same list `BLUEPRINT | POC | PROTOTYPE | PILOT`

When a user selects "Solution Demo" (code `SOLUTION_DEMO`), the normalizer strips `SOLUTION_` → `DEMO`, which is rejected because `DEMO` isn't in the allowed list.

Additionally, `PILOT` exists in the trigger/normalizer but has no corresponding `md_solution_maturity` record.

## Fix (3 changes)

### 1. Update DB trigger to accept DEMO (and keep PILOT for backward compat)

Add `DEMO` to the allowed maturity_level values in `trg_challenges_validate_cogniblend`:

```sql
IF NEW.maturity_level IS NOT NULL AND NEW.maturity_level NOT IN 
  ('BLUEPRINT','POC','PROTOTYPE','PILOT','DEMO') THEN
```

**Migration file:** `supabase/migrations/XXXX_add_demo_maturity_to_trigger.sql`

### 2. Update client normalizer to accept DEMO

Add `DEMO` to `VALID_MATURITY` in `challengeFieldNormalizer.ts`:

```typescript
const VALID_MATURITY = ['BLUEPRINT', 'POC', 'PROTOTYPE', 'PILOT', 'DEMO'] as const;
```

### 3. Update maturityLabels.ts to include DEMO

Add the `demo` entry so display labels resolve correctly:

```typescript
export const MATURITY_LABELS: Record<string, string> = {
  blueprint: 'An idea or concept',
  demo: 'A working demonstration',
  poc: 'Proof it can work',
  prototype: 'A working demo',
  pilot: 'A real-world test',
};
```

### 4. Update unit tests

Add `DEMO` and `SOLUTION_DEMO` test cases to `challengeFieldNormalizer.test.ts`.

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/XXXX_add_demo_maturity.sql` | Add DEMO to trigger validation |
| `src/lib/cogniblend/challengeFieldNormalizer.ts` | Add DEMO to VALID_MATURITY |
| `src/lib/maturityLabels.ts` | Add demo label and description |
| `src/lib/cogniblend/__tests__/challengeFieldNormalizer.test.ts` | Add DEMO test cases |

