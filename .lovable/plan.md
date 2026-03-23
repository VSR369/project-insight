

# Show All Challenges in Curation Queue (Not Just CU-Assigned)

## Problem

The Curation Queue only shows challenges where the current user has an explicit `CU` role in `user_challenge_roles`. Challenges created directly by CR/CA users (without going through AM/RQ intake) often have **no CU role assignment**, so they never appear in any curator's queue. Three such challenges exist right now with zero role assignments.

## Solution

Change the query strategy: instead of filtering by CU role assignment, show **all active challenges in the curator's organization** that are in phases 1-3. The CU permission check remains (user must hold at least one CU role to access the page), but the queue itself shows all org-level challenges awaiting curation.

## Changes — `src/pages/cogniblend/CurationQueuePage.tsx`

### 1. Replace user-scoped query with org-scoped query

**Current**: Fetch CU role assignments → fetch only those challenge IDs.

**New**: 
- Keep the permission check (user must have at least one active CU role — already exists)
- Fetch the user's organization ID from their profile/org context
- Query all challenges in that org where `current_phase IN (1, 2, 3)` and `is_active = true` and `is_deleted = false`

This ensures challenges created by CR, CA, AM, or RQ all appear regardless of whether a CU was explicitly assigned.

### 2. Add "Assigned to Me" indicator

Since the queue is now org-wide, add a visual indicator showing which challenges have the current user assigned as CU vs unassigned ones. This helps curators prioritize their own assignments while still seeing the full pipeline.

- Challenges with CU assignment to current user: normal row
- Challenges with CU assignment to another curator: show "Assigned: [Name]" in a new column
- Challenges with no CU assignment: show "Unassigned" badge (amber) — curator can claim or view

### 3. Keep read-only logic intact

Phase 1/2 challenges remain read-only (view only). Phase 3 challenges remain fully editable. No changes needed to `CurationReviewPage.tsx` or `CurationActions.tsx`.

## Summary

One file change: `CurationQueuePage.tsx` query broadened from user-role-scoped to org-scoped, ensuring every challenge in phases 1-3 lands in the curator's queue regardless of who created it or whether a CU role was assigned.

