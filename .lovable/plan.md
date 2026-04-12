

## Fix Plan: 6 Changes Across Edge Function + Client

### Fix 1 — Generate suggestions for every section (no filtering)

**File:** `supabase/functions/review-challenge-sections/aiPass2.ts`

Lines 40-48: Replace the filter with `const sectionsNeedingSuggestion = pass1Results;` — remove the entire conditional filter block. All sections get a suggestion; the curator decides what to accept.

### Fix 2 — Only skip Pass 1 when real comments exist

**File:** `src/hooks/useWaveReviewSection.ts`

Lines 57-65: Wrap the `skip_analysis` body in an `if (existingComments?.length)` guard. When no stored comments exist, fall through to run full Pass 1 + Pass 2. Also fix the hardcoded `'warning'` status — derive it from actual comment types (`error`/`warning` → `'warning'`, else `'pass'`).

### Fix 3 — Attachment sections never receive content suggestions

**File:** `src/hooks/useWaveReviewSection.ts`

After the `if (action === 'skip')` guard (line 39), add:

```typescript
const ATTACHMENT_ONLY_SECTIONS = new Set(['creator_references', 'reference_urls']);
```

Inside the callback, before building the request body, add:

```typescript
if (ATTACHMENT_ONLY_SECTIONS.has(sectionKey)) {
  body.pass1_only = true;
}
```

### Fix 4 — Suggestions visible after Generate Suggestions completes

**Fix 4a — Add `generateDoneSession` flag**

**File:** `src/hooks/cogniblend/useCurationPageData.ts`

Add `const [generateDoneSession, setGenerateDoneSession] = useState(false);` alongside `pass1DoneSession`. Export both in the return object and the `CurationPageState` interface.

**File:** `src/hooks/cogniblend/useCurationAIActions.ts`

Add `setGenerateDoneSession` to the options interface. In `handleGenerateSuggestions` (line 231): replace `setPass1DoneSession(false)` with `setGenerateDoneSession(true)` — do NOT reset `pass1DoneSession`.

**Fix 4b — Drive `reviewSessionActive` from both flags**

**File:** `src/hooks/cogniblend/useCurationPageOrchestrator.ts`

Export `generateDoneSession` from pageData. In the return object, keep exposing `pass1DoneSession`.

**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

Line 144: Change `reviewSessionActive={o.pass1DoneSession}` to `reviewSessionActive={o.pass1DoneSession || o.generateDoneSession}`.
Line 210: Same change for the `CurationSectionList` prop.

**File:** `src/components/cogniblend/curation/CurationHeaderBar.tsx`

Line 176: The `reviewSessionActive` prop already gates the BulkActionBar — no change needed here since the page passes the corrected value.

### Fix 5 — Persistent completion banner after Generate Suggestions

**File:** `src/components/cogniblend/curation/CurationHeaderBar.tsx`

Add a `GenerationCompleteBanner` rendered between the BulkActionBar and the read-only banner. Props needed:

| Prop | Type |
|------|------|
| `generateDoneSession` | `boolean` |
| `suggestionsCount` | `number` |
| `waveCompleted` | `boolean` |
| `onDismiss` | `() => void` |

Show when `generateDoneSession && waveCompleted && suggestionsCount > 0`. Green info banner with checkmark icon, message: "AI Suggestions Ready — {suggestionsCount} sections have suggestions waiting for your review." Dismiss button calls `onDismiss` which sets `generateDoneSession = false`.

Wire from `CurationReviewPage.tsx` → pass `generateDoneSession`, `onDismissCompletionBanner={() => o.setGenerateDoneSession(false)}`, and derive `waveCompleted` from `o.waveProgress.overallStatus === 'completed'`.

### Fix 6a — Creator Approval Status Banner in Curation Right Rail

**File:** `src/components/cogniblend/curation/CreatorApprovalStatusBanner.tsx` (NEW, ~60 lines)

Reads `operatingModel` and `creatorApprovalRequired` as props. Renders one of three banners:

- MP: "Marketplace: Creator mandatory approval after legal + financial review"
- AGG + approval required: "Creator has requested approval sign-off"
- AGG + no approval: "No Creator approval required — proceeds to publication"

**File:** `src/components/cogniblend/curation/CurationRightRail.tsx`

Add props: `creatorApprovalRequired: boolean | null`. Import and render `CreatorApprovalStatusBanner` below the `CompletionBanner` (line 168), before `CurationActions`.

**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

Parse `creator_approval_required` from `challenge.extended_brief` and pass to `CurationRightRail`.

### Fix 6b — Creator toggle for approval requirement post-creation (Aggregator)

**File:** `src/components/cogniblend/manage/CreatorApprovalCard.tsx` (NEW, ~80 lines)

A settings card with a Switch toggle for `creator_approval_required`. Visible only when `operatingModel === 'AGG'` and challenge is in Phase 1 or Phase 2. Saves via a mutation that reads current `extended_brief`, merges `creator_approval_required`, and writes back.

**File:** `src/pages/cogniblend/ChallengeManagePage.tsx`

Fetch `operating_model`, `extended_brief`, and `current_phase` from the existing `useManageChallenge` query (need to add these columns to the hook). Import and render `CreatorApprovalCard` between the AmendmentCard and QAManagementCard.

**File:** `src/hooks/cogniblend/useManageChallenge.ts`

Add `operating_model`, `extended_brief`, `current_phase` to the challenge SELECT and include in the return type.

### Files Changed Summary

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/.../aiPass2.ts` | Remove Pass 2 filter — all sections get suggestions |
| 2 | `src/hooks/useWaveReviewSection.ts` | Guard `skip_analysis` on comment existence; derive status; add attachment guard |
| 3 | `src/hooks/cogniblend/useCurationPageData.ts` | Add `generateDoneSession` state |
| 4 | `src/hooks/cogniblend/useCurationAIActions.ts` | Use `setGenerateDoneSession(true)` instead of `setPass1DoneSession(false)` |
| 5 | `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Expose `generateDoneSession` + `setGenerateDoneSession` |
| 6 | `src/pages/cogniblend/CurationReviewPage.tsx` | Fix `reviewSessionActive`; pass banner props; pass `creatorApprovalRequired` |
| 7 | `src/components/cogniblend/curation/CurationHeaderBar.tsx` | Add `GenerationCompleteBanner` + new props |
| 8 | `src/components/cogniblend/curation/CreatorApprovalStatusBanner.tsx` | NEW — approval status banner |
| 9 | `src/components/cogniblend/curation/CurationRightRail.tsx` | Render `CreatorApprovalStatusBanner` |
| 10 | `src/components/cogniblend/manage/CreatorApprovalCard.tsx` | NEW — toggle card for AGG creators |
| 11 | `src/pages/cogniblend/ChallengeManagePage.tsx` | Render `CreatorApprovalCard` |
| 12 | `src/hooks/cogniblend/useManageChallenge.ts` | Add `operating_model`, `extended_brief`, `current_phase` to query |

