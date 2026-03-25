

# Fix: Sections with Warnings/Issues Incorrectly Getting "Pass" Status

## Problem

The AI triage can return `status: "pass"` but still include `issues` (warning comments). Two bugs allow this:

1. **Triage edge function** (line 222-230): Only downgrades passes with low confidence (`< 0.75`), but does NOT downgrade passes that have issues/comments attached. A section with 2 actionable issues can still be marked "pass".

2. **CurationReviewPage** (line 1351): Auto-refinement check is `deepReview.status !== 'pass'` — so even if a deep review returns "pass" with comments, no AI suggested solution is generated.

## Fix

### 1. Triage edge function — Auto-downgrade pass-with-issues

**File**: `supabase/functions/triage-challenge-sections/index.ts` (lines 222-230)

After the existing confidence downgrade, add a second rule: if status is "pass" but `issues.length > 0`, downgrade to "warning".

```ts
// Existing: Auto-downgrade low confidence pass → warning
for (const section of sections) {
  if (section.status === "pass" && section.confidence < 0.75) {
    section.status = "warning";
    if (!section.issues.some(i => i.toLowerCase().includes("confidence"))) {
      section.issues.push("Low confidence — flagged for manual review.");
    }
  }
  // NEW: Auto-downgrade pass-with-issues → warning
  if (section.status === "pass" && section.issues.length > 0) {
    section.status = "warning";
  }
}
```

This ensures any section the AI flagged with issues gets routed to Phase 2 for deep review and refinement.

### 2. CurationReviewPage — Trigger refinement for any section with comments

**File**: `src/pages/cogniblend/CurationReviewPage.tsx` (line 1351)

Change the condition from `deepReview.status !== 'pass'` to just check for comments:

```ts
// BEFORE:
if (deepReview.comments && deepReview.comments.length > 0 && deepReview.status !== 'pass') {

// AFTER:
if (deepReview.comments && deepReview.comments.length > 0) {
```

This is a safety net — if a deep review somehow returns "pass" with actionable comments, refinement still runs.

### 3. Also fix the single-section re-review path

**File**: `src/components/cogniblend/shared/AIReviewInline.tsx` (line 358)

Same pattern — the re-review toast says "looks good" for pass-with-comments:

```ts
// BEFORE:
const hasIssues = freshReview.comments.length > 0 && freshReview.status !== "pass";

// AFTER:
const hasIssues = freshReview.comments.length > 0;
```

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/triage-challenge-sections/index.ts` | Add pass-with-issues → warning downgrade (line 230) |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove `!== 'pass'` guard on auto-refinement (line 1351) |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Fix hasIssues check (line 358) |

