

# Move Industry Segment Selector to Problem Statement Section

## Current State
The Industry Segment selector is embedded inside the `context_and_background` section (4th item in Tab 1: Foundation). It's not visible until the curator scrolls down or expands that section.

## Change
Move the Industry Segment selector block to render **above** the Problem Statement rich text editor — making it the first thing curators see when they open Tab 1: Foundation.

## Implementation

### File: `src/pages/cogniblend/CurationReviewPage.tsx`

**1. Move the industry segment UI block from `case "context_and_background"` to `case "problem_statement"`**

In the `problem_statement` case (~line 3268), insert the industry segment selector block (the `<div className="rounded-lg border...">` block currently at lines 3702-3754) **before** the `RichTextSectionRenderer`. This includes:
- The "Industry Segment" label with intake/required badges
- Read-only display when from intake or in viewer mode
- Editable dropdown when curator-set
- Mandatory selection dropdown when not yet set

**2. Remove the industry segment block from `context_and_background` case**

Delete lines ~3701-3754 from the `context_and_background` case so the selector only appears once.

**3. No other changes needed** — the `resolveIndustrySegmentId`, `handleIndustrySegmentChange`, `optimisticIndustrySegId`, and `industrySegments` variables are already in scope at the section render level.

## Technical Detail
- The industry segment resolution logic (`resolveIndustrySegmentId`) and mutation handler (`handleIndustrySegmentChange`) remain unchanged
- The `optimisticIndustrySegId` state variable and its setter remain at the page level
- The `useIndustrySegments()` hook call stays where it is
- Only the JSX render location changes — from `context_and_background` to `problem_statement`

