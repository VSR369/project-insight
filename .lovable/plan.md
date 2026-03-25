

# Curator UX Visual Polish — Final Aligned Plan

## What's Already Done (No Work Needed)

Claude's review identified 7 "gaps" — 6 of 7 are already implemented in the codebase:
- 2-phase batched triage pipeline (`triage-challenge-sections` edge function)
- Tiptap editor in AI suggestions (`EditableRichText` → `RichTextEditor`)
- `ExpandableAIComment` component (72px collapse, gradient fade, 320px scroll)
- `BulkActionBar` (Accept all passing / Review warnings)
- `LineItemsSectionRenderer` (numbered card blocks)
- `convertAITextToHTML` with `(1) text` parenthetical pattern detection

## Actual Changes Needed

### Phase 1 — Typography & Font (highest impact, zero risk)

**File: `index.html`**
- Add Google Fonts import for Inter (400, 500, 600, 700)

**File: `src/index.css`**
- Replace `.editor-content { font-family: Georgia, 'Times New Roman', serif }` with `'Inter', system-ui, sans-serif`
- Change `line-height: 1.85` → `1.75`
- Apply Inter universally — **no serif anywhere**, including fullscreen modal (per Claude's Conflict 3 override)

### Phase 2 — Section Panel Accent Bars & Badge Sizes

**File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`**

Add 4px left border accent by status:
- `not_reviewed`: transparent
- `pass` / `accepted`: emerald-400
- `warning`: amber-400
- `needs_revision`: red-400
- `view_only`: blue-400

Update badge font sizes from `text-[10px]` / `text-[9px]` → `text-[11px]` with proper padding.

Add `shadow-sm hover:shadow-md transition-shadow` to the panel container.

### Phase 3 — Two-Row Header Layout

**File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`**

Split the single-row header into two visual rows:
- **Row 1 (primary):** Chevron + Checkbox + Fill icon + Label + Status badge + Expand/Accept buttons
- **Row 2 (secondary, smaller/muted):** Attribution badge + Prompt source badge + Inline flags

This reduces cognitive overload — primary info stands out, metadata recedes.

### Phase 4 — AI Review Block Elevation

**File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`**

- Replace the dashed "vs AI Suggestion" divider with a clean horizontal rule + centered pill badge ("AI Analysis" with Bot icon)
- Increase comment card padding from `p-3` → `p-4`, add `shadow-xs` border
- Make severity badges 11px with consistent icons
- **Flat solid fills only** — no gradients (per Claude's Conflict 1 override)
- **No pulse animations** on Accept button (per Claude's Conflict 2 override)

### Phase 5 — Elevated AI Suggestion Box

**File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`**

- Replace `border-primary/20 bg-primary/5` with solid `bg-indigo-50 border-indigo-200 shadow-sm`
- Add proper header bar: Sparkles icon + "AI Suggested Version" semibold + "Editable" badge
- 4px indigo left accent line
- Increase min-height for rich text suggestions

### Phase 6 — Action Button Redesign

**File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`**

- Make "Accept suggestion" button `h-10` with solid `bg-emerald-600 hover:bg-emerald-700`
- Make "Keep original" a proper outlined button with more visual presence
- Sticky footer positioning within the panel when suggestion is present

### Phase 7 — Format-Aware Empty States

**New file: `src/components/cogniblend/curation/SectionEmptyState.tsx`**

Per-format contextual placeholders:
- Rich text: "Write or generate a problem statement..."
- Line items: "Add deliverables or let AI generate them"
- Table: mini table skeleton + "Add evaluation criteria"
- Date: calendar icon + "Set submission deadline"
- Select: radio illustration + "Choose an option"

**File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`**
- Replace generic "Click to add content or Generate with AI" with `SectionEmptyState`

### Phase 8 — Pass Section Clean Confirmed State

**File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`**

- Replace plain "no issues found" with a clean card: solid emerald-50 background, CheckCircle icon, "Section Verified" text, confidence percentage
- **No stamp graphic** (per Claude's Conflict 4 override) — just green left accent bar + "Verified" badge + collapse

### Phase 9 — Master Data Source Tags (Gap 6)

**File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`**

- When a section is populated from master data, show a small "Source: Master Data" tag
- Add "Reset to Master" option in section actions
- Visual indicator (subtle icon) on master-filled fields

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Add Inter font import from Google Fonts |
| `src/index.css` | Georgia → Inter, line-height 1.85 → 1.75, universal sans-serif |
| `CuratorSectionPanel.tsx` | 4px accent bars, two-row header, badge sizes 11px, shadow, empty state swap, master data tags |
| `AIReviewResultPanel.tsx` | Comment card elevation, suggestion box redesign, action buttons h-10, divider redesign, pass celebration state |
| New: `SectionEmptyState.tsx` | Format-aware contextual empty states |

## Design Principles Applied

- **Flat solid fills** — no gradients anywhere (professional SaaS aesthetic)
- **Inter font universal** — no serif fallbacks, not even in modals
- **No micro-animations** — status communicated via color accents only
- **No playful elements** — enterprise-appropriate verified states

