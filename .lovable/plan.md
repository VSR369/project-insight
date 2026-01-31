

# Plan: Align StartPostWidget Icons with PulseCreatePage

## Problem Identified

The `StartPostWidget` (feed widget) has **different content type IDs** than `PulseCreatePage`, causing the pre-selection to fail when navigating.

### Current Mismatches

| Widget ID | Create Page ID | Match? |
|-----------|----------------|--------|
| `quick_post` | `post` | ❌ |
| `pulse_card` | `pulse-cards` | ❌ |
| (missing) | `gallery` | ❌ |

When user clicks "Quick Post" on the widget, it passes `selectedType: 'quick_post'`, but PulseCreatePage looks for `post`.

---

## Solution

Update `StartPostWidget.tsx` to match **exact IDs, order, and include Gallery**:

### Updated CONTENT_TYPES Configuration

```typescript
import { Film, Mic, Zap, FileText, Image, MessageSquare, Layers } from 'lucide-react';

const CONTENT_TYPES = [
  { id: 'reel', label: 'Reel', icon: Film, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { id: 'podcast', label: 'Podcast', icon: Mic, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'spark', label: 'Spark', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'article', label: 'Article', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'gallery', label: 'Gallery', icon: Image, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { id: 'post', label: 'Quick Post', icon: MessageSquare, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'pulse-cards', label: 'Pulse Cards', icon: Layers, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
] as const;
```

---

## Changes Required

### File: `src/components/pulse/widgets/StartPostWidget.tsx`

| Change | From | To |
|--------|------|-----|
| Import | Missing `Image` | Add `Image` import |
| Order | Random order | Match create page order |
| ID | `quick_post` | `post` |
| ID | `pulse_card` | `pulse-cards` |
| Add | - | `gallery` type |
| Grid | `grid-cols-3 sm:grid-cols-6` | `grid-cols-4 sm:grid-cols-7` (7 items) |

### Special Handling for Pulse Cards

The create page handles `pulse-cards` with a special `navigateTo` property. When clicking Pulse Cards in the widget, we should navigate directly to `/pulse/cards` instead of the create page.

```typescript
const handleContentTypeClick = (typeId: string) => {
  if (isFirstTime) {
    navigate('/welcome');
    return;
  }
  
  // Special case: Pulse Cards navigates directly
  if (typeId === 'pulse-cards') {
    navigate('/pulse/cards');
    return;
  }
  
  navigate('/pulse/create', { state: { selectedType: typeId } });
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/widgets/StartPostWidget.tsx` | Fix IDs, add Gallery, update order, handle Pulse Cards navigation |

---

## Expected Result

After fix, clicking any icon in the widget will:
1. Navigate to `/pulse/create` with correct pre-selected type
2. For Pulse Cards: Navigate directly to `/pulse/cards`
3. Match exact behavior of the create page

