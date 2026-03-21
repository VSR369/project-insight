
Current status: **No — this is not fully fixed yet.**

I re-checked the code and DB payload for challenge `a7962f69-ca64-4ce2-b6f1-764490c698d3`. The JSON fields are wrapped objects (`deliverables.items`, `evaluation_criteria.criteria`, object-shaped `reward_structure`, object-shaped `phase_schedule`), and there are still places in the UI that assume flat arrays.

Do I know what the issue is? **Yes.**

### Exact remaining problem
1. `CurationReviewPage` was partially hardened, but the right-side checklist logic still uses legacy parsing patterns in `CurationChecklistPanel`.
2. `ApprovalReviewPage` still has direct legacy array parsing with `d.map(...)` on `deliverables`, which is the same failure pattern shown in your screenshot.

### Implementation plan
1. **Normalize JSONB parsing in curation checklist**
   - File: `src/pages/cogniblend/CurationChecklistPanel.tsx`
   - Replace direct `parseJson<...[]>(...)` assumptions with container-unwrapping:
     - Deliverables: support `[]` and `{ items: [] }`
     - Evaluation criteria: support `[]` and `{ criteria: [] }`, weight from `weight_percentage` or `weight`
     - Reward structure: treat as filled if array tiers OR object metadata/milestones exist
     - Phase schedule: treat as filled if array OR object metadata/phase_durations exist
   - Ensure no `.reduce/.map` is called unless `Array.isArray(...)` is true.

2. **Patch approval review page with same normalization**
   - File: `src/pages/cogniblend/ApprovalReviewPage.tsx`
   - Replace legacy `d.map(...)`/array-only parsing in:
     - Challenge summary sections
     - Overview checklist calculations
   - Apply the same wrapper-aware parsing rules used in curation.

3. **Add a tiny shared helper (or consistent local helper)**
   - Option A: local helper functions in both files for fast fix.
   - Option B: shared helper in `src/lib/...` for wrapper unwrapping and safe-array conversion.
   - Goal: eliminate duplicated fragile JSON parsing.

4. **Verification pass**
   - Validate `/cogni/curation/:id` loads without error for CU role and shows all sections.
   - Validate right checklist renders and computes without crash.
   - Validate `/cogni/approval/:id` also no longer throws `d.map is not a function`.
   - Confirm with the exact challenge ID currently failing.

### Files to update
- `src/pages/cogniblend/CurationChecklistPanel.tsx`
- `src/pages/cogniblend/ApprovalReviewPage.tsx`
- (optional) shared JSON helper file if we centralize parsing
