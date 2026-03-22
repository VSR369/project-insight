

# Plan: Eliminate Space Wastage in Content Display Boxes

## Problem
Content boxes across the challenge lifecycle (AMRequestViewPage, AISpecReviewPage, CurationReviewPage, PublicChallengeDetailPage) waste vertical space because:
1. The `.editor-content p` CSS rule sets `min-height: 1.85em` — useful for the editor but bloats read-only views
2. The `.editor-content p` has `margin: 0 0 14px 0` — the last paragraph gets unnecessary bottom margin
3. `CardContent` uses `p-6 pt-0` (24px side/bottom padding) which is generous for short content
4. No distinction between "editing mode" and "display mode" in the shared `.editor-content` class

## Solution: Centralized CSS Fix

Rather than modifying every component individually, fix the root cause in `src/index.css` and `SafeHtmlRenderer.tsx`:

### 1. Add a display-mode CSS variant
**File**: `src/index.css`

Add a `.editor-content-display` modifier class (or scope via `.editor-content:not(.ProseMirror)`) that:
- Removes `min-height: 1.85em` from `<p>` tags (only needed during editing for cursor placement)
- Removes bottom margin from the last child element (`last-child { margin-bottom: 0 }`)
- This preserves the editor behavior while tightening read-only display

### 2. Apply the display class in SafeHtmlRenderer
**File**: `src/components/ui/SafeHtmlRenderer.tsx`

Add the `editor-content-display` class alongside `editor-content` so all read-only rendered content automatically gets the tighter spacing.

### 3. Apply the display class in AiContentRenderer
**File**: `src/components/ui/AiContentRenderer.tsx`

Same treatment — when rendering AI content in read-only mode, include the display class.

### 4. Tighten CardContent padding for content sections
**File**: `src/pages/cogniblend/PublicChallengeDetailPage.tsx`

Override `CardContent` padding to `p-4 pt-0` on content display cards (Problem Statement, Scope, etc.) to reduce side/bottom padding from 24px to 16px.

## CSS Changes (in `src/index.css`)

```css
/* Tighter display for read-only rendered content */
.editor-content-display p {
  min-height: unset;
}
.editor-content-display > *:last-child {
  margin-bottom: 0 !important;
}
```

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Add `.editor-content-display` rules to remove min-height and trailing margin |
| `src/components/ui/SafeHtmlRenderer.tsx` | Add `editor-content-display` class |
| `src/components/ui/AiContentRenderer.tsx` | Add `editor-content-display` class when rendering read-only |
| `src/pages/cogniblend/PublicChallengeDetailPage.tsx` | Tighten CardContent padding on content cards |

This is a 4-line CSS addition + 2 one-line class additions that fixes the spacing globally across every view page and role without touching individual components.

