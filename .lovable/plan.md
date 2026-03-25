

# Fix "21 of 27 sections reviewed" — Root Cause Analysis & Fix

## 5 Whys Analysis

1. **Why does the user see only 21 sections reviewed?** The DB actually contains all 27 section reviews. The 6 "missing" sections are those that received a **PASS** from Phase 1 triage and were never sent to Phase 2 deep review.

2. **Why do PASS sections look skipped?** PASS sections only show a small green checkmark saying "no issues found" — visually indistinguishable from "not reviewed" to the user. They have no AI comments, no suggested version, and no status badge on the section header.

3. **Why is there no visible "Reviewed" indicator on PASS sections?** The `CuratorSectionPanel` status badge only shows for `warning`/`needs_revision`. PASS sections show `not_reviewed` styling because the panel status mapping doesn't differentiate "AI reviewed and passed" from "never reviewed."

4. **Why doesn't the progress bar confirm all 27 were covered?** The progress bar resets to 0 (disappears) after Phase 2 completes, and Phase 2 only shows progress for non-pass sections (e.g., 21/21). The user never sees "27/27" anywhere.

5. **Why are there stale entries in `ai_review_section_config`?** The DB table still has `extended_brief` and `extended_brief_expected_outcomes` as active curation keys (29 total instead of 27), creating a mismatch between what the backend expects and what the frontend sends.

## Changes

### 1. Make PASS sections visually distinct from "not reviewed" (`CurationReviewPage.tsx`)

In the section rendering loop (~line 2463), update `panelStatus` logic so that PASS sections show as `"pass"` (green badge) rather than falling through to `"not_reviewed"`:

Currently the status is set based on `aiReview?.status` — this should already work. Check the `CuratorSectionPanel` to ensure it renders a green "Pass" badge. The issue is likely that for the Extended Brief parent panel (`key: "extended_brief"`), no individual AI review exists with `section_key === "extended_brief"` — the triage returns subsection keys only. The parent panel always shows `not_reviewed`.

**No change needed for subsections** — they already get individual reviews passed via `ExtendedBriefDisplay`. The fix is ensuring the **parent `extended_brief` section panel** shows aggregate status (it already computes this in `ExtendedBriefDisplay`).

### 2. Progress bar: persist at 100% with completion banner (`CurationReviewPage.tsx`)

- Add a `phase2Status` state: `'idle' | 'running' | 'completed'`
- On Phase 1 complete: set status to `'running'`
- On Phase 2 complete: set status to `'completed'`, keep `phase2Progress` at `{total, completed: total}`
- Reset only when user clicks "Review Sections by AI" again
- Show completion banner: "27/27 reviewed · 6 Pass · 2 Warning · 19 Needs Revision"

Update the progress card UI:
- When `completed`: show 100% bar + "All 27 sections reviewed" + status breakdown
- When `running`: show current progress as now

### 3. Show total triage count, not just Phase 2 count (`CurationReviewPage.tsx`)

Currently the progress bar shows "X/Y sections analyzed" where Y = `phase2_queue.length` (non-pass sections only). Fix:
- Track total triage count: `phase1Count` = total sections triaged
- After Phase 1: immediately show "Phase 1: 27/27 triaged · X pass, Y need deeper review"
- During Phase 2: show "Phase 2: N/M sections analyzed"
- After completion: show "All 27 sections reviewed" with breakdown

### 4. Clean up stale DB config entries

Remove `extended_brief` and `extended_brief_expected_outcomes` from `ai_review_section_config` table (they are dead entries — 29 → 27 active curation keys). This is a data migration.

### 5. PASS section: show clear "Reviewed" state (already done per prior plan)

Per user's preference: PASS sections show "Reviewed ✓ (no issues)" — this is already implemented in `AIReviewInline.tsx` (line 534-544). The visual gap is at the **section panel header** level where the status badge should show green "Pass" instead of neutral.

Verify `CuratorSectionPanel` renders the pass badge — if it doesn't, add the green badge for `status === "pass"`.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add `phase2Status` state, persist 100% bar + completion banner with full 27-section breakdown |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Show total triage count (27) not just Phase 2 count in progress display |
| DB migration | Delete `extended_brief` and `extended_brief_expected_outcomes` from `ai_review_section_config` where `role_context = 'curation'` |

