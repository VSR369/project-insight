

# Phase D: Polish & Finalization - Implementation Plan

## Overview

This phase addresses the final polish items for the Industry Pulse module, focusing on enhanced user experience features. Based on the requirements document analysis, there are 3 main areas to complete:

1. **Position Change Indicators** - Show rank movement on leaderboard
2. **Content Card Enhancements** - Autoplay, read time, industry badges  
3. **Additional Attachments** - Document upload and emoji picker

---

## Current State Analysis

| Feature | Current Status | Gap |
|---------|----------------|-----|
| Position Change | Weekly leaderboard tracks `xp_change`, but no rank delta | Need to calculate previous rank from snapshots |
| Video Autoplay | Videos only play on click | Need Intersection Observer for 50% visibility |
| Read Time | Not calculated for articles | Need word count / 200 WPM formula |
| Industry Badge on Sparks | Shows "Spark" badge | Should show industry name |
| Document Upload | Button disabled in PostCreator | Need file validation + upload logic |
| Emoji Picker | Button disabled in PostCreator | Need emoji selection component |

---

## Implementation Details

### 1. Position Change Indicators

**Approach:** Calculate rank delta by comparing current rank vs previous day's rank using `pulse_xp_snapshots`.

**Files to Modify:**
- `src/hooks/queries/usePulseStats.ts` - Add rank tracking to leaderboard queries
- `src/pages/pulse/PulseRanksPage.tsx` - Display up/down arrows with delta

**Changes:**
```text
LeaderboardEntry interface:
+ rank_change?: number;  // positive = up, negative = down, 0 = same

useGlobalLeaderboard / useWeeklyLeaderboard:
1. Query yesterday's snapshot to get previous XP rankings
2. Compare current rank vs previous rank
3. Include rank_change in returned data
```

**UI Enhancement:**
```text
Current: Shows XP change badge for weekly
Add: Position arrow + delta number
  - ▲3 (green) - moved up 3 spots
  - ▼2 (red) - moved down 2 spots
  - ━ (gray) - unchanged
```

---

### 2. Content Card Enhancements

#### 2a. Video Autoplay with Intersection Observer

**Files to Modify:**
- `src/components/pulse/content/MediaRenderer.tsx` - Add autoplay logic

**Changes:**
- Create custom hook `useIntersectionObserver` or use inline ref callback
- When video element is 50%+ visible: autoplay (muted by default)
- When less than 50% visible: pause
- Only one video plays at a time (pause others)

```text
VideoPlayer component changes:
+ isInFeed?: boolean prop
+ useEffect with IntersectionObserver (threshold: 0.5)
+ Autoplay when intersecting, pause when not
+ Global context or ref to track currently playing video
```

#### 2b. Read Time Calculation for Articles

**Files to Modify:**
- `src/components/pulse/content/ContentCard.tsx` - Add read time badge
- `src/lib/utils.ts` or new utility - Add `calculateReadTime` function

**Logic:**
```typescript
function calculateReadTime(text: string): string {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}
```

**UI Placement:** Below the content type badge, for `article` type only

#### 2c. Industry Badge on Spark Cards

**Files to Modify:**
- `src/components/pulse/content/ContentCard.tsx` - Show industry instead of "Spark"

**Logic:**
```text
For content_type === 'spark':
  - If industry_segment exists: show industry name badge
  - If not: show default "Spark" badge
```

---

### 3. Additional Post Attachments

#### 3a. Document Upload

**Files to Modify:**
- `src/lib/validations/media.ts` - Add document type limits
- `src/hooks/mutations/usePulseUpload.ts` - Handle document uploads
- `src/components/pulse/creators/PostCreator.tsx` - Enable document button

**Supported Formats:**
```typescript
document: {
  maxSize: 10 * 1024 * 1024, // 10MB
  types: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  extensions: ['.pdf', '.doc', '.docx'],
  label: '10MB'
}
```

**UI Changes:**
- Enable "Document" button
- Show document preview with filename and icon
- Allow one image OR one document (mutually exclusive)

#### 3b. Emoji Picker Component

**Approach:** Create a lightweight emoji picker using native emoji categories (no external library needed).

**New File:**
- `src/components/pulse/creators/EmojiPicker.tsx`

**Implementation:**
```text
- Popover component with emoji categories
- Common emojis: 😀😊🎉👍❤️🔥⭐💡🚀✨
- Category tabs: Recent, Smileys, Objects, Symbols
- Click to insert at cursor position in textarea
- Store recent emojis in localStorage
```

**Files to Modify:**
- `src/components/pulse/creators/PostCreator.tsx` - Integrate emoji picker

---

## File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/hooks/queries/usePulseStats.ts` | Modify | Add rank change calculation to leaderboard queries |
| `src/pages/pulse/PulseRanksPage.tsx` | Modify | Display rank change indicators with arrows |
| `src/components/pulse/content/MediaRenderer.tsx` | Modify | Add Intersection Observer for video autoplay |
| `src/components/pulse/content/ContentCard.tsx` | Modify | Add read time badge, industry badge for sparks |
| `src/lib/validations/media.ts` | Modify | Add document type validation |
| `src/hooks/mutations/usePulseUpload.ts` | Modify | Handle document content type |
| `src/components/pulse/creators/PostCreator.tsx` | Modify | Enable document upload, integrate emoji picker |
| `src/components/pulse/creators/EmojiPicker.tsx` | Create | New emoji selection popover component |
| `src/components/pulse/creators/index.ts` | Modify | Export EmojiPicker |

---

## Technical Implementation Details

### Intersection Observer Pattern
```typescript
const videoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        video.play().catch(() => {}); // Autoplay may be blocked
      } else {
        video.pause();
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(video);
  return () => observer.disconnect();
}, []);
```

### Rank Change Query Enhancement
```typescript
// Get yesterday's leaderboard ranking
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

const { data: yesterdaySnapshots } = await supabase
  .from('pulse_xp_snapshots')
  .select('provider_id, total_xp_at_date')
  .eq('snapshot_date', yesterdayStr)
  .eq('snapshot_type', 'daily');

// Calculate yesterday's ranks
const sortedYesterday = yesterdaySnapshots
  .sort((a, b) => b.total_xp_at_date - a.total_xp_at_date)
  .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

// Compare with current
const rankChangeMap = new Map(
  sortedYesterday.map(e => [e.provider_id, e.rank])
);

// In final leaderboard: rank_change = previousRank - currentRank
```

---

## Accessibility Considerations

- Video autoplay will be muted (browser requirement)
- Emoji picker supports keyboard navigation
- Rank changes include screen reader text
- Document/image type clearly indicated with icons

---

## Testing Checklist

After implementation, verify:
- [ ] Videos autoplay when scrolled 50% into view
- [ ] Videos pause when scrolled out of view
- [ ] Only one video plays at a time
- [ ] Read time shows correctly for articles (test with 200, 500, 1000+ word articles)
- [ ] Spark cards show industry name instead of "Spark"
- [ ] Rank changes show correct arrows (up/down/same)
- [ ] Documents can be attached (PDF, DOC, DOCX)
- [ ] Document preview shows filename and icon
- [ ] Emoji picker opens and inserts emojis
- [ ] Cannot attach both image AND document
- [ ] Mobile scrolling works smoothly with autoplay

---

## Summary

**Total Files:** 9 (1 new, 8 modified)

**Estimated Complexity:** Medium - all changes are additive and don't break existing functionality

**Dependencies:** No new npm packages required - using native browser APIs and existing UI components

