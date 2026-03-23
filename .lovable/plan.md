

# Fix: Curation Queue Not Showing All Assigned Challenges

## Root Cause

Two issues:

1. **Phase 1 challenges excluded**: The query filters `.in("current_phase", [2, 3])` but 3 of the 5 CU-assigned challenges are at phase 1 (intake/spec creation). These should also appear as "Incoming" since the CU role is already assigned.

2. **Default tab shows empty**: The default tab is "Awaiting Review" (phase 3 only), but no challenges have reached phase 3 yet. User lands on an empty view despite having 5 assigned challenges.

## Database Evidence

| Challenge | Phase | Status |
|-----------|-------|--------|
| Predictive Maintenance... | 2 | IN_PREPARATION |
| Healthcare Cost Reduction... | 2 | IN_PREPARATION |
| Patient Engagement... | 1 | IN_PREPARATION |
| AI-Driven Supply Chain... | 1 | IN_PREPARATION |
| Green Energy Transition... | 1 | IN_PREPARATION |

All 5 have active CU roles but none are at phase 3.

## Changes — `src/pages/cogniblend/CurationQueuePage.tsx`

### 1. Expand query to include phases 1, 2, and 3
Change `.in("current_phase", [2, 3])` to `.in("current_phase", [1, 2, 3])` so all CU-assigned challenges appear.

### 2. Update phaseBadge helper
- Phase 1: blue "Spec in Progress" badge
- Phase 2: amber "Awaiting Legal" badge (existing)
- Phase 3: green "Ready for Review" badge (existing)

### 3. Update tab filtering logic
- **Incoming**: phases 1 and 2 (not just 2)
- **Awaiting Review**: phase 3, non-breached (unchanged)
- **Under Revision**: phase 3, breached (unchanged)
- **All**: everything (unchanged)

### 4. Default to "All" tab when "Awaiting Review" is empty
Auto-select "All" tab on initial load if there are no phase 3 challenges, so the user sees their assigned work immediately.

### 5. Phase 1 rows: read-only with tooltip
Phase 1 rows get muted styling + tooltip "Challenge specification is still being developed" and navigate to a read-only view on click.

## No other files need changes.

