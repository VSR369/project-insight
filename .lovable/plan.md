

# Plan: Add "Start a Post" Creator Widget Below Profile Build Banner

## Overview

Create a LinkedIn-style "Start a Post" widget to be displayed **below the "Ready to stand out?" banner** on the Industry Pulse feed. This widget provides quick access to content creation directly from the feed.

---

## Design Reference Analysis

Based on the uploaded image, the component structure is:

```
┌──────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                      │
│ │Photo│  Start a Post ___________________________            │
│ └─────┘                                                      │
│                                                              │
│  📝           📹          🎙️           📄          ⚡         │
│ Quick Post   Reel       Podcast      Article     Spark      │
│                                                              │
│                                                    📚        │
│                                               Pulse Cards    │
└──────────────────────────────────────────────────────────────┘
```

**Key Design Elements:**
- Provider photo on left with green border
- "Start a Post" text input area (click opens create flow)
- 6 quick action buttons with icons and labels below

---

## Implementation Details

### Phase 1: Create the StartPostWidget Component

**File:** `src/components/pulse/widgets/StartPostWidget.tsx`

**Props:**
```typescript
interface StartPostWidgetProps {
  providerId?: string;
  providerName?: string;
  providerAvatar?: string | null;
  isFirstTime?: boolean;
  className?: string;
}
```

**Features:**
1. **Avatar Section** (left side):
   - Show provider photo with green border (like the image)
   - Fallback to initials if no avatar
   - Use existing Avatar component

2. **Input Area** (center):
   - Clickable div styled like input
   - "Start a Post" placeholder text
   - Click navigates to `/pulse/create`

3. **Quick Actions Row** (bottom):
   - 6 content type buttons matching PulseCreatePage
   - Order: Quick Post, Reel, Podcast, Article, Spark, Pulse Cards
   - Each button navigates with pre-selected type

**Content Type Icons (matching existing):**
| Type | Icon | Color |
|------|------|-------|
| Quick Post | MessageSquare | Orange |
| Reel | Film | Pink |
| Podcast | Mic | Purple |
| Article | FileText | Blue |
| Spark | Zap | Yellow |
| Pulse Cards | Layers | Cyan |

---

### Phase 2: Update PulseFeedPage

**File:** `src/pages/pulse/PulseFeedPage.tsx`

**Changes:**
1. Import `StartPostWidget`
2. Add widget below `ProfileBuildBanner` for all users (not just first-time)
3. Pass provider info (id, name, avatar)

**New Structure:**
```tsx
{/* Profile build banner - first-time users only */}
{isFirstTime && (
  <div className="p-4 border-b">
    <ProfileBuildBanner />
  </div>
)}

{/* Start a Post widget - all users */}
<div className="p-4 border-b">
  <StartPostWidget 
    providerId={provider?.id}
    providerName={providerName}
    isFirstTime={isFirstTime}
  />
</div>
```

---

### Phase 3: Add Avatar URL Fetching

Since `solution_providers` doesn't have an avatar field but the `profiles` table does, we need to:

**Option A: Fetch from profiles table**
- Join or separate query to get `avatar_url` from `profiles` table using `user_id`

**Option B: Use Auth user metadata**
- Some setups store avatar in auth user metadata

**Recommended Approach:**
Create a helper hook or modify the provider fetch to include profile avatar. For now, the component will use initials fallback (like existing PersonalizedFeedHeader).

---

## Component Styling

**StartPostWidget visual design:**
```css
/* Card container */
- White/card background
- Rounded border (rounded-xl)
- Border: primary/20 (green tint like image)
- Padding: p-4

/* Avatar */
- Size: 48x48 (h-12 w-12)
- Border: 2px solid green-500 (matching image)
- Rounded full

/* Input mock */
- Full width flex-1
- Border: 1px rounded-full
- Light gray background (muted/10)
- Click cursor

/* Quick action buttons */
- Grid or flex row
- Icon + label vertically stacked
- Each colored per content type
- Hover state with slight scale
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/pulse/widgets/StartPostWidget.tsx` | Main "Start a Post" component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/widgets/index.ts` | Export StartPostWidget |
| `src/pages/pulse/PulseFeedPage.tsx` | Add StartPostWidget below banner |

---

## Visual Result

**Desktop (with sidebars):**
```
┌─────────────┬─────────────────────────────────┬─────────────┐
│ LEFT        │  ┌─ Ready to stand out? ──────┐ │ RIGHT       │
│ SIDEBAR     │  │  ...banner content...      │ │ SIDEBAR     │
│             │  └────────────────────────────┘ │             │
│             │  ┌─ Start a Post ─────────────┐ │             │
│             │  │ [Photo] Start a Post____   │ │             │
│             │  │                             │ │             │
│             │  │ Post  Reel  Pod  Art  Spark│ │             │
│             │  │                    Cards   │ │             │
│             │  └────────────────────────────┘ │             │
│             │                                 │             │
│             │  FEED CONTENT...                │             │
└─────────────┴─────────────────────────────────┴─────────────┘
```

**Mobile:**
```
┌─────────────────────────────────┐
│  Ready to stand out? banner    │
├─────────────────────────────────┤
│ [Photo] Start a Post____       │
│                                 │
│ Post  Reel  Pod  Art  Spark    │
│                       Cards    │
├─────────────────────────────────┤
│  FEED CONTENT...                │
│                                 │
└─────────────────────────────────┘
```

---

## Technical Notes

1. **Reuse content types config** - Import from PulseCreatePage or extract to shared constants
2. **Navigation with state** - Pass selected type to create page via router state
3. **First-time users** - Widget still shows but clicking navigates to welcome flow instead
4. **Responsive** - Buttons wrap on smaller screens if needed
5. **Accessibility** - Proper labels and keyboard navigation

