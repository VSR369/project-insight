

## Standardize All List/Queue Screens: Sort, Timestamps, Search & Filters

### Problem

List screens are inconsistent — some lack search, some show date-only (no time), one sorts oldest-first, and several have no filters at all. Users cannot quickly find what they need.

### Global Standard to Apply

Every list/inbox/queue screen must follow these rules:
1. **Sort**: Newest first (created_at DESC) — always
2. **Timestamp**: Full date + time format: `MMM d, yyyy · h:mm a` (e.g. "Apr 11, 2026 · 3:45 PM")
3. **Search**: Text search input filtering by title (and relevant fields)
4. **Filters**: At minimum, status/tab filters; add domain filters where data supports it

### Screen-by-Screen Audit & Fixes

| Screen | Sort | Timestamp | Search | Filters | Fixes Needed |
|--------|------|-----------|--------|---------|--------------|
| **MyChallengesPage** | ✅ DESC | ✅ Full | ❌ None | ✅ Tabs | Add search input |
| **BrowseChallengesPage** | ✅ DESC | ❌ Relative only | ✅ Has | ✅ Has | Show full timestamp alongside relative |
| **CurationQueuePage** | ❌ ASC (bug!) | ❌ Date only | ❌ None | ✅ Tabs | Fix sort to DESC, add full timestamp, add search |
| **ChallengeListPage** (org) | ✅ DESC | ❌ Date only | ✅ Has | ❌ Minimal | Add time to timestamp, add status filter |
| **LcChallengeQueuePage** | ❌ No sort | ❌ No timestamp | ❌ None | ❌ None | Add sort, timestamp, search |
| **FcChallengeQueuePage** | ❌ No sort | ❌ No timestamp | ❌ None | ❌ None | Add sort, timestamp, search |

### Implementation Details

#### 1. MyChallengesPage.tsx — Add search input
- Add `search` state + `Input` with search icon above the tabs
- Filter `filteredItems` by title match (case-insensitive)
- Timestamp already correct (`'MMM d, yyyy · h:mm a'`)

#### 2. BrowseChallengesPage.tsx — Add full timestamp
- Replace `formatDistanceToNow` with full timestamp + relative in parentheses: `"Apr 11, 2026 · 3:45 PM (2 days ago)"`
- Import `format` from date-fns

#### 3. CurationQueuePage.tsx — Fix sort + add timestamp + add search
- Line 213: Change `ascending: true` to `ascending: false` (critical bug — oldest first currently)
- Change `formatDate` helper to include time: `'MMM d, yyyy · h:mm a'`
- Add search input above tabs filtering by challenge title

#### 4. ChallengeListPage.tsx (org) — Add time to timestamp + status filter
- Change `format(new Date(c.created_at), 'MMM d, yyyy')` to `'MMM d, yyyy · h:mm a'`
- Add status filter dropdown (draft/active/closed)

#### 5. LcChallengeQueuePage.tsx — Add timestamp, search
- Show `created_at` from challenge data (need to fetch it — add to select or use existing data)
- Add search input filtering by challenge title
- Ensure items sorted newest first

#### 6. FcChallengeQueuePage.tsx — Add timestamp, search
- Show created_at timestamp on each card
- Add search input filtering by title
- Items already fetched without sort — add client-side sort by newest first

### Files Changed (6 files)
- `src/pages/cogniblend/MyChallengesPage.tsx` — add search input
- `src/pages/cogniblend/BrowseChallengesPage.tsx` — full timestamp
- `src/pages/cogniblend/CurationQueuePage.tsx` — fix sort direction, full timestamp, add search
- `src/pages/org/ChallengeListPage.tsx` — full timestamp, status filter
- `src/pages/cogniblend/LcChallengeQueuePage.tsx` — timestamp, search
- `src/pages/cogniblend/FcChallengeQueuePage.tsx` — timestamp, search, sort

