

# Fix Expected Outcomes: Make Mandatory for Creator + Fix Data Mapping

## Problems Found

1. **Expected Outcomes hidden for QUICK mode** — currently only shown for STRUCTURED/CONTROLLED. You want it mandatory for ALL Creator modes.

2. **Critical data mapping bug** in `useSubmitSolutionRequest.ts`:
   - Line 85: `scope: payload.expectedOutcomes` — Creator's expected outcomes is incorrectly saved to the `scope` DB column
   - Line 184: `constraints: data.scope` — Creator's "Scope" field is mapped to `constraints` in the payload, which is never written to the DB
   - The `expected_outcomes` DB column is **never populated** — that's why the Pre-Flight Gate always shows it as empty
   - The `scope` DB column gets overwritten with expected outcomes text instead of actual scope

3. **Navigation from Pre-Flight dialog works correctly** — clicking rows navigates to the right tab. Context & Background and Deliverables remain Curator/AI-generated sections as intended.

## Changes

### 1. Make Expected Outcomes mandatory for all modes
**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

- Change `outcomesRule`: remove the QUICK exception — make it required for all governance modes with a minimum character count (e.g., 50 chars)
- Remove the `{!isQuick && ...}` conditional wrapper around the Expected Outcomes field

**File: `src/components/cogniblend/creator/EssentialDetailsTab.tsx`**

- Remove the `{!isQuick && ...}` guard around the Expected Outcomes section so it always renders

### 2. Fix the data mapping in payload and submission
**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

In `buildPayload()`, fix the field mapping:
- `constraints` should remain as `data.scope` (this is correct)
- Add a new `expectedOutcomes` field that maps to `data.expected_outcomes` (this is correct)
- The issue is downstream in `useSubmitSolutionRequest`

**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**

Fix the DB column mapping in both the create and draft-save paths:
- Line 84-85: Change `scope: payload.expectedOutcomes` → `scope: payload.constraints`
- Add: `expected_outcomes: payload.expectedOutcomes ? JSON.stringify({ items: [{ name: payload.expectedOutcomes }] }) : null`

This ensures:
- `scope` DB column receives the Creator's **Scope** text
- `expected_outcomes` DB column receives the Creator's **Expected Outcomes** text (formatted as the JSON structure the Curation page expects)

### 3. Apply same fix to the draft/update path (~line 210-213)
**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**

Same column mapping fix for the second `.update()` call used in draft saves.

## Result
- Expected Outcomes appears for ALL Creator modes (QUICK, STRUCTURED, CONTROLLED)
- Creator's scope text correctly populates the `scope` DB column
- Creator's expected outcomes correctly populates the `expected_outcomes` DB column
- Curation page Pre-Flight Gate will see expected outcomes as filled
- Context & Background and Deliverables remain Curator/AI-generated (no change)

