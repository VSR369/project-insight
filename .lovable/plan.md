

# Apply Structured Card Format to Submission Guidelines

## What changes

Submission Guidelines will use the same structured card format as Expected Outcomes (Name + Description, no acceptance criteria), with a distinct badge color (amber/orange instead of blue). Both the original content and AI-suggested version will render as cards.

## Files to modify

### 1. `src/components/cogniblend/shared/AIReviewInline.tsx`
- Add `'submission_guidelines'` to `DELIVERABLE_LIKE_SECTIONS` set (line 41)
- Add case in `getDeliverableBadgePrefix`: return `"S"` for `submission_guidelines`

### 2. `src/pages/cogniblend/CurationReviewPage.tsx` (lines 2171-2199)
- Rewrite the `submission_guidelines` case to match the `expected_outcomes` pattern:
  - Parse structured items from `challenge.description` using `parseDeliverables(items, 'S')`
  - Pass `structuredItems`, `onSaveStructured`, `badgePrefix="S"`, `hideAcceptanceCriteria`
  - Save as `{ items: items.map(({ name, description }) => ({ name, description })) }`

### 3. `src/components/cogniblend/curation/renderers/DeliverableCardRenderer.tsx`
- Add a `badgeColorClass` prop (optional) to allow per-section badge colors
- Default remains blue; when `badgePrefix === "S"`, use amber: `bg-amber-50 text-amber-700 border-amber-200`
- Alternative: derive color from `badgePrefix` internally via a small lookup map

### 4. `src/components/cogniblend/curation/renderers/DeliverableCardEditor.tsx`
- Same badge color treatment — use amber for `"S"` prefix badges in edit mode

### 5. `src/components/cogniblend/curation/AIReviewResultPanel.tsx` (line 781)
- Extend `hideAcceptanceCriteria` check: `badgePrefix === "O" || badgePrefix === "S"`
- Apply same badge color logic for AI-suggested cards

## Badge color scheme
| Section | Prefix | Color |
|---------|--------|-------|
| Deliverables | D | Blue (`bg-blue-50 text-blue-700`) |
| Expected Outcomes | O | Blue (same) |
| Submission Guidelines | S | Amber (`bg-amber-50 text-amber-700 border-amber-200`) |

## Helper function addition
Add a utility in `DeliverableCardRenderer.tsx`:
```typescript
function getBadgeColorClass(prefix: string): string {
  if (prefix === "S") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800";
}
```

