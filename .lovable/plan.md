

# Fix: Missing `assignment_method` column in `verification_assignment_log`

## Problem
The `claim_from_queue` RPC tries to insert into `verification_assignment_log` with an `assignment_method` column, but that column does not exist on the table. The table's actual columns are: `id, verification_id, event_type, from_admin_id, to_admin_id, reason, initiator, scoring_snapshot, created_at`.

This same issue likely affects other RPCs that insert into this table (e.g., `release_to_queue`, `request_reassignment`, `execute_auto_assignment`).

## Fix
**One migration** to recreate `claim_from_queue` with the corrected INSERT — remove `assignment_method` from the column list and values:

```sql
-- Before (broken):
INSERT INTO verification_assignment_log (
  verification_id, event_type, from_admin_id, to_admin_id,
  assignment_method, reason
) VALUES (
  v_verification_id, 'CLAIMED_FROM_QUEUE', NULL, v_admin_id,
  'OPEN_QUEUE_CLAIMED', 'Claimed from open queue by ' || v_admin_name
);

-- After (fixed):
INSERT INTO verification_assignment_log (
  verification_id, event_type, from_admin_id, to_admin_id,
  reason, initiator
) VALUES (
  v_verification_id, 'CLAIMED_FROM_QUEUE', NULL, v_admin_id,
  'Claimed from open queue by ' || v_admin_name, 'admin'
);
```

## Files
| File | Change |
|---|---|
| New migration SQL | Recreate `claim_from_queue` function with corrected INSERT columns |

