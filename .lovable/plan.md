

# Plan: Seed Test Verification Data for MOD-03 Dashboard

## Problem
The Verification Dashboard screens are implemented and rendering correctly, but both `platform_admin_verifications` and `open_queue_entries` tables have **0 rows**. The "You have no active verifications" empty state is the designed behavior when there's no data.

## Solution
Insert realistic test data via a SQL migration so all MOD-03 screens show populated tables with various SLA states.

## What We Will Insert

Using the existing 21 organizations and 3 admin profiles:
- **Supervisor** (`fff77a0e-...`, user `db44fec9-...`)
- **Senior Admin** (`ff121ac9-...`, user `682867d0-...`)
- **Basic Admin** (`7efa9bb0-...`, user `ee6cfaa4-...`)

### 1. `platform_admin_verifications` — 8 records

| # | Organization | Assigned To | Status | SLA State | Purpose |
|---|-------------|------------|--------|-----------|---------|
| 1 | VSR | Supervisor | Under_Verification | 30% elapsed (green) | Normal active |
| 2 | VSR Corp | Supervisor | Under_Verification | 85% elapsed (amber T1) | T1 warning |
| 3 | Test | Senior Admin | Under_Verification | 50% elapsed | Normal |
| 4 | Sunrise | Senior Admin | Under_Verification | 110% elapsed (T2 breach) | T2 breach |
| 5 | Testing Org | Basic Admin | Under_Verification | 60% | Normal |
| 6 | Bheem | NULL | Pending_Assignment | 40% | In open queue |
| 7 | Jati Ratnaalu | NULL | Pending_Assignment | 95% | In queue, near breach |
| 8 | SRI SRI | NULL | Pending_Assignment | 160% (T3) | Critical in queue |

### 2. `open_queue_entries` — 3 records (for verifications 6, 7, 8)
- Record 6: normal queue entry
- Record 7: near-deadline, 1 escalation
- Record 8: `is_critical=true`, `is_pinned=true`, 3 escalations

### 3. `verification_check_results` — auto-seeded by existing trigger for new verifications

### 4. Update some check results to show partial progress on assigned verifications

## What the User Will See After

**My Assignments tab** (when logged in as Supervisor): 2 rows with green and amber SLA bars, tier badges, days remaining.

**Open Queue tab**: 3 rows including a pinned CRITICAL entry, claim buttons, color-coded time-in-queue.

## Technical Details
- Single SQL migration file with INSERTs
- Uses existing org IDs and admin profile IDs
- SLA start times calculated relative to `NOW()` to produce the desired elapsed percentages
- `sla_duration_seconds` default is 172800 (48 hours)

