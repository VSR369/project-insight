

# Final Gap Closure — 7 Prompts Implementation Plan

## Overview
Bug fix (AM_APPROVAL_PENDING → CR_APPROVAL_PENDING) + Phase 9 curation progress tracking and tiered Creator approval UI. 14 new/modified files, 1 DB migration.

---

## Step 1: Bug Fix — MyActionItemsSection
**File:** `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`

Replace 4 occurrences of `AM_APPROVAL_PENDING` with `CR_APPROVAL_PENDING`:
- Line 40: status config key
- Line 154: comment
- Line 158: filter condition
- Line 164: status assignment

---

## Step 2: DB Migration — curation_progress table
Create migration with:
- `curation_progress` table (challenge_id PK, status, sections_reviewed/total, current_wave, timestamps, estimated_minutes_remaining)
- RLS: authenticated read/write
- Trigger `trg_init_curation_progress`: auto-creates row when `current_phase` transitions to 2
- Add table to `supabase_realtime` publication

---

## Step 3: Hook — useCurationProgress
**New file:** `src/hooks/cogniblend/useCurationProgress.ts` (~120 lines)

- `useCurationProgress(challengeId)`: React Query + Supabase Realtime subscription for live updates
- `useUpdateCurationProgress()`: mutation to upsert progress rows
- Realtime channel pattern: subscribe to `postgres_changes` on `curation_progress` filtered by challenge_id

---

## Step 4: Wire Progress into Wave Executor + Curation Actions
**Modified files:**
1. `src/hooks/useWaveExecutor.ts` — Add optional `onProgress` callback to options interface with `onWaveStart`, `onWaveComplete`, `onAllComplete`. Fire at wave boundaries.
2. `src/pages/cogniblend/CurationReviewPage.tsx` — Import `useUpdateCurationProgress`, pass `onProgress` handlers to `useWaveExecutor` call at line 1585.
3. `src/components/cogniblend/curation/CurationActions.tsx` — After `crApprovalMutation` success (line 232-237), also update `curation_progress` status to `sent_for_approval`.

---

## Step 5: Creator Progress Tracker Components
**3 new files + 1 modification:**

1. `src/components/cogniblend/progress/ProgressStepper.tsx` (<100 lines) — 5-step horizontal indicator (Submit → Research → AI Review → Curator Editing → Ready). Maps `status` to active step with pulse animation.

2. `src/components/cogniblend/progress/ProgressDetailCard.tsx` (<100 lines) — Status message, last activity time (date-fns `formatDistanceToNow`), estimated time remaining, helpful context text. Uses `Card`.

3. `src/components/cogniblend/progress/CurationProgressTracker.tsx` (<80 lines) — Orchestrator composing Stepper + DetailCard. Uses `useCurationProgress` hook. Skeleton loading state.

4. `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` — Update status badge (line 556) to show "Awaiting Your Approval" for CR_APPROVAL_PENDING. Add `CurationProgressTracker` below badges when phase 2-3 and not pending approval.

---

## Step 6: Approval Tier Constants + Hook
**2 new files:**

1. `src/lib/cogniblend/approvalTiers.ts` (<80 lines) — `APPROVAL_TIERS` array with 3 tiers: "Your Challenge" (5 core sections), "How It'll Work" (5 operational sections), "AI-Generated Details" (17 AI sections). `getTierForSection()` helper.

2. `src/hooks/cogniblend/useApprovalTiers.ts` (<100 lines) — Computes `TierSummary[]` from challenge data + creator snapshot + `challenge_section_approvals` table. Filters to sections with content. Note: needs a new query hook since existing `useSectionApprovals` is curator-side only — will add a `useQuery` for `challenge_section_approvals` within this hook.

---

## Step 7: Tiered Approval UI Components
**4 new files + 1 modification:**

1. `src/components/cogniblend/approval/ApprovalSectionCard.tsx` (<150 lines) — Section card showing Creator original (collapsible) vs Curator version, approval status badge, Approve/Request Change buttons with comment textarea.

2. `src/components/cogniblend/approval/ApprovalTierGroup.tsx` (<120 lines) — Collapsible tier group wrapping multiple section cards. Shows approved count badge. Tier 3 gets "AI handled these" label.

3. `src/components/cogniblend/approval/ApprovalProgressBar.tsx` (<80 lines) — Bottom bar with progress indicator, "Approve All Remaining" button (hidden in Controlled mode), "Submit Feedback" button.

4. `src/components/cogniblend/approval/TieredApprovalView.tsx` (<150 lines) — Main orchestrator composing all approval components. Uses `useApprovalTiers`. Handles approve/requestChange mutations against `challenge_section_approvals` table.

5. `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` — Replace the existing flat approval banner (lines 588-623) with `TieredApprovalView` when `isPendingApproval` is true. Import `SECTION_LABELS` from existing `src/components/cogniblend/curation/context-library/types.ts`.

---

## Key Design Decisions

- **useSectionApprovals conflict**: The existing hook is curator-side (operates on `curator_section_actions`). The new `useApprovalTiers` hook will query `challenge_section_approvals` directly for CR-side approval state — no naming collision.
- **CurationReviewPage size (4387 lines)**: Only adding 2 lines (import + onProgress param). No decomposition in this scope.
- **Realtime**: Uses same pattern as existing `useNotificationRealtime` — channel subscription with query cache invalidation.
- **SECTION_LABELS**: Reuse the existing mapping from `src/components/cogniblend/curation/context-library/types.ts` rather than creating a duplicate.

---

## File Summary

| Action | File | Lines |
|--------|------|-------|
| Modify | `MyActionItemsSection.tsx` | 4 replacements |
| Create | Migration: `curation_progress` table | ~40 SQL lines |
| Create | `useCurationProgress.ts` | ~120 |
| Modify | `useWaveExecutor.ts` | +15 lines |
| Modify | `CurationReviewPage.tsx` | +12 lines |
| Modify | `CurationActions.tsx` | +5 lines |
| Create | `ProgressStepper.tsx` | ~95 |
| Create | `ProgressDetailCard.tsx` | ~95 |
| Create | `CurationProgressTracker.tsx` | ~70 |
| Create | `approvalTiers.ts` | ~75 |
| Create | `useApprovalTiers.ts` | ~95 |
| Create | `ApprovalSectionCard.tsx` | ~145 |
| Create | `ApprovalTierGroup.tsx` | ~115 |
| Create | `ApprovalProgressBar.tsx` | ~75 |
| Create | `TieredApprovalView.tsx` | ~145 |
| Modify | `CreatorChallengeDetailView.tsx` | ~20 lines changed |

