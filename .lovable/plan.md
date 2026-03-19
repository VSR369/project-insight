

# Fix: Maturity Level Case Mismatch

## Root Cause

The database validation trigger on the `challenges` table rejects lowercase maturity values:

```sql
IF NEW.maturity_level NOT IN ('BLUEPRINT','POC','PROTOTYPE','PILOT') THEN
  RAISE EXCEPTION 'Invalid maturity_level: %', NEW.maturity_level;
END IF;
```

But the Conversational Intake form sends lowercase values (`blueprint`, `poc`, etc.) via `saveStep` on line 372 of `ConversationalIntakePage.tsx`.

## Fix

**Single change in `ConversationalIntakePage.tsx`** — uppercase the maturity_level before saving:

```tsx
maturity_level: data.maturity_level.toUpperCase(),
```

Line 372: change `maturity_level: data.maturity_level` → `maturity_level: data.maturity_level.toUpperCase()`.

Also apply the same fix in `ChallengeWizardPage.tsx` wherever `maturity_level` is written to DB via `buildFieldsFromForm`, to ensure consistency across both creation paths.

No database changes needed — the trigger validation is correct; the application code just needs to send the right case.

