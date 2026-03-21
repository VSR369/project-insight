

## Plan: Phase 1 — Extend AI Prompt for Category B Fields + Add Challenge Settings Panel to Curation Review

This plan addresses the expert feedback in priority order, implementing Phase 1 of the restructuring. No existing features are removed or broken.

---

### Phase 1A: Extend AI Prompt to Draft 13 Category B Fields

**Problem**: The AI generates problem statements, deliverables, and evaluation criteria but does NOT generate context/background, root causes, affected stakeholders, scoring rubrics, preferred approaches, or expected outcomes as separate persisted fields.

**Approach**: This is a prompt engineering change — no new UI needed. The `generate-challenge-spec` edge function prompt gets extended to include these fields in its output, and the response type + DB persistence are updated.

#### File: `supabase/functions/generate-challenge-spec/index.ts`
- Extend the system prompt to instruct the AI to also generate:
  - `context_background` (rich text)
  - `root_causes` (rich text)
  - `affected_stakeholders` (string array)
  - `current_deficiencies` (rich text)
  - `expected_outcomes` (string array)
  - `preferred_approach` (text)
  - `approaches_not_of_interest` (text)
  - `scoring_rubrics` (array of `{ criterion_name, levels: [{score, label, description}] }`)
  - `effort_level` (low/medium/high/expert)
  - `reward_description` (text)
  - `eligibility_notes` (text — already exists)
  - `phase_notes` (text)
  - `complexity_notes` (text)
- These are appended to the existing JSON output schema in the prompt

#### File: `src/hooks/mutations/useGenerateChallengeSpec.ts`
- Extend the `GeneratedSpec` interface with the new optional fields

#### File: `src/pages/cogniblend/AISpecReviewPage.tsx`
- When persisting the spec after approval, save new fields to the `challenges` record (they map to existing JSONB columns like `complexity_parameters` extended object, or the challenge's extended metadata)
- These fields are stored in a new JSONB column `extended_brief` on `challenges`

#### Migration: Add `extended_brief` JSONB column
- `ALTER TABLE challenges ADD COLUMN IF NOT EXISTS extended_brief JSONB DEFAULT '{}'::jsonb;`
- This single column holds all Category B fields as a structured JSON object, avoiding 13 separate column additions

---

### Phase 1B: Add "Challenge Settings" Panel to Curation Review

**Problem**: 16 Category A org-policy fields (rewards, timeline, access) are only available in the Manual Editor. Curators cannot set them in the AI path, forcing a context switch that kills trust.

**Approach**: Add three collapsible settings sections within the Curation Review page's existing group structure. Pre-populate with defaults from the challenge record or org defaults.

#### File: `src/pages/cogniblend/CurationReviewPage.tsx`
Changes to the SECTIONS array and groups:

1. **Add `ChallengeData` fields to the query** (line ~729):
   - Add: `submission_deadline, challenge_visibility, effort_level, hook, max_solutions, solver_eligibility_types, solver_visibility_types, extended_brief`

2. **Add new section definitions** to the SECTIONS array:
   - `submission_deadline` — Date picker, Attribution: "Org Policy"
   - `challenge_visibility` — Select dropdown (public/private/invite_only)
   - `effort_level` — Radio group (low/medium/high/expert) with reward guidance
   - `hook` — Text input for tagline
   - `extended_brief` — Collapsible sub-sections rendering context, root causes, stakeholders, etc.

3. **Update GROUPS** to include new section keys:
   - Content group: add `hook`, `extended_brief`
   - Evaluation group: already has `reward_structure` (which handles milestones via `RewardStructureDisplay`)
   - Publication group: add `submission_deadline`, `challenge_visibility`, `effort_level`

4. **Add inline editors** for the new fields:
   - Date picker for `submission_deadline`
   - Select for `challenge_visibility`
   - Radio group for `effort_level` (reuse constants from `StepRewards.tsx`)

#### File: `src/components/cogniblend/curation/CurationSectionEditor.tsx`
- Add `DateFieldEditor` — simple date input with save/cancel
- Add `SelectFieldEditor` — select dropdown with save/cancel
- Add `RadioFieldEditor` — radio group with save/cancel

#### File: `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` (NEW)
- Read-only + editable renderer for the `extended_brief` JSONB
- Shows: Context & Background, Root Causes, Affected Stakeholders, Expected Outcomes, Preferred Approach, Approaches Not of Interest as sub-sections
- Each sub-section is independently editable via Tiptap rich text or tag-style editors
- Saves back to the `extended_brief` JSONB column

---

### Phase 1C: Update Checklist Auto-Checks

#### File: `src/pages/cogniblend/CurationReviewPage.tsx`
- The existing	15-item checklist stays. No items are removed.
- The new fields enhance completeness but are not hard-blockers (they're already in the wizard as optional fields for non-Enterprise governance)

---

### What is NOT changed
- Manual Editor (8-step wizard) remains functional and accessible via `/cogni/challenges/:id/edit`
- All existing Curation Review sections remain unchanged
- No database columns are removed
- No existing routes are modified
- RewardStructureDisplay already handles reward tiers + milestones editing — no duplication

---

### Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Modify | `supabase/functions/generate-challenge-spec/index.ts` | Extend AI prompt for 13 Category B fields |
| Modify | `src/hooks/mutations/useGenerateChallengeSpec.ts` | Extend GeneratedSpec type |
| Modify | `src/pages/cogniblend/AISpecReviewPage.tsx` | Persist new fields on approval |
| Modify | `src/pages/cogniblend/CurationReviewPage.tsx` | Add settings sections + query fields |
| Modify | `src/components/cogniblend/curation/CurationSectionEditor.tsx` | Add Date/Select/Radio editors |
| Create | `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` | Extended brief renderer |
| Migration | Add `extended_brief` JSONB column to `challenges` | Single column for all Category B data |
| Deploy | Edge function redeployment | `generate-challenge-spec` |

---

### Clarification on Curator vs Creator Responsibility

The expert feedback correctly identifies that Category A fields (rewards, deadlines, visibility) are **org policy decisions** — they belong to the **Creator/Requestor** who knows their organization's policies, NOT the Curator. The Curator's job is quality assurance and content refinement.

However, in the current AI-assisted flow, the Creator has no place to enter these fields after the conversational intake. The solution is:

1. **AI Spec Review page** (Creator-facing): Add a collapsible "Challenge Settings" section where the Creator enters org-policy fields BEFORE submitting to Legal/Curation
2. **Curation Review page** (Curator-facing): Show these fields as **read-only with override capability** — Curator can see what the Creator set and adjust if needed

This preserves the correct responsibility model while closing the gap.

