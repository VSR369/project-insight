
# Fix: Video Alignment and Width Issues

## Problem Analysis

The video player in the feed appears **left-aligned** and **narrow** because:

| Location | Current Issue |
|----------|---------------|
| `MediaRenderer.tsx` VideoPlayer | Uses `aspect-[9/16]` (portrait) with no horizontal centering (`mx-auto`) |
| `ContentCard.tsx` wrapper | Uses `<div className="mb-3 relative">` with no centering or width control |
| Container | No `w-full` or `max-w-*` to control width |

## Root Cause

The VideoPlayer component has a fixed portrait aspect ratio (`9:16`) intended for TikTok-style vertical videos, but:
1. No `mx-auto` to center it horizontally
2. No responsive width control
3. Videos that are landscape (16:9) get letterboxed inside a narrow 9:16 container

## Solution

### Option 1: Center Portrait Videos (Quick Fix)
Add `mx-auto` to center the 9:16 video container and increase max-height:

```tsx
// MediaRenderer.tsx - VideoPlayer preview mode (line 184)
<div className={cn(
  "relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto w-full max-w-[280px] sm:max-w-[320px]",
  className
)}>

// MediaRenderer.tsx - VideoPlayer full mode (line 202-205)
<div 
  ref={containerRef}
  className={cn(
    "relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[600px] mx-auto w-full max-w-[350px] sm:max-w-[400px]",
    className
  )}
>
```

### Option 2: Smart Aspect Ratio (Better UX)
Detect video orientation and use appropriate aspect ratio:

```tsx
// For landscape videos: aspect-video (16:9)
// For portrait videos: aspect-[9/16]

// This requires storing video dimensions in the database
```

## Recommended Changes

### File: `src/components/pulse/content/MediaRenderer.tsx`

**Change 1: Preview Mode (line 184)**
- Add `mx-auto` for horizontal centering
- Add responsive width constraints

**Change 2: Full Player (line 202-205)**
- Add `mx-auto` for horizontal centering  
- Increase `max-h` from 500px to 600px
- Add responsive max-width

**Change 3: ContentCard wrapper (optional)**
In `ContentCard.tsx` line 194, add flex centering:
```tsx
<div className="mb-3 relative flex justify-center">
```

## Visual Result

```
Before:                          After:
┌─────────────────────┐          ┌─────────────────────┐
│ [Video]             │          │      [Video]        │
│ ████                │    →     │     ████████        │
│ ████                │          │     ████████        │
│                     │          │     ████████        │
└─────────────────────┘          └─────────────────────┘
  Left-aligned, narrow             Centered, wider
```

## Summary of Changes

| File | Line | Change |
|------|------|--------|
| `MediaRenderer.tsx` | 184 | Add `mx-auto w-full max-w-[280px] sm:max-w-[320px]` |
| `MediaRenderer.tsx` | 202-205 | Add `mx-auto w-full max-w-[350px] sm:max-w-[400px]`, increase `max-h` to 600px |
| `ContentCard.tsx` | 194 | Add `flex justify-center` to wrapper |

## Testing After Fix

1. Upload a reel video
2. View in feed - should be horizontally centered
3. Video should have increased width
4. Check on mobile viewport - should still look good
5. Click to expand - full player should also be centered
