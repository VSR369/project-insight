

## Plan: Fix LC Workspace Data Population

### Root Causes

1. **Deliverables not rendering**: DB stores `{"items": ["..."]}` but `renderJsonList` receives the wrapper object, fails `Array.isArray()`, and falls to `JSON.stringify` producing garbled output.

2. **Evaluation Criteria not rendering**: DB stores `{"criteria": [{name, weight, description}]}` but `renderEvalCriteria` receives the wrapper object, fails `Array.isArray()`, returns empty array.

3. **Reward Structure shown as raw JSON**: The `reward_structure` object (with `currency`, `num_rewarded`, `payment_mode`, `payment_milestones`) is displayed via `JSON.stringify` instead of a proper formatted view.

4. **Missing maturity level display**: `maturity_level` is `null` for this challenge, so the badge is hidden. Should show a fallback like "Not specified".

### Changes

**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**

1. **Fix `renderJsonList`** (line 118-134): Unwrap known container shapes before processing:
   ```ts
   function renderJsonList(val: unknown): string[] {
     if (!val) return [];
     // Unwrap {items: [...]} or {criteria: [...]} wrappers
     if (typeof val === 'object' && !Array.isArray(val)) {
       const obj = val as Record<string, unknown>;
       if (Array.isArray(obj.items)) return renderJsonList(obj.items);
       if (Array.isArray(obj.criteria)) return renderJsonList(obj.criteria);
     }
     // ... rest unchanged
   }
   ```

2. **Fix `renderEvalCriteria`** (line 136-143): Unwrap `{criteria: [...]}`:
   ```ts
   function renderEvalCriteria(val: unknown) {
     if (!val) return [];
     if (typeof val === 'object' && !Array.isArray(val)) {
       const obj = val as Record<string, unknown>;
       if (Array.isArray(obj.criteria)) return renderEvalCriteria(obj.criteria);
     }
     if (!Array.isArray(val)) return [];
     // ... rest unchanged
   }
   ```

3. **Fix deliverables call** (line 309): Pass `challenge?.deliverables` — the helper now unwraps `{items:[...]}` automatically.

4. **Replace raw JSON reward_structure display** (lines 432-437): Render a structured view showing:
   - Currency + Payment Mode badges
   - Number of rewarded solutions
   - Payment Milestones table (Name, Trigger, Percentage)

5. **Show fallback for null maturity_level** (line 429): Display "Not specified" badge when maturity is null.

6. **Add missing challenge fields**: Show `current_phase`, `master_status` as status badges in the IP & Governance section for LC context.

### Technical Details

- All changes are in a single file: `LcLegalWorkspacePage.tsx`
- No database changes needed — the data is correctly stored, just incorrectly parsed on the frontend
- The `renderJsonList` and `renderEvalCriteria` fixes handle both the wrapped (`{items:[...]}`) and unwrapped (`[...]`) formats for robustness

