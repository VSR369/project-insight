

# Implement CREATOR ROLE Plan: Phase A → Phase B → AI Review → Submit

## Overview

The uploaded plan defines a 4-prompt implementation to restructure the Creator challenge flow with a Configuration Panel (Phase A), governance-aware form fields (Phase B), an AI Review drawer, and governance-aware submit labels/status messages.

Given the scope, this will be broken into **4 sequential implementation batches** matching the plan's CR-1 through CR-4.

---

## Current State

- `ChallengeCreatePage.tsx` (284 lines) — has `GovernanceEngagementSelector` inline (governance + engagement only, no industry segment at config level)
- `ChallengeCreatorForm.tsx` (573 lines) — **exceeds 200-line limit**, contains schema builder, form logic, draft load, submit, test data fill
- `EssentialDetailsTab.tsx` (326 lines) — **exceeds 200-line limit**, contains industry segment field (should move to config panel)
- `AdditionalContextTab.tsx` (322 lines) — **exceeds 200-line limit**
- `CreatorChallengeDetailView.tsx` (177 lines) — needs status message addition
- `check-challenge-quality` edge function exists — can be reused for Creator AI Review

---

## Batch 1: CR-1 — Field Rules Migration

**File:** New Supabase migration

SQL migration to update `md_governance_field_rules` with the exact visibility rules from the plan:
- QUICK: 5 required fields, hide scope/hook/context_background, auto ip_model
- STRUCTURED: 8 required fields, optional hook/context_background
- CONTROLLED: 12 required fields, all context fields required
- Industry segment hidden from form (elevated to config panel)
- AI-drafted fields hidden in QUICK, `ai_drafted` in STRUCTURED/CONTROLLED
- Curator-owned fields hidden in QUICK, optional in STRUCTURED/CONTROLLED
- Platform defaults set to `auto` in all modes

---

## Batch 2: CR-2 — Configuration Panel

### Extract and enhance `GovernanceEngagementSelector` → `ChallengeConfigurationPanel`

**New file:** `src/components/cogniblend/creator/ChallengeConfigurationPanel.tsx` (~180 lines)

Three configuration choices rendered as a card panel:

1. **Industry Segment** (NEW — elevated from EssentialDetailsTab)
   - Loads from `useIndustrySegmentOptions()` master data
   - Pre-fills from org's primary industry via `orgContext`
   - Guidance text as specified in the plan

2. **Governance Mode** (existing logic moved + enhanced descriptions)
   - Use the new `GOVERNANCE_DESCRIPTIONS` object with headline, body, bestFor
   - Tier-lock behavior preserved

3. **Engagement Model** (existing logic moved + enhanced descriptions)
   - Rich description cards for MP and AGG as specified in the plan

**Modified files:**
| File | Change |
|------|--------|
| `ChallengeCreatePage.tsx` | Replace `GovernanceEngagementSelector` with `ChallengeConfigurationPanel`, add `industrySegmentId` state, pass to form |
| `EssentialDetailsTab.tsx` | Remove industry segment field (moved to config panel) |
| `ChallengeCreatorForm.tsx` | Accept `industrySegmentId` prop, use it in payload |

### Decompose `ChallengeCreatorForm.tsx` (573 lines → 3 files)

The form currently exceeds the 200-line limit. Split into:

| New File | Contents | ~Lines |
|----------|----------|--------|
| `src/components/cogniblend/creator/creatorFormSchema.ts` | `buildCreatorSchema`, `CreatorFormValues` type, `toFormMaturityCode` | ~90 |
| `src/hooks/cogniblend/useCreatorDraftLoader.ts` | Draft loading effect + parse helpers | ~100 |
| `ChallengeCreatorForm.tsx` (slimmed) | Form provider, tabs, action bar, modals | ~180 |

### Decompose `EssentialDetailsTab.tsx` (326 lines → 2 files)

