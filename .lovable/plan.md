

# Phase 3: Staleness Tracking + Mandatory Re-Review + Submission Gate

## Overview

When a curator edits an upstream section, all downstream sections that depend on it become "stale" (amber highlighting). The submit button is blocked until every stale section is re-reviewed. This is a **client-side** feature — all staleness state lives in the existing Zustand store (persisted to localStorage). No database migration needed.

## Architecture

The staleness system is entirely contained in the existing `curationFormStore` Zustand store, augmenting `SectionStoreEntry` with new fields. The dependency map is a static constant. Staleness propagation runs synchronously on every section save.

```text
Section Save → onSectionSaved()
  ├─ Update lastEditedAt on saved section
  ├─ Clear own staleness (if was stale)
  ├─ Compute transitive dependents via BFS
  ├─ Mark each dependent as stale (accumulate causes)
  └─ Toast: "N section(s) marked stale"

AI Review Complete / Manual Edit → clearStaleness()
  └─ Reset isStale, staleBecauseOf, staleAt, update lastReviewedAt
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/cogniblend/sectionDependencies.ts` | `DIRECT_DEPENDENCIES` map + `getTransitiveDependents()` BFS + `getSectionDisplayName()` helper |

## Files to Modify

| File | Change |
|------|--------|
| `src/types/sections.ts` | Add `lastEditedAt`, `lastReviewedAt`, `isStale`, `staleBecauseOf`, `staleAt` to `SectionStoreEntry` + update `createEmptySectionEntry()` |
| `src/store/curationFormStore.ts` | Add `markSectionSaved(key)` action (triggers staleness propagation) + `clearStaleness(key)` action + `getStaleSections()` selector |
| `src/components/cogniblend/curation/CuratorSectionPanel.tsx` | Add `"stale"` to `SectionStatus` union, render amber left border + "Stale — re-review" badge + upstream change reason line |
| `src/pages/cogniblend/CurationReviewPage.tsx` | (1) Derive stale status from store for each section panel, (2) call `markSectionSaved()` from every `handleSave*` callback, (3) call `clearStaleness()` on AI review accept/complete, (4) update `groupProgress` to count stale as incomplete, (5) add STALE category to right sidebar summary, (6) compute staleness gate and pass to `CurationActions` |
| `src/components/cogniblend/curation/CurationActions.tsx` | Add `staleSections` and `unreviewedSections` props, render submission blocked banner with counts + action buttons, disable submit when stale |
| `src/hooks/useAiSectionReview.ts` | Call `clearStaleness()` in `accept()` and after successful review |

## Implementation Details

### 1. Dependency Map (`sectionDependencies.ts`)

Static `DIRECT_DEPENDENCIES` Record mapping each section key to its direct downstream dependents (exact map from spec). `getTransitiveDependents(sectionKey)` does BFS to collect all transitively affected sections. `getSectionDisplayName(key)` returns human-readable names for UI display.

Note: The spec uses `complexity_assessment` but the codebase uses `complexity` as the section key. The dependency map will use the actual codebase keys.

### 2. Store Augmentation (`SectionStoreEntry`)

New fields default to: `lastEditedAt: null`, `lastReviewedAt: null`, `isStale: false`, `staleBecauseOf: []`, `staleAt: null`.

New action `markSectionSaved(key: SectionKey)`:
- Sets `lastEditedAt` on the saved section, clears its own staleness
- Calls `getTransitiveDependents(key)` to find affected sections
- For each affected section in the store: sets `isStale: true`, appends to `staleBecauseOf` (Set-deduplicated), sets `staleAt` (keep existing if already stale)
- Returns the list of newly staled sections for a toast

New action `clearStaleness(key: SectionKey)`:
- Sets `isStale: false`, `staleBecauseOf: []`, `staleAt: null`, updates `lastReviewedAt`

New selector `getStaleSections()`:
- Returns array of `{key, staleBecauseOf, staleAt}` for all stale sections

### 3. CuratorSectionPanel Changes

Add `"stale"` to `SectionStatus`. When status is `"stale"`:
- Left border: `border-l-4 border-amber-500`
- Badge: amber "Stale — re-review" replacing the normal status badge
- Below attribution line: "Changed upstream: [Section Name] ([time ago])" in muted amber text
- New optional props: `staleBecauseOf?: string[]`, `staleAt?: string | null`

### 4. CurationReviewPage Integration

- In the section rendering loop, derive `sectionStatus` — if store entry `isStale` is true, status becomes `"stale"` (overrides other statuses)
- Every `handleSave*` callback additionally calls `store.getState().markSectionSaved(sectionKey)` and shows a toast if sections became stale
- `acceptSuggestion` handler calls `clearStaleness` for the section
- `groupProgress` computation: stale sections count as NOT done (even if `isFilled` returns true)
- Right sidebar: add a "STALE" category card above "Needs Revision" with count and clickable section list

### 5. Submission Gate

`CurationActions` receives new props:
- `staleSections: Array<{key: string, name: string, causes: string[], staleAt: string}>`
- `unreviewedSections: Array<{key: string, name: string}>`

Submit button disabled when `staleSections.length > 0` (in addition to existing `legalEscrowBlocked`).

Amber banner appears above the button showing:
- Count of stale sections with their names
- "Re-review stale sections" button (for now: navigates to first stale section's tab)
- "View stale sections" button (scrolls to first stale section)
- If multiple blockers (stale + unreviewed + escrow), all shown as numbered list

### 6. Edge Cases Handled

- **Editing a stale section**: `markSectionSaved` clears own staleness first, then propagates to dependents
- **Multiple upstream changes**: `staleBecauseOf` accumulates (Set-deduplied), displays all causes
- **Locked sections (Legal/Escrow)**: When stale, show "Stale — requires FC/LC re-review" instead of generic message
- **Clearing staleness**: Only via AI re-review completion or manual edit+save — viewing/expanding does nothing

