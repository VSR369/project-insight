

# Reassignment Requests Screen — Figma Gap Analysis & Fix Plan

## Gaps Identified

| # | Figma Design | Current Implementation | Fix |
|---|-------------|----------------------|-----|
| 1 | **"Reassignment Requests (3 pending)"** inline in header | Count on separate `<p>` line | Move count inline as muted parenthetical |
| 2 | **"Pending (3)"** count in tab trigger | Just "Pending" | Add count to Pending tab label |
| 3 | **No "At-Risk Only" checkbox** | Checkbox filter exists | Remove the at-risk checkbox |
| 4 | **Org name large bold** (`text-lg font-bold`) | `font-semibold text-sm` | Increase size |
| 5 | **Admin line**: "Ravi Kumar · 🟡 Partially Available" (colored dot + status badge text) — no "Requested by:" prefix | "Requested by: **Name**" + outline badge | Remove prefix, show as "Name · dot StatusBadge" using `AdminStatusBadge` |
| 6 | **Reason as muted italic text** with "Read more" link in blue | Has "Reason:" prefix label | Remove "Reason:" prefix, show as muted text directly |
| 7 | **SLA bar full-width** with percentage on right + breach time text (e.g., "Breached 4h ago", "75%") | Compact 120px bar in header row | Move SLA bar to its own full-width row with percentage |
| 8 | **Tier badge**: solid colored background (dark red for T3, amber for T1) | Outline variant with emoji | Use solid filled badges, no emoji — just "▲ T3", "▲ T1" |
| 9 | **Warning banner text**: "Last allowed reassignment after this, Supervisor override required." | "This is the last allowed reassignment (2/3)" | Update text to match Figma |
| 10 | **Decline expanded state**: Full-width textarea "Decline reason (required)" + "Confirm Decline" red button + "Cancel" text — below the card content | Inline beside Assign button with small textarea | Redesign: textarea full-width below buttons, "Confirm Decline" destructive + "Cancel" ghost |
| 11 | **"Assign →"** button text | "Assign" with ArrowRight icon | Already close, ensure arrow is `→` text not icon for consistency |

## Files to Change

### 1. `src/pages/admin/reassignments/ReassignmentInboxPage.tsx`
- Move pending count inline: `Reassignment Requests (N pending)`
- Add count to Pending tab: `Pending (N)`
- Remove the "At-Risk Only" checkbox entirely

### 2. `src/components/admin/reassignments/ReassignmentRequestCard.tsx`
- Increase org name to `text-lg font-bold`
- Replace "Requested by:" with plain "Name · StatusBadge" format using dot separator and `AdminStatusBadge`
- Remove "Reason:" prefix, show reason as muted italic text
- Redesign `CompactSLABar` to full-width with percentage on right, breach time text (e.g., "Breached 4h ago")
- Update tier badges to solid fill (dark red bg for T3, amber for T1), use "▲" triangle instead of emoji
- Update warning banner text to "Last allowed reassignment after this, Supervisor override required."
- Redesign decline state: full-width textarea below buttons, placeholder "Decline reason (required)", "Confirm Decline" red button + "Cancel" text button on a new row

