

# Fix Missing AI Review UI for AM/RQ and CR/CA Roles

## Problems Found

### 1. SimpleIntakeForm (AM/RQ) — AI Review button hidden in view mode
The "Review with AI" button and `AIReviewInline` panels only render when `isEditMode` is true. While `isEditMode` technically includes view mode (line 170), the condition `{isEditMode && challengeId && (` works correctly. However, the user on the **create page** (`/cogni/challenges/create`) sees nothing because create mode has no challengeId yet.

**Fix**: Also show the AI Review button and inline panels in **view mode** (not just edit). The button should appear whenever viewing an existing challenge. Currently this works on the view page but NOT on create — which is correct by design. The real gap is that the user has no clear path to the view page after creation. Additionally, in view mode the inline panels should be visible even without clicking "Edit".

### 2. AISpecReviewPage (CR/CA) — Handlers defined but UI never rendered
- `handleRunSpecAiReview` is defined (line 867) but **never called from any button in the JSX**
- `AIReviewInline` is imported (line 56) but **never rendered in the JSX** — neither in QUICK mode nor STRUCTURED mode
- `handleSpecAcceptRefinement`, `handleSpecSingleReview`, `handleSpecMarkAddressed` are all defined but unused

**Fix**: Wire the "Review Sections by AI" button into the header area of STRUCTURED mode, and render `AIReviewInline` below each `EditableSectionCard`.

## Changes

### File 1: `src/pages/cogniblend/AISpecReviewPage.tsx`

**STRUCTURED mode header** (after line 1635, before the AM Brief panel):
- Add "Review Sections by AI" button calling `handleRunSpecAiReview`

**STRUCTURED mode section cards** (inside the SPEC_SECTIONS map, after each `EditableSectionCard` at line 1778):
- Render `AIReviewInline` for each section with matching `sectionKey`, passing `roleContext="spec"`, the review data from `aiReviews`, and the accept/review/addressed handlers

### File 2: `src/components/cogniblend/SimpleIntakeForm.tsx`

- Change AI Review button visibility from `isEditMode` to `(isEditMode || isViewMode)` so the button and inline panels also show in read-only view mode (they already do since `isEditMode` includes view, but ensure consistency)
- No functional change needed — the current code already supports view mode. The user's issue is they are on the create page which has no challengeId.

## Technical Details

For AISpecReviewPage STRUCTURED mode, after each `EditableSectionCard`:

```tsx
<AIReviewInline
  sectionKey={section.fieldKey}
  review={aiReviews[section.fieldKey]}
  currentContent={getFieldValue(section.fieldKey)}
  challengeId={challengeId!}
  challengeContext={{ title: challenge.title, maturity_level: challenge.maturity_level as string | null }}
  onAcceptRefinement={handleSpecAcceptRefinement}
  onSingleSectionReview={handleSpecSingleReview}
  onMarkAddressed={handleSpecMarkAddressed}
  roleContext="spec"
  defaultOpen={aiReviews[section.fieldKey]?.status === 'needs_revision' || aiReviews[section.fieldKey]?.status === 'warning'}
/>
```

**Files modified**: 1 (`AISpecReviewPage.tsx`)
**Files unchanged**: `SimpleIntakeForm.tsx` (already works in view/edit mode — the user just needs to navigate to the view page)

