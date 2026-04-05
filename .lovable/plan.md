

# Fix: Cleanup SQL — Correct `audit_trail` Column

## Problem
The cleanup SQL references `audit_trail.entity_type` which doesn't exist. The table uses `challenge_id` to link to challenges.

## Corrected Cleanup SQL

Replace the failing line:
```sql
-- OLD (broken):
DELETE FROM audit_trail WHERE entity_type = 'challenge';

-- NEW (correct):
DELETE FROM audit_trail;
```

Since `audit_trail` only tracks challenge actions (every row has a `challenge_id` FK), deleting all rows is equivalent and correct for a fresh start.

## Full Corrected Cleanup Script (single migration or insert tool execution)

```sql
-- Child tables first (FK order)
DELETE FROM challenge_prize_tiers;
DELETE FROM user_challenge_roles;
DELETE FROM challenge_section_approvals;
DELETE FROM challenge_legal_docs;
DELETE FROM escrow_records;
DELETE FROM challenge_qa;
DELETE FROM challenge_attachments;
DELETE FROM challenge_incentive_selections;
DELETE FROM challenge_context_digest;
DELETE FROM challenge_package_versions;
DELETE FROM challenge_role_assignments;
DELETE FROM pending_challenge_refs;
-- Audit (no entity_type column — all rows are challenge-scoped)
DELETE FROM audit_trail;
-- Parent table last
DELETE FROM challenges;
```

No schema changes needed — this is a data-only operation using the insert tool.

