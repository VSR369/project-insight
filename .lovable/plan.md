

# Fix AI Review UX: Progress Bar, Consistent States, Auto-resize

## Problems Identified

1. **Inconsistent section states** — Image 1 shows "no issues found" (pass), Image 2 shows "Re-review this section" (addressed). The difference: "no issues found" = triage pass with no comments. "Re-review" = section was already accepted/addressed previously, then shows the re-review option. But to the user this is confusing — a pass section should also show a re-review option.

2. **No progress indicator for Phase 2** — Image 3 shows a section with no AI review at all ("Run Review with AI"). This happens because Phase 2 processes sections sequentially, and the user sees no indication that the AI is still working through the queue. Currently `aiReviewLoading` is a single boolean — no granular progress.

3. **Line item textareas don't auto-size on mount** — Image 4 shows truncated text in the AI Suggested Version. The `onInput` handler only fires on user typing, not on initial render.

## Changes

### 1. Progress bar for Phase 2 processing (`CurationReviewPage.tsx`)

Add two new state variables:
```typescript
const [phase2Progress, setPhase2Progress] = useState({ total: 0, completed: 0 });
```

In `handleAIReview`, after Phase 1 completes:
- Set `phase2Progress = { total: phase2_queue.length, completed: 0 }`
- After each sequential section completes, increment `completed`
- Reset to `{ total: 0, completed: 0 }` in `finally`

Render a `<Progress>` bar (already imported) in the right sidebar near the "Review Sections by AI" button when `phase2Progress.total > 0`:
```text
┌─────────────────────────────────┐
│ Phase 2: Deep review            │
│ ████████░░░░░░░░  4/10 sections │
│ [========================  40%] │
└─────────────────────────────────┘
```

Show the percentage and "N of M sections analyzed" text below the bar.

### 2. Consistent pass section behavior (`AIReviewInline.tsx`)

Currently, pass sections with no comments show a static green message with no actions. Fix: add a "Re-review this section" button below the "no issues found" message for pass sections that came from triage (not yet deep-reviewed). This makes pass sections actionable like addressed sections.

In the `isPassWithNoComments` block (~line 534-538), add the re-review button:
```tsx
{isPassWithNoComments ? (
  <div className="space-y-2">
    <p className="text-xs text-emerald-700 py-1 flex items-center gap-1.5">
      <Check className="h-3.5 w-3.5" />
      This section looks good — no issues found.
    </p>
    <Button size="sm" variant="outline" className="w-full text-xs h-7" 
            onClick={handleReReview} disabled={isReReviewing}>
      {isReReviewing ? <Loader2 /> : <RefreshCw />}
      Re-review this section
    </Button>
  </div>
) : ( ... )}
```

### 3. Auto-resize textareas on mount (`AIReviewResultPanel.tsx`)

The `EditableLineItems` component (~line 188-229) uses `onInput` for auto-resize. Add a `useEffect` + `ref` approach OR use a simpler callback ref pattern. The cleanest fix: add a `ref` callback on each textarea that triggers auto-resize on mount.

Replace the `onInput` handler with a combined `ref` + `onInput` approach:
```tsx
<Textarea
  ref={(el) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }}
  value={item}
  onChange={(e) => handleItemChange(i, e.target.value)}
  className="text-sm min-h-[2rem] flex-1 resize-none whitespace-pre-wrap py-1.5"
  rows={1}
  onInput={(e) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = target.scrollHeight + "px";
  }}
/>
```

The `ref` callback fires on mount and whenever `items` array changes (React re-renders with new key), ensuring text is fully visible immediately.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add `phase2Progress` state, update in loop, render Progress bar |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Add re-review button to pass sections |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Auto-resize textareas on mount via ref callback |

