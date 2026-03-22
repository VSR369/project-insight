

# Plan: Make Industry Segment Editable by CR/CA

## Current State
The `DomainTargetingCard` displays Industry Segment as read-only text with a "From AM/RQ" badge. CR/CA cannot change it.

## Change

### File: `src/components/cogniblend/spec/DomainTargetingCard.tsx`

- Add `onIndustrySegmentChange: (id: string) => void` to props
- Replace the read-only segment display with a `Select` dropdown populated from `useIndustrySegmentOptions()`
- Show the original AM/RQ segment as a subtle reference label (e.g., "Originally: Healthcare" in muted text) so the CR/CA knows what was submitted
- When the segment changes, clear downstream selections (prof areas, sub domains, specialities) since they cascade from the segment
- Remove the `if (!industrySegmentId) return null` guard — show the card with the dropdown even if no segment was pre-selected

### File: `src/pages/cogniblend/AISpecReviewPage.tsx`

- Add `industrySegmentId` to local state (initialized from `eligibility.industry_segment_id`)
- Store the original AM/RQ segment ID separately for reference display
- Pass `onIndustrySegmentChange` handler that updates state and clears downstream selections
- Update submission handlers to save the potentially changed segment ID

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/spec/DomainTargetingCard.tsx` | Replace read-only segment with editable Select dropdown, show original as reference |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Add segment state management and change handler |