| New File | Contents | ~Lines |
|----------|----------|--------|
| `src/components/cogniblend/creator/EssentialFieldRenderers.tsx` | Maturity radio group, domain tag chips, budget range, IP model select | ~150 |
| `EssentialDetailsTab.tsx` (slimmed) | Layout composition calling field renderers | ~150 |

### Decompose `AdditionalContextTab.tsx` (322 lines → 2 files)

| New File | Contents | ~Lines |
|----------|----------|--------|
| `src/components/cogniblend/creator/StakeholderEditor.tsx` | Stakeholder table rows + add/remove logic | ~100 |
| `AdditionalContextTab.tsx` (slimmed) | Layout composition with context field, line items, file upload, URLs | ~200 |

---

## Batch 3: CR-3 — AI Review Button + Drawer

**New file:** `src/components/cogniblend/creator/CreatorAIReviewDrawer.tsx` (~180 lines)

A right-side Sheet drawer that:
1. On open: saves current form data, calls `check-challenge-quality` edge function
2. AI reviews ONLY Creator's fields (5/8/12 based on governance mode)
3. Displays per-field: score badge (green/amber/red) + AI comment
4. Overall quality score at top
5. For CONTROLLED: checkboxes per field, Submit gated until all checked

**New file:** `src/components/cogniblend/creator/AIReviewFieldCard.tsx` (~60 lines)

Individual field review card with score badge, comment, and optional checkbox.

**New file:** `src/hooks/cogniblend/useCreatorAIReview.ts` (~80 lines)

Hook wrapping the edge function call with mutation state.

**New constants:** `src/constants/creatorReviewFields.ts` (~40 lines)

Maps governance mode → array of field keys to review.

**Modified file:** `ChallengeCreatorForm.tsx`
- Add AI Review button between Save Draft and Submit
- QUICK: outline button, optional
- STRUCTURED: outline + "Recommended" badge
- CONTROLLED: primary + "Required" badge, Submit disabled until review complete
- State: `showAIReview`, `aiReviewCompleted`

---

## Batch 4: CR-4 — Submit Labels + Status Messages

**Modified file:** `ChallengeCreatorForm.tsx`
- Submit button label: `QUICK ? 'Submit & Publish' : 'Submit to Curator'`
- Post-submit toast: governance-aware messages

**Modified file:** `CreatorChallengeDetailView.tsx`
- Add `statusMessage` useMemo based on `current_phase` and governance mode
- Display as a status banner at top of the detail view

---

## File Summary

| Action | File | ~Lines |
|--------|------|--------|
| New | Migration SQL | ~60 |
| New | `creator/ChallengeConfigurationPanel.tsx` | ~180 |
| New | `creator/creatorFormSchema.ts` | ~90 |
| New | `hooks/cogniblend/useCreatorDraftLoader.ts` | ~100 |
| New | `creator/EssentialFieldRenderers.tsx` | ~150 |
| New | `creator/StakeholderEditor.tsx` | ~100 |
| New | `creator/CreatorAIReviewDrawer.tsx` | ~180 |
| New | `creator/AIReviewFieldCard.tsx` | ~60 |
| New | `hooks/cogniblend/useCreatorAIReview.ts` | ~80 |
| New | `constants/creatorReviewFields.ts` | ~40 |
| Modified | `ChallengeCreatePage.tsx` | ~180 |
| Modified | `ChallengeCreatorForm.tsx` | ~180 |
| Modified | `EssentialDetailsTab.tsx` | ~150 |
| Modified | `AdditionalContextTab.tsx` | ~200 |
| Modified | `CreatorChallengeDetailView.tsx` | ~190 |

All files stay under 200 lines. No `any` types. All rules complied with.

## Implementation Order

1. **CR-1** — Migration first (field rules must exist before UI reads them)
2. **CR-2** — Config panel + decomposition (largest batch)
3. **CR-3** — AI Review drawer + button
4. **CR-4** — Submit labels + status (smallest batch)

