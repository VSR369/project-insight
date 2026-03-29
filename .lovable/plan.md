

# Impact Analysis: Industry Segment Placement in Curation Flow

## Your Input Assessment

Your intuition is **correct**. Here's the analysis:

### Current State (3 locations, fragmented)

1. **Right Rail** (line 2442-2457): Read-only badge display — shows industry segment from `eligibility.industry_segment_id` but only if AM/Creator set it. Shows "No industry segment specified" otherwise — **no way for curator to set it**.

2. **Solver Expertise Section** (Tab 4 — Solvers & Schedule): If no industry segment exists, the curator can select one via a local dropdown inside the expertise tree. This is buried deep — curators may never reach it if they work tabs sequentially.

3. **`resolveIndustrySegmentId()` helper** (line 1073-1083): Falls back through `targeting_filters → eligibility → eligibility_model` — but none of these paths allow curator entry on the curation page itself.

### Problem

- If AM/Creator doesn't provide an industry segment, the curator **has no clear, mandatory entry point** to set it
- It's a prerequisite for the entire taxonomy cascade (proficiency areas, sub-domains, specialities) used by Solver Expertise, Domain Tags, and AI review context
- Currently buried in Tab 4 as an optional local selection — violates the dependency flow principle (prerequisites first)

### Recommendation: Context & Background (Tab 1) — Correct Place

Your suggestion to place it in **Context & Background** (first section of Tab 1 "Problem Definition") is architecturally sound because:

1. **Dependency flow**: Industry segment drives taxonomy cascades in Tabs 3-6. Setting it first ensures downstream sections have context.
2. **Origin attribution**: Context & Background already shows "from Intake" attribution — industry segment follows the same pattern (show AM/Creator value if present, mandate curator entry if absent).
3. **Natural context**: Industry segment IS contextual background — it frames the entire challenge domain.

## Plan (3 files, ~80 lines)

### Change 1: Add Industry Segment field to Context & Background section
**File:** `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`

- Add an `IndustrySegmentField` component at the top of the Context & Background subsection
- **If AM/Creator provided it**: Show as read-only Badge with "from Intake" attribution label
- **If not provided**: Show a mandatory `Select` dropdown (master data from `useIndustrySegments`) with red "Required" indicator
- On change, persist to `eligibility.industry_segment_id` via the parent's save handler
- New props on `ExtendedBriefDisplay`: `industrySegmentId`, `onIndustrySegmentChange`, `readOnly`

### Change 2: Wire industry segment prop from CurationReviewPage
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

- Pass `industrySegmentId` (from existing `resolveIndustrySegmentId()`) to `ExtendedBriefDisplay`
- Add `onIndustrySegmentChange` handler that writes to `eligibility.industry_segment_id` in the challenges table and invalidates the query
- Add industry segment to the pre-flight validation: if null, block submission with "Industry Segment required in Context & Background"

### Change 3: Update SolverExpertiseSection to use resolved value
**File:** `src/components/cogniblend/curation/SolverExpertiseSection.tsx`

- Remove the local `localSelectedSegmentId` fallback selector (lines 193-210) — industry segment is now always set upstream in Context & Background
- Keep the read-only display of the resolved industry segment name
- Remove the `industry_segment_id` from `SolverExpertiseData` save payload — it's no longer the expertise section's responsibility

### No DB Changes Required
The `eligibility` JSONB column already stores `industry_segment_id`. The write path already exists (line 2996-3002 in CurationReviewPage). This change just moves the entry point earlier in the flow.

## Risk
- Low: The persistence path (`eligibility.industry_segment_id`) is unchanged
- Backward compatible: Challenges where AM/Creator already set it continue to work (shown as read-only)
- `resolveIndustrySegmentId()` continues to resolve from all 3 sources — no fallback chain change

