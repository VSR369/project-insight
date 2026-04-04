

# Gap Analysis: CREATOR ROLE Plan Implementation

## What IS Implemented (Confirmed Working)

| Item | Status | Evidence |
|------|--------|----------|
| CR-1: Migration SQL | Done | Migration file exists |
| CR-2: `ChallengeConfigurationPanel.tsx` | Done | 173 lines, under limit |
| CR-2: `creatorFormSchema.ts` | Done | 115 lines |
| CR-2: `useCreatorDraftLoader.ts` | Done | 111 lines |
| CR-2: `EssentialFieldRenderers.tsx` | Done | 128 lines |
| CR-2: `StakeholderEditor.tsx` | Done | 79 lines |
| CR-2: `EssentialDetailsTab.tsx` slimmed | Done | 105 lines |
| CR-2: `AdditionalContextTab.tsx` slimmed | Done | 141 lines |
| CR-2: `ChallengeCreatePage.tsx` slimmed | Done | 155 lines |
| CR-3: `CreatorAIReviewDrawer.tsx` | Done | 156 lines |
| CR-3: `AIReviewFieldCard.tsx` | Done | 60 lines |
| CR-3: `useCreatorAIReview.ts` | Done | 59 lines |
| CR-3: `creatorReviewFields.ts` | Done | 40 lines |
| CR-3: AI Review button with governance badges | Done | Lines 245-249 |
| CR-3: CONTROLLED submit gated on review | Done | Line 250 |
| CR-4: Submit labels ("Submit & Publish" / "Submit to Curator") | Done | Line 252 |
| CR-4: Governance-aware toast messages | Done | Lines 152-156 |
| CR-4: `statusMessage` in `CreatorChallengeDetailView` | Done | Lines 49-57, displayed at line 110 |

## Gaps Found

### Gap 1: `ChallengeCreatorForm.tsx` exceeds 200 lines (269 lines)

The form was decomposed but still has 269 lines, violating the 200-line rule. The file upload logic (lines 139-150) and the draft save logic (lines 172-201) are candidates for extraction.

**Fix:** Extract file upload into a `useFileUploader` hook (~30 lines) and extract draft save into a dedicated `useDraftSave` hook (~50 lines), bringing the form under 200 lines.

### Gap 2: Direct Supabase import in component file (Rule 2 violation)

Line 24: `import { supabase } from '@/integrations/supabase/client'` — used for file upload (lines 143-148). This violates the workspace rule "NEVER import Supabase client directly in component files."

**Fix:** Move the file upload + attachment insert logic into the `useFileUploader` hook (same extraction as Gap 1).

### Gap 3: `CreatorOrgContextCard.tsx` is 405 lines (pre-existing, outside plan scope but in creator folder)

Not part of the original plan, but a significant violation in the same feature area.

**Fix (optional, out of scope):** Flag for future decomposition — not blocking this plan.

---

## Implementation Plan (Gaps 1 + 2 only)

### Step 1: Create `src/hooks/cogniblend/useCreatorFileUpload.ts` (~40 lines)

Extract the file upload loop (lines 139-150 of `ChallengeCreatorForm.tsx`) into a hook that:
- Accepts `challengeId`, `orgId`, `userId`, `files`
- Calls `supabase.storage` and `supabase.from('challenge_attachments').insert()`
- Returns an `uploadFiles` async function

### Step 2: Create `src/hooks/cogniblend/useCreatorDraftSave.ts` (~60 lines)

Extract the `handleSaveDraft` logic (lines 172-201) into a hook that:
- Accepts form, org context, engagement/governance/industry state
- Uses `useSaveDraft` and `useUpdateDraft` mutations internally
- Returns `{ handleSaveDraft, isSaving, draftChallengeId }`

### Step 3: Slim `ChallengeCreatorForm.tsx` to ~180 lines

- Remove the direct `supabase` import
- Replace inline upload/draft logic with hook calls
- Keep: form setup, tabs, action bar, modals

### Files Changed

| File | Action | Target Lines |
|------|--------|-------------|
| `src/hooks/cogniblend/useCreatorFileUpload.ts` | New | ~40 |
| `src/hooks/cogniblend/useCreatorDraftSave.ts` | New | ~60 |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Modified | ~180 |

