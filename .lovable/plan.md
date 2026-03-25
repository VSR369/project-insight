

# Reusable SectionCard Component

## What it does

A generic, reusable card component for displaying content sections with consistent styling, collapsible body, status badges, action buttons, and a full-screen modal expand option. Replaces the inline `EditableSectionCard` / `ReadOnlySectionCard` pattern found in `AISpecReviewPage.tsx` and can be adopted across curation, spec, and publication pages.

## Component API

```typescript
interface SectionCardProps {
  icon: React.ReactNode;           // Lucide icon element
  title: string;
  status: "draft" | "ai_generated" | "accepted" | "editing";
  defaultExpanded?: boolean;       // default true
  children: React.ReactNode;       // collapsible body content
  onAccept?: () => void;
  onDecline?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  hideActions?: boolean;           // hide footer action bar
  className?: string;
}
```

## Visual structure

```text
┌─────────────────────────────────────────────────┐
│  [icon] Title          [StatusBadge]    [↗ btn] │  ← header row
│  ▼ chevron                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  {children} — collapsible with animation        │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Accept] [Decline] [Edit] [AI Regenerate]      │  ← footer
└─────────────────────────────────────────────────┘
```

## Files to create / modify

| File | Change |
|------|--------|
| `src/components/cogniblend/shared/SectionCard.tsx` | **New** — reusable component |

## Implementation details

### 1. `SectionCard.tsx`

- **Card wrapper**: `rounded-xl border border-gray-100 bg-white shadow-sm p-6`; when `status === "accepted"`, add `border-primary/30 bg-primary/5`
- **Header**: flex row with icon, title (`font-semibold text-gray-800`), status badge (color-coded: Draft=gray, AI Generated=amber with Sparkles icon, Accepted=green with Check), and top-right expand button (`Maximize2` icon)
- **Collapsible body**: Use Radix `Collapsible` with `CollapsibleContent` + CSS `animate-accordion-down/up` for smooth open/close. Chevron rotates 180° when open. `gap-4` spacing inside
- **Footer action bar**: Conditionally rendered row with four buttons:
  - **Accept**: `variant="outline"` with `Check` icon, green tint
  - **Decline**: `variant="outline"` with `X` icon, red/destructive tint
  - **Edit**: `variant="ghost"` with `Pencil` icon
  - **AI Regenerate**: `variant="ghost"` with `RefreshCw` + `Sparkles` icon
  - Each button only renders if its callback prop is provided
- **Full-screen modal**: Local `isFullScreen` state. When toggled, render a `Dialog` with `max-w-4xl` containing the same `{children}` + action bar. Uses existing `Dialog` component
- **Padding**: `p-6` on card, `gap-4` between header/body/footer via `space-y-4`

### 2. Status badge mapping

| Status | Badge color | Label | Icon |
|--------|------------|-------|------|
| `draft` | `bg-gray-100 text-gray-600` | Draft | — |
| `ai_generated` | `bg-amber-100 text-amber-700` | AI Generated | Sparkles |
| `accepted` | `bg-green-100 text-green-800` | Accepted | Check |
| `editing` | `bg-blue-100 text-blue-700` | Editing | Pencil |

No changes to existing pages in this step — the component is created as a standalone reusable building block ready for adoption.

