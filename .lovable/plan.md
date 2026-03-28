

# Fix Submission Deadline: Date Renderer + Context-Aware Calculation

## Problem (2 issues)

1. **Rich text editor shown for a date field.** The `submission_deadline` section has format `'date'` in config, but the render priority chain in `AIReviewResultPanel.tsx` has no `date` branch. It falls through to `EditableRichText`, showing a full Tiptap editor for what should be a simple date display + date picker.

2. **AI calculates the deadline with insufficient context.** The `aiUsesContext` for `submission_deadline` is only `['phase_schedule']`. It should also consider deliverables, scope, complexity, and effort level to produce a meaningful deadline rather than a random date.

## Changes

### File 1: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

**A. Add date state + parser (near line 508)**
- Add `editedDate` state: `useState<string | null>(null)`
- Add `parsedDate` memo: detect when `sectionKey` has format `'date'` and extract the ISO date string from `result.suggested_version` (strip quotes, whitespace, markdown fences)

**B. Add `isDateFormat` helper (near line 176)**
```tsx
function isDateFormat(sectionKey: string): boolean {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format === 'date';
}
```

**C. Update `hasSuggestedVersion` (line 556)** — include `parsedDate` as a truthy signal

**D. Update `suggestedFormat` (line 567)** — add `if (parsedDate) return "date";` before the rich_text fallback

**E. Add date render branch in the ternary chain (before the `result.suggested_version` rich text fallback at line 997)**

Render a clean date display with an inline date input for editing:
```tsx
) : parsedDate ? (
  <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm">
    <div className="flex items-center gap-4">
      <CalendarIcon className="h-5 w-5 text-indigo-500 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">Suggested Deadline</p>
        <p className="text-lg font-semibold text-foreground">
          {format(new Date(editedDate ?? parsedDate), "MMMM d, yyyy")}
        </p>
      </div>
      <Input 
        type="date" 
        value={editedDate ?? parsedDate} 
        onChange={(e) => setEditedDate(e.target.value)}
        className="w-[180px] h-9 text-sm"
      />
    </div>
  </div>
)
```

No rich text editor. Just a formatted date with a date picker for adjustment.

**F. Wire `editedDate` into the accept flow** — update the `getEditedValue` or equivalent logic so that when `onAccept` fires for a date section, it passes the `editedDate ?? parsedDate` string (not rich text HTML).

### File 2: `src/lib/cogniblend/curationSectionFormats.ts`

Update `submission_deadline.aiUsesContext` to include full challenge context:
```ts
submission_deadline: {
  format: 'date',
  aiCanDraft: true,
  aiReviewEnabled: true,
  curatorCanEdit: true,
  aiUsesContext: ['phase_schedule', 'deliverables', 'scope', 'complexity', 'effort_level', 'evaluation_criteria'],
},
```

### File 3: `src/lib/aiReviewPromptTemplate.ts` (client-side prompt)

Enhance the `date` format instruction to guide contextual calculation:
```ts
date: 'Output: a single ISO date string YYYY-MM-DD. Calculate based on phase_schedule end dates, deliverables count, scope complexity, and effort level. The deadline should be the end date of the last phase in the schedule, or if no schedule exists, estimate based on scope and complexity (low=60d, medium=90d, high=120d, expert=180d from today). Never output null if phase_schedule data is available.',
```

### File 4: `supabase/functions/review-challenge-sections/promptTemplate.ts` (edge function prompt)

Same enhancement to the `date` format instruction — keep both in sync:
```ts
date: 'Output: a single ISO date string YYYY-MM-DD. Calculate based on phase_schedule end dates, deliverables count, scope complexity, and effort level. The deadline should be the end date of the last phase in the schedule, or if no schedule exists, estimate based on scope and complexity (low=60d, medium=90d, high=120d, expert=180d from today). Never output null if phase_schedule data is available.',
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Add date format detection, date state, date render branch (formatted date + date picker), wire into accept flow |
| `src/lib/cogniblend/curationSectionFormats.ts` | Expand `submission_deadline.aiUsesContext` to include deliverables, scope, complexity, effort_level, evaluation_criteria |
| `src/lib/aiReviewPromptTemplate.ts` | Enhance `date` format instruction with context-aware calculation guidance |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Same date format instruction enhancement |

