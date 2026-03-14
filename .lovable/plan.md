

# Fix: Empty Reassignment Requests — Add Seed Data

## Problem
The `reassignment_requests` table has no rows. The queries succeed (HTTP 200) but return empty arrays. No RLS issue — just missing data.

## Solution
Create a migration that inserts seed data into `reassignment_requests` using existing admin IDs and verification IDs from the network responses.

### Seed Data Plan
Using known IDs from the live database:

**Admins available:**
- `fff77a0e-2a01-4012-b233-dcbe2f58228c` — Super Visor (supervisor)
- `ff121ac9-b82e-434a-a0c5-e3bfaff3f5d4` — Senior Admin
- `51d718c6-bcb9-445b-ae00-b81931d71098` — Shark Tank Admin
- `7efa9bb0-5f1f-4263-b372-fc7f01a509e8` — Basic Admin

**Verifications available:**
- `65a1789a-5e40-4368-b1d6-1212b2b7c894` — VSR Corp (Under_Verification, assigned to Super Visor)
- `b29989e5-5bbf-4d17-8e0e-0b0db9804197` — VSR (Under_Verification, assigned to Super Visor)
- `5c6a1247-7d31-46b7-a964-8152c7c02ac6` — Jati Ratnaalu (Under_Verification, just claimed by Super Visor)

### Insert 4 reassignment requests:
1. **PENDING** — Basic Admin requests reassignment of VSR Corp verification, reason: "Conflict of interest — previously worked with this organization"
2. **PENDING** — Shark Tank Admin requests reassignment (suggested: Senior Admin), reason: "Workload too high, SLA at risk"
3. **APPROVED** — Senior Admin's past request that was approved
4. **DECLINED** — Basic Admin's past request that was declined with a reason

## File
| File | Change |
|---|---|
| New migration SQL | Insert 4 seed rows into `reassignment_requests` |

