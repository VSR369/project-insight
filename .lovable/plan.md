

## Fix Remaining Gaps: VIP Registration Function + Organization Placeholder

### What's Already Done
- `finalize_certification` RPC — already writes `'proven'`/`'acclaimed'`/`'eminent'` (migration `20260413045557`)
- All frontend constants and UI components — already updated

### What Still Needs Fixing

**Item 1 — HIGH RISK: VIP Expert registration trigger**

In `supabase/migrations/20260202172023`, line 223, the `handle_new_user` trigger function hardcodes:
```sql
CASE WHEN v_invitation_type = 'vip_expert' THEN 'expert' ELSE NULL END
```
This means any new VIP Expert registering gets `certification_level = 'expert'` — the OLD value. This directly conflicts with the renamed tiers.

**Fix**: New migration with `CREATE OR REPLACE FUNCTION` for the user registration trigger, changing `'expert'` → `'eminent'` on that line.

**Item 2 — LOW RISK: Organization.tsx placeholder**

Line 303 shows "Senior Consultant" as a placeholder in the designation field. This references the old expertise level naming.

**Fix**: Change placeholder to `"e.g. Innovation Lead"`.

### Execution

1. **Migration**: `CREATE OR REPLACE FUNCTION` for the trigger that handles `handle_new_user` — update the single `'expert'` → `'eminent'` value for VIP expert certification_level assignment
2. **Frontend**: Update `src/pages/enroll/Organization.tsx` line 303 placeholder

**2 changes total. Zero structural changes. Zero breaking risk.**

