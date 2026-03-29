

# Fix: PreFlightGateDialog — Intuitive UX with Navigation

## Problems Identified

1. **"Fill them first" button** just closes the dialog — no navigation, user is lost
2. **Warning items have no click-to-navigate** — user sees section names but can't act on them
3. **No tab context** — user doesn't know which tab a section lives in
4. **Duplicate/verbose reason text** — "Will be AI-generated" repeated, cluttering the UI
5. **Blocking mode shows separate "Go to X" buttons per section** — doesn't scale, no visual hierarchy

## Design

Redesign the dialog into a clean checklist with clickable rows:

```text
┌─────────────────────────────────────────────────┐
│  ✕  Cannot run AI review                        │
│  Complete these sections before AI can proceed   │
│─────────────────────────────────────────────────│
│  REQUIRED — Must be filled                       │
│  ┌─────────────────────────────────────────────┐│
│  │ ✕ Problem Statement     Tab 1 →  [Go to]   ││
│  │   Min 50 chars required                     ││
│  ├─────────────────────────────────────────────┤│
│  │ ✕ Industry Segment      Tab 1 →  [Go to]   ││
│  │   Must be set in Context & Background       ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  RECOMMENDED — Will be AI-generated              │
│  ┌─────────────────────────────────────────────┐│
│  │ △ Context & Background  Tab 1 →  [Go to]   ││
│  │ △ Expected Outcomes     Tab 1 →  [Go to]   ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│          [Go to first required section]          │
│    or    [Proceed — AI will generate empty ones] │
└─────────────────────────────────────────────────┘
```

Key UX improvements:
- Every row is clickable → navigates to the correct tab and closes the dialog
- Tab name badge shown on each row (e.g. "Problem Definition") so user knows where to go
- Compact reason text — one line, no duplication
- Footer has a single primary CTA: "Go to first required section" (blocking) or dual buttons (warnings only)
- Warning rows also clickable for users who want to fill them manually

## Changes

### File 1: `src/components/cogniblend/curation/PreFlightGateDialog.tsx` (full rewrite)

- Add `tabLabel` resolution: map each `sectionId` → its parent GROUPS tab label using a static lookup
- Render mandatory items with red styling, each as a clickable row with `→` arrow and tab badge
- Render warning items with amber styling, same clickable pattern
- **Blocking footer**: Single "Go to {first missing section}" button
- **Warning footer**: "Fill them first" navigates to first warning section; "Proceed with AI generation" unchanged
- Add `ChevronRight` icon on each row for affordance

### File 2: `src/lib/cogniblend/preFlightCheck.ts` (add tab mapping)

- Export a `SECTION_TO_TAB` map so the dialog can show which tab each section belongs to
- Map: `problem_statement → Problem Definition`, `scope → Problem Definition`, `context_and_background → Problem Definition`, etc.

No other files change.

