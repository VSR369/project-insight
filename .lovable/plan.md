

## Fix: Banner Dismiss Resets + Per-Section Incomplete Chips

### Problem
1. Dismissing the banner is permanent (`useState(false)`) — if new sections become incomplete, the banner stays hidden
2. Expanded view only shows group-level chips, not individual incomplete sections

### Changes

**1. `src/lib/cogniblend/incompleteSectionsUtil.ts`** — Add `incompleteSectionKeys` to `IncompleteGroup`

Update `buildIncompleteGroups` to accept challenge data and call `isFilled()` per section to identify which specific sections are incomplete (not just all section keys in the group).

```typescript
export interface IncompleteGroup {
  groupId: string;
  label: string;
  missing: number;
  total: number;
  sectionKeys: string[];          // all valid keys
  incompleteSectionKeys: string[]; // only the incomplete ones
}
```

Add `challenge`, `legalDocs`, `legalDetails`, `escrowRecord` parameters. For each group's section keys, call `sec.isFilled(challenge, ...)` to filter incomplete ones. Fall back to existing `groupProgress` math if `challenge` is null.

**2. `src/components/cogniblend/curation/IncompleteSectionsBanner.tsx`** — Smart dismiss + per-section chips

- Replace `dismissed: boolean` with `dismissedAt: number | null` + `prevMissingCount` ref
- Add `useEffect` that re-shows banner when `totalMissing > prevMissingCount` after dismiss
- Replace expanded chip rendering: group headers with individual section buttons underneath
- Add `challenge`, `legalDocs`, `legalDetails`, `escrowRecord` to props interface
- Pass these through to `buildIncompleteGroups`

**3. `src/pages/cogniblend/CurationReviewPage.tsx`** — Pass challenge data to banner

Add `challenge`, `legalDocs`, `legalDetails`, `escrowRecord` props to the `IncompleteSectionsBanner` call site (all available from orchestrator).

### Files changed

| File | Action |
|------|--------|
| `src/lib/cogniblend/incompleteSectionsUtil.ts` | Add per-section filtering via `isFilled` |
| `src/components/cogniblend/curation/IncompleteSectionsBanner.tsx` | Smart dismiss + per-section chips |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass challenge data to banner |

