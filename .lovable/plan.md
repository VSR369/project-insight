

## Fix: Right Rail Ordering Buries Primary Action

### Problem
The current right rail ordering places Wave Progress, AI Quality, and Confidence Summary before the AI Review Summary and Budget Revision panels, burying important contextual information. The requested order prioritizes the workflow sequence: primary actions first, then progress, then analysis cards, then submission controls.

### Changes

**File: `src/components/cogniblend/curation/CurationRightRail.tsx`**

Reorder the JSX children in the return block to match the requested priority:

1. Primary AI workflow buttons (Analyse / Generate) — already first, add Tooltip wrapper around Generate Suggestions button
2. Wave Progress panel — move up from position 6
3. Completeness Checklist — stays in position 3
4. Context Library card — stays in position 4
5. AI Review Summary card — move up from position 8
6. Budget Revision panel — stays roughly same
7. Completion Banner — stays roughly same
8. AI Quality card — move down from position 4
9. AI Confidence Summary — move down from position 5
10. Curation Actions (submission) — stays near bottom
11. Legal Review panel — stays near bottom
12. Modification Points Tracker — stays last

Also wrap the "Generate Suggestions" button in a proper `Tooltip`/`TooltipTrigger`/`TooltipContent` from shadcn (replacing the plain `title` attribute), and remove the separate helper text paragraph below it. Add `Tooltip, TooltipTrigger, TooltipContent` imports from `@/components/ui/tooltip`.

### Files changed

| File | Action |
|------|--------|
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Reorder JSX children + add Tooltip wrapper |

