

# Show "Review with AI" Only in Edit Mode

## Change

Currently `isEditMode` is `true` for both `view` and `edit` modes (line 170). The "Review with AI" button and `AIReviewInline` panels show in both. The fix is to gate them behind `mode === 'edit'` instead of `isEditMode`.

## File: `src/components/cogniblend/SimpleIntakeForm.tsx`

**Two button locations** (lines 513 and 803):
- Change `{isEditMode && challengeId && (` → `{mode === 'edit' && challengeId && (`

**All `AIReviewInline` render blocks** throughout the file:
- Same change: replace `isEditMode` gate with `mode === 'edit'` so inline review panels only appear in edit mode

This ensures the AI review features are hidden in read-only View mode and only activate when the user clicks "Edit".

