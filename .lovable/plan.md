

## Plan: Fix Maturity Level Selector, Complexity Algorithm, and Domain Tags Editor

### Problem
1. **Maturity Level** — Currently shows raw DB value as a Badge. Should show a dropdown selector from the 4 known maturity levels so the curator can change it.
2. **Complexity Assessment** — Currently displays static read-only data. Should use the existing algorithm (7 weighted parameters from `master_complexity_params`) to compute complexity_score and complexity_level, and let the curator adjust parameter values.
3. **Domain Tags** — Currently a placeholder ("Domain tags will be loaded...") with no edit capability. The `challenges` table lacks a `domain_tags` column entirely.

---

### Changes

#### 1. DB Migration: Add `domain_tags` to challenges
- Add `domain_tags jsonb default null` to the `challenges` table so curators can store/edit tags directly on the challenge.

#### 2. Maturity Level — Editable Selector (CurationReviewPage.tsx)
- Replace the static Badge render with a `Select` dropdown showing the 4 maturity levels from `MATURITY_LABELS` (blueprint, poc, prototype, pilot) with their user-facing labels.
- When curator picks a value, save to `challenges.maturity_level` via the existing `saveSectionMutation`.
- Add edit mode toggle like other sections (click Edit → shows Select → Save/Cancel).

#### 3. Complexity Assessment — Algorithm-Based Editor (CurationReviewPage.tsx)
- Import `useComplexityParams()` hook to fetch the 7 admin-managed parameters with their weights.
- When editing, show slider/number inputs (1-10 scale) for each parameter.
- Compute weighted score in real-time using the same algorithm as the wizard: `score = Σ(param_value × weight)`.
- Derive complexity_level from score thresholds (L1-L5).
- On save, write `complexity_parameters`, `complexity_score`, and `complexity_level` to the challenges table.
- In view mode, show the current score, level badge, and parameter breakdown.

#### 4. Domain Tags — Tag Editor (CurationReviewPage.tsx)
- Update the section definition: `isFilled` checks `challenge.domain_tags` is a non-empty array.
- Render existing tags as removable badges.
- In edit mode, show a multi-select input with suggested tags (reuse the `DEFAULT_DOMAIN_TAGS` list from `CogniSubmitRequestPage`) plus free-text entry.
- Save as JSON array to `challenges.domain_tags`.
- Add `domain_tags` to the challenge query select and `ChallengeData` interface.

### Files to Modify
- **`src/pages/cogniblend/CurationReviewPage.tsx`** — Update maturity_level, complexity, and domain_tags section definitions; add editing UIs; import `useComplexityParams`; add `domain_tags` to query and interface.

### Files to Create
- None (all inline in CurationReviewPage)

### DB Migration
- `ALTER TABLE challenges ADD COLUMN domain_tags jsonb DEFAULT NULL;`

