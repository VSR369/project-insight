

# Analysis: AI Review Prompt Configuration Usage for Curator Role

## Current State Assessment

The edge function (`review-challenge-sections/index.ts`) **is correctly loading** the 14 configured sections from `ai_review_section_config` for the `curation` role context. The DB has all 14 rows with full Claude content (review_instructions, dos, donts, required_elements, examples). The `buildConfiguredBatchPrompt()` function is used when DB configs are found.

However, there are **three issues** preventing the system from working fully as intended:

---

## Issue 1: Missing `role_context` Parameter (Minor)

**CurationReviewPage line 1025** calls the edge function without `role_context`:
```js
body: { challenge_id: challengeId }  // missing role_context: 'curation'
```
The edge function defaults to `"curation"` so this works, but it's fragile and should be explicit.

**Fix**: Add `role_context: 'curation'` to the invoke call.

---

## Issue 2: Section Key Mismatch — `eligibility` vs `visibility_eligibility`

The DB config has section key `eligibility`. The edge function sends back results with key `eligibility`. But the **CurationReviewPage UI** looks for `visibility_eligibility` (line 1501):
```js
const aiReview = aiReviews.find((r) => r.section_key === section.key);
// section.key = "visibility_eligibility" but AI returns "eligibility"
```
This means the AI review for eligibility is **never displayed** in the UI.

**Fix**: Either rename the DB config key to `visibility_eligibility` or update the UI lookup. The simplest approach: update the DB config `section_key` from `eligibility` to `visibility_eligibility` and update the edge function's hardcoded fallback to match.

---

## Issue 3: 6 UI Sections Have No AI Review Config

The Curation page renders **20 sections** but only **14 have AI review configuration**. These 6 UI sections get no AI review feedback:

| Section Key | Why Missing |
|-------------|-------------|
| `hook` | Not in DB config, not in edge function section list |
| `extended_brief` | Not in DB config |
| `domain_tags` | Not in DB config |
| `submission_deadline` | Not in DB config |
| `challenge_visibility` | Not in DB config |
| `effort_level` | Not in DB config |
| `payment_schedule` | Not in DB config, not even in SECTIONS array |

These are newer fields added after the AI review config was seeded. The AI model never reviews them because they are not in the `sectionsToReview` list.

**Fix**: Add AI review config rows for the 6 missing sections (or decide they don't need AI review). At minimum, `hook` and `extended_brief` should have review configs since they contain substantive content.

---

## Implementation Plan

### Step 1 — Fix `role_context` in CurationReviewPage
Add `role_context: 'curation'` to the edge function call body on line 1025.

### Step 2 — Fix `eligibility` → `visibility_eligibility` Key Mismatch
- SQL migration: `UPDATE ai_review_section_config SET section_key = 'visibility_eligibility' WHERE role_context = 'curation' AND section_key = 'eligibility'`
- Update the hardcoded fallback `CURATION_SECTIONS` array in the edge function

### Step 3 — Add Missing Section Configs
Insert new `ai_review_section_config` rows for curation sections that need AI review. Recommended additions:

| Section Key | Label | Importance |
|-------------|-------|------------|
| `hook` | Challenge Hook | Medium |
| `extended_brief` | Extended Brief | Medium |
| `submission_deadline` | Submission Deadline | Medium |
| `challenge_visibility` | Challenge Visibility | Medium |
| `effort_level` | Effort Level | Low |
| `domain_tags` | Domain Tags | Low |

Each will have basic `review_instructions`, `dos`, `donts`, `required_elements`, and examples.

### Step 4 — Update Edge Function Fallback
Update `CURATION_SECTIONS` hardcoded array to include the new sections and fix the `eligibility` → `visibility_eligibility` rename.

### Step 5 — Redeploy Edge Function
The edge function must be redeployed for the key rename and new section support to take effect.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add `role_context: 'curation'` to edge function call |
| `supabase/functions/review-challenge-sections/index.ts` | Rename `eligibility` → `visibility_eligibility` in fallback; add new section entries |
| New SQL migration | Rename key in DB + INSERT 6 new config rows |

