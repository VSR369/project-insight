

# Plan: Fix "Challenge Requestor" Typo + Verify Role Separation

## Issue Identified

In `src/types/cogniRoles.ts` line 12, the RQ role display name is **"Change Requestor"** — this is a typo. It should be **"Challenge Requestor"**.

## Current State of Role Separation (Already Implemented)

The previous approved plans already separated the screens correctly:
- **RQ (AGG)** → SimpleIntakeForm with 3 lightweight fields (Title, Problem Idea 300 chars, Sector) — header: "Share Your Idea"
- **AM (MP)** → SimpleIntakeForm with 6 mandatory fields (Title, Problem Summary, Solution Expectations, Sector, Budget, Timeline) — header: "Submit a Problem Brief"
- **CR/CA** → ConversationalIntakePage with full expert fields + "Expand Challenge Details" section

No structural changes are needed — the forms are already correctly differentiated.

## Changes

### 1. Fix typo in `src/types/cogniRoles.ts`

**Line 12:** Change `RQ: 'Change Requestor'` → `RQ: 'Challenge Requestor'`

This single fix propagates everywhere the RQ display name is used (RoleSwitcher, sidebar, dashboard widgets, badges).

| File | Change |
|------|--------|
| `src/types/cogniRoles.ts` | Fix RQ display name from "Change Requestor" to "Challenge Requestor" |

