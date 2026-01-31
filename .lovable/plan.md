
# Plan: Create Content-Type Specific Feed Pages

## Current State Analysis

The navigation quick nav shows 8 items, but several routes don't exist yet:

| Nav Item | Route | Page Exists? | Content Type Filter |
|----------|-------|--------------|---------------------|
| Profile | `/pulse/profile` | ✅ Yes | N/A |
| Feed | `/pulse/feed` | ✅ Yes | **None** (shows ALL) |
| Reels | `/pulse/reels` | ❌ **Missing** | `reel` |
| Podcast | `/pulse/podcasts` | ❌ **Missing** | `podcast` |
| Spark | `/pulse/sparks` | ✅ Yes | `spark` |
| Article | `/pulse/articles` | ❌ **Missing** | `article` |
| Gallery | `/pulse/gallery` | ❌ **Missing** | `gallery` |
| Pulse Cards | `/pulse/cards` | ✅ Yes | N/A (separate table) |

## Solution: Create 4 New Content-Type Pages

Each page follows the same pattern as `PulseSparksPage`:
- Uses `usePulseFeed({ contentType: 'xxx' })` hook
- Displays content-type-specific header with icon
- Shows empty state with CTA to create that content type
- Displays filtered content list

---

## Files to Create

### 1. `src/pages/pulse/PulseReelsPage.tsx`

```text
┌─────────────────────────────────────┐
│ 🎬 Reels                            │
│ Short-form video content            │
│ [Create a Reel]                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐     │
│ │ [Video Preview] 📹         │     │
│ │ Duration: 0:45             │     │
│ │ 🔥 12  💬 3  🥇 1          │     │
│ └─────────────────────────────┘     │
│ ...more reels                       │
└─────────────────────────────────────┘
```

- Filter: `content_type: 'reel'`
- Icon: `Video` (lucide)
- CTA: "Share a Reel"

### 2. `src/pages/pulse/PulsePodcastsPage.tsx`

```text
┌─────────────────────────────────────┐
│ 🎙️ Podcasts                         │
│ Audio content from experts          │
│ [Start a Podcast]                   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐     │
│ │ [Cover Image] 🎧            │     │
│ │ Duration: 15:30            │     │
│ │ 🔥 45  💬 12  🥇 5         │     │
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

- Filter: `content_type: 'podcast'`
- Icon: `Mic` (lucide)
- CTA: "Share a Podcast"

### 3. `src/pages/pulse/PulseArticlesPage.tsx`

```text
┌─────────────────────────────────────┐
│ 📄 Articles                         │
│ In-depth knowledge pieces           │
│ [Write an Article]                  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐     │
│ │ [Title: "AI in Healthcare"] │     │
│ │ Read time: 5 min           │     │
│ │ 🔥 120  💬 34  🥇 15       │     │
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

- Filter: `content_type: 'article'`
- Icon: `FileText` (lucide)
- CTA: "Write an Article"

### 4. `src/pages/pulse/PulseGalleryPage.tsx`

```text
┌─────────────────────────────────────┐
│ 🖼️ Gallery                          │
│ Visual content and portfolios       │
│ [Create a Gallery]                  │
├─────────────────────────────────────┤
│ ┌───┬───┬───┐                       │
│ │   │   │   │  (Image grid)         │
│ └───┴───┴───┘                       │
│ 🔥 25  💬 8  🥇 2                   │
└─────────────────────────────────────┘
```

- Filter: `content_type: 'gallery'`
- Icon: `Images` (lucide)
- CTA: "Create a Gallery"

---

## Files to Modify

### 5. Update `src/pages/pulse/index.ts`

Add exports for the 4 new pages:

```typescript
export { default as PulseReelsPage } from './PulseReelsPage';
export { default as PulsePodcastsPage } from './PulsePodcastsPage';
export { default as PulseArticlesPage } from './PulseArticlesPage';
export { default as PulseGalleryPage } from './PulseGalleryPage';
```

### 6. Update `src/App.tsx`

Add 4 new routes:

```typescript
// Import new pages
import { 
  PulseFeedPage, 
  PulseSparksPage, 
  PulseReelsPage,      // NEW
  PulsePodcastsPage,   // NEW
  PulseArticlesPage,   // NEW
  PulseGalleryPage,    // NEW
  // ... existing
} from "@/pages/pulse";

// Add routes
<Route path="/pulse/reels" element={<AuthGuard><PulseReelsPage /></AuthGuard>} />
<Route path="/pulse/podcasts" element={<AuthGuard><PulsePodcastsPage /></AuthGuard>} />
<Route path="/pulse/articles" element={<AuthGuard><PulseArticlesPage /></AuthGuard>} />
<Route path="/pulse/gallery" element={<AuthGuard><PulseGalleryPage /></AuthGuard>} />
```

---

## Page Component Template

All 4 pages follow the same structure (using `PulseArticlesPage` as example):

```tsx
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PulseLayout } from '@/components/pulse/layout';
import { usePulseFeed } from '@/hooks/queries/usePulseContent';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { formatDistanceToNow } from 'date-fns';

export default function PulseArticlesPage() {
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const { data: feedContent, isLoading, refetch, isRefetching } = usePulseFeed({ contentType: 'article' });

  // Loading state
  if (isLoading) {
    return (
      <PulseLayout title="Articles" providerId={provider?.id} showSidebars>
        <div className="max-w-lg mx-auto lg:max-w-none p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </PulseLayout>
    );
  }

  const articles = feedContent ?? [];

  return (
    <PulseLayout title="Articles" providerId={provider?.id} showSidebars>
      <div className="max-w-lg mx-auto lg:max-w-none">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Articles
              </h2>
              <p className="text-sm text-muted-foreground">In-depth knowledge pieces</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button className="w-full" onClick={() => navigate('/pulse/create', { state: { type: 'article' } })}>
            <FileText className="h-4 w-4 mr-2" />
            Write an Article
          </Button>
        </div>

        {/* Content list or empty state */}
        {articles.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Articles Yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share your expertise</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {articles.map((article) => (
              <Card key={article.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pulse/content/${article.id}`)}>
                <CardContent className="p-4">
                  {/* Content card details */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PulseLayout>
  );
}
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/pulse/PulseReelsPage.tsx` | **CREATE** | Filtered feed for reels |
| `src/pages/pulse/PulsePodcastsPage.tsx` | **CREATE** | Filtered feed for podcasts |
| `src/pages/pulse/PulseArticlesPage.tsx` | **CREATE** | Filtered feed for articles |
| `src/pages/pulse/PulseGalleryPage.tsx` | **CREATE** | Filtered feed for galleries |
| `src/pages/pulse/index.ts` | MODIFY | Export new pages |
| `src/App.tsx` | MODIFY | Add 4 new routes |

**Total: 4 new files, 2 modified files**

---

## How It Works

1. User clicks "Reels" in `PulseQuickNav`
2. Navigates to `/pulse/reels`
3. `PulseReelsPage` loads
4. Calls `usePulseFeed({ contentType: 'reel' })`
5. Hook queries `pulse_content` table with `content_type = 'reel'` filter
6. Shows only reel content

User clicks "Feed" → Shows ALL content types (existing behavior)
