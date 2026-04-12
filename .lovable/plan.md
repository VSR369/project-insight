

## Context Library — 3-Column Layout Redesign

### What the Claude mockup shows vs current implementation

The mockup proposes a **3-column side-by-side layout** instead of the current 2-column top + full-width digest bottom:

```text
Current layout:
┌────────────────────────────────────────────────────┐
│ DrawerHeader (buttons + search)                    │
├──────────────────┬─────────────────────────────────┤
│ SourceList (40%) │ SourceDetail (60%)              │
│                  │                                 │
├──────────────────┴─────────────────────────────────┤
│ DigestPanel (full width, bottom)                   │
└────────────────────────────────────────────────────┘

Mockup layout:
┌────────────────────────────────────────────────────┐
│ DrawerHeader (badges + buttons + search)           │
├────────────┬───────────────┬───────────────────────┤
│ Sources    │ Source Detail  │ Context Digest        │
│ (left col) │ (middle col)  │ (right col)           │
│            │               │                       │
│ Suggested  │ Title/URL     │ Generate btn          │
│  rows      │ Badges        │ Digest content        │
│ Accepted   │ Section       │ (scrollable)          │
│  grouped   │ Share toggle  │                       │
│            │ Summary tab   │ Word count            │
│ ─────────  │ Full Text tab │ Re-extract/Remove     │
│ Reject All │ Key Data tab  │ Save / Confirm&Close  │
│ Accept All │               │                       │
└────────────┴───────────────┴───────────────────────┘
```

### Key visual differences from mockup

1. **3-column layout**: Sources (~30%), Detail (~30%), Digest (~40%) — all side by side
2. **Header badges**: Shows "5 awaiting review" and "12 accepted + extracted" as colored badges inline with title, plus challenge title on the right
3. **Suggested sources**: Show access status badges (Paywall, Accessible) and extraction status (Extracting, Extracted) directly in the list row with checkboxes + accept/reject icons
4. **Accepted sources header**: Shows extracted vs empty count: "ACCEPTED (12 EXTRACTED · 3 EMPTY)"
5. **Bottom bar on sources**: "Reject all suggested" and "Accept all suggested" buttons pinned at bottom
6. **Detail panel**: Summary/Full Text/Key Data shown with checkmark indicators, "AI-generated summary" label
7. **Digest panel**: Shows source count + word count, "Generate Context from 12 sources" button, "3 sources skipped (empty extraction)" info, Save and Confirm & Close buttons at bottom, Re-extract and Remove buttons

### Implementation Plan (8 files, all under 200 lines)

#### 1. `ContextLibraryDrawer.tsx` — Switch to 3-column layout
- Change the flex layout from "2-col top + digest bottom" to "3-col side by side"
- Sources panel: `w-[30%]`, Detail panel: `w-[30%]`, Digest panel: `w-[40%]`
- Digest is now a right column, not a bottom panel

#### 2. `DrawerHeader.tsx` — Add summary badges
- Add colored badges: "{N} awaiting review" (amber) + "{N} accepted + extracted" (green)
- Show challenge title right-aligned
- Add `acceptedCount` and `extractedCount` props
- Keep existing action buttons (Re-discover, Add URL, Upload Document, Search)

#### 3. `SourceList.tsx` — Accepted count with extraction breakdown
- Change accepted header from "✅ Accepted (N)" to "ACCEPTED (X EXTRACTED · Y EMPTY)"
- Show access status badges (Paywall warning triangle, Accessible, etc.) on suggestion rows
- Move "Reject all suggested" / "Accept all suggested" buttons to a sticky bottom bar

#### 4. `SuggestionCard.tsx` — Show access status inline
- Add access_status badge (Paywall/Blocked) next to the source name
- Show extraction status badge (Extracting.../Extracted/Failed) inline

#### 5. `SourceDetail.tsx` — Match mockup detail panel
- Summary/Full Text/Key Data tabs with checkmark indicators (already implemented)
- Show "AI-generated summary (3 key points):" label before summary content
- No major structural changes needed — mostly styling alignment

#### 6. `DigestPanel.tsx` — Vertical column layout instead of horizontal
- Adapt from full-width bottom panel to tall right-column panel
- Show "Generate Context from N sources" button prominently
- Show "X sources skipped (empty extraction)" info line
- Move word count and section count to a compact format
- "Re-extract" and "Remove" buttons for individual management
- Save and "Confirm & Close" buttons pinned at bottom
- Keep RichTextEditor with min-h-[400px] for editing mode

#### 7. `ContentIndicators.tsx` — No changes needed
- Already shows S/T/D badges correctly

#### 8. `types.ts` / `index.ts` — No changes needed

### Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `ContextLibraryDrawer.tsx` | 3-column layout, pass extracted count |
| 2 | `DrawerHeader.tsx` | Summary badges (awaiting review, accepted+extracted) |
| 3 | `SourceList.tsx` | Extraction breakdown in accepted header, sticky bottom bar |
| 4 | `SuggestionCard.tsx` | Access status + extraction status badges inline |
| 5 | `SourceDetail.tsx` | "AI-generated summary" label, minor styling |
| 6 | `DigestPanel.tsx` | Vertical column layout, skip info, bottom action bar |

All components remain under 200 lines. No hook/service/type changes needed — purely layout and presentation adjustments.

