

# Plan: Change Topic Selector to Inline Chips

## Overview
Replace the current dropdown/combobox topic selector with inline clickable topic chips/buttons for faster one-tap selection. This provides a more intuitive, mobile-friendly UX.

## Current State
- `TopicSelector.tsx` uses a Popover + Command pattern (dropdown with search)
- Requires 2 clicks: open dropdown → select topic
- Takes up vertical space when open

## Proposed UX
- Display all topics as horizontally scrollable chips
- Single tap to select a topic
- Selected topic has distinct visual treatment (filled/highlighted)
- Chips show topic icon + name
- Wrap or scroll horizontally if too many topics

## Implementation

### File: `src/components/pulse/cards/TopicSelector.tsx`

**Changes:**
1. Remove Popover, Command, and related imports
2. Replace with a flex container of Badge-style buttons
3. Use `ToggleGroup` pattern for single selection
4. Add horizontal scroll for overflow
5. Keep same props interface for backward compatibility

**New Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ Topic *                                                     │
│ ┌────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────┐  │
│ │🧠 AI   │ │💼 Business │ │🔧 DevOps │ │📊 Data Science │→ │
│ └────────┘ └────────────┘ └──────────┘ └─────────────────┘  │
│   ↑ selected (filled)     unselected (outline)              │
└─────────────────────────────────────────────────────────────┘
```

**Component Structure:**
- Horizontal flex container with `flex-wrap` or `overflow-x-auto`
- Each topic as a clickable button/chip
- Selected state: `bg-primary text-primary-foreground`
- Unselected state: `bg-muted hover:bg-muted/80`
- Loading state: skeleton chips
- Empty state: "No topics available"

### Visual Treatment
- **Selected chip**: Solid primary background, white text
- **Unselected chip**: Muted background with border, darker text
- **Hover**: Subtle background change
- **Disabled**: Reduced opacity
- **Icon**: Displayed before topic name
- **Card count**: Small badge or omit for cleaner look

## Technical Details

### Simplified Component Code Approach:
```tsx
// Use simple button mapping instead of ToggleGroup for flexibility
<div className="flex flex-wrap gap-2">
  {topics.map((topic) => (
    <button
      key={topic.id}
      onClick={() => onChange(topic.id)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
        "transition-colors focus:outline-none focus:ring-2",
        value === topic.id
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80 text-foreground"
      )}
      disabled={disabled}
    >
      {topic.icon && <span>{topic.icon}</span>}
      {topic.name}
    </button>
  ))}
</div>
```

### Loading State:
- Show 4-5 skeleton chips while loading

### Accessibility:
- Proper `role="radiogroup"` semantics
- `aria-checked` on selected chip
- Keyboard navigation support

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pulse/cards/TopicSelector.tsx` | Complete rewrite to chip-based UI |

## Benefits
- Faster selection (1 tap vs 2)
- All options visible at a glance
- More touch-friendly
- Better mobile experience
- No popover overlay blocking content

