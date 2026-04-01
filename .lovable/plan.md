

# Add Created Timestamp + Duplicate Detection to My Challenges

## What's Missing

1. **No created date shown** — The `useMyChallenges` hook doesn't fetch `created_at` from challenges, and the card doesn't display it.
2. **Duplicate detection** — If a user accidentally created the same challenge twice (e.g., double-clicked "Fill & Submit"), there's no visual indicator. We can detect duplicates by matching titles.

## Plan

### 1. Update `useMyChallenges.ts` — fetch `created_at`

Add `created_at` to the challenges select query and the `MyChallengeItem` interface.

### 2. Update `MyChallengesPage.tsx` — display timestamp + duplicate indicator

**Timestamp**: Show formatted date/time below the badges in each `ChallengeCard` using `format(date, 'MMM d, yyyy · h:mm a')`.

**Duplicate detection**: In the page component, compute a `Set` of titles that appear more than once. Pass a `isDuplicate` flag to `ChallengeCard`. If true, show a small warning badge: `⚠ Possible duplicate`.

```typescript
// Compute duplicates by title
const duplicateTitles = useMemo(() => {
  const titleCounts = new Map<string, number>();
  for (const c of items) {
    const t = c.title.trim().toLowerCase();
    titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
  }
  return new Set([...titleCounts.entries()].filter(([, n]) => n > 1).map(([t]) => t));
}, [items]);
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useMyChallenges.ts` | Add `created_at` to select + interface |
| `src/pages/cogniblend/MyChallengesPage.tsx` | Show timestamp, compute duplicate titles, show warning badge |

