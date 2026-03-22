

# Plan: Add Governance Mode & Engagement Model Selectors to AI-Assisted Tab

## What Changes

Add Governance Mode cards (QUICK / STRUCTURED / CONTROLLED) and Engagement Model dropdown (MP / AGG) at the top of the `ConversationalIntakeContent` component, before the Template Selector. This matches the wizard's Step 0 design shown in the screenshot.

## Changes

### File: `src/pages/cogniblend/ConversationalIntakePage.tsx`

1. **Import dependencies**: Add `getAvailableGovernanceModes`, `GOVERNANCE_MODE_CONFIG`, `GovernanceMode` from governance lib. Add `Zap`, `Info` icons. Add `cn` utility.

2. **Add state for governance mode and engagement model**:
   - `governanceMode` state, defaulting from `currentOrg.governanceProfile` (resolved via `resolveGovernanceMode`)
   - `engagementModel` state, defaulting from `currentOrg.operatingModel`
   - Compute `disabledModes` from `getAvailableGovernanceModes(currentOrg.tierCode)`

3. **Insert Governance Mode + Engagement Model UI** between the header and the Template Selector (after the AI failure banner, before line 584). Render:

   **Section 1 — Governance Mode**: 3-column grid of mode cards (QUICK, STRUCTURED, CONTROLLED) with icon, label, feature bullets, selected indicator, and disabled/upgrade badges. Reuse the exact visual pattern from `StepModeSelection.tsx` (inline, not importing the component since it depends on react-hook-form's Controller).

   **Section 2 — Engagement Model**: Dropdown select (MP/AGG) with info box below explaining the selected model. Same design as StepModeSelection.

4. **Wire governance mode into spec generation**: Pass the selected `governanceMode` to `getPostGenerationRoute` instead of always reading from org profile. This allows per-challenge governance selection.

5. **Wire engagement model into challenge creation payload**: Include the selected `engagementModel` in the `createChallenge.mutateAsync` call.

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Add governance mode cards + engagement model selector at top of form, wire selections into generation/creation flow |

## What is NOT Changed

- StepModeSelection component (wizard) — untouched
- SimpleIntakeForm (RQ/AM) — untouched
- ChallengeCreatePage routing — untouched

