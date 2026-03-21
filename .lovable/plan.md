

## Plan: Fix JSON Field Parsing in CurationReviewPage

### Problem
The CurationReviewPage crashes with `d.map is not a function` because several JSON fields are parsed assuming array shapes, but the actual DB data uses nested object structures.

From the live network data:
- `deliverables` = `{"items": ["..."]}` — parsed as `string[]` but is an object
- `evaluation_criteria` = `{"criteria": [{"name", "weight", "description"}]}` — parsed as flat array with wrong field names
- `reward_structure` = `{"gold": 0, "num_rewarded": "3", "payment_mode": "escrow", "payment_milestones": [...]}` — flat object, not array
- `phase_schedule` = `{"notes": null, "phase_durations": null, ...}` — flat object, not array

### Fix (single file)

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

1. **Deliverables section** (lines 194-208): Extract `items` from parsed object. Handle both `string[]` and `{items: string[]}` shapes:
   ```ts
   const raw = parseJson<any>(ch.deliverables);
   const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
   ```

2. **Evaluation Criteria section** (lines 215-243): Extract `criteria` array from object and map correct field names (`name`/`weight` instead of `criterion_name`/`weight_percentage`):
   ```ts
   const raw = parseJson<any>(ch.evaluation_criteria);
   const ec = Array.isArray(raw) ? raw : Array.isArray(raw?.criteria) ? raw.criteria : null;
   // Use c.name and c.weight instead of c.criterion_name and c.weight_percentage
   ```

3. **Reward Structure section** (lines 249-267): Render as key-value metadata (payment mode, num rewarded, milestones) instead of mapping as array. Show `payment_milestones` as a table if present.

4. **Phase Schedule section** (lines 273-303): Render as key-value metadata. Extract `phase_durations` array if present, otherwise show notes/timeline text.

5. **Complexity Parameters** (line 310): Add `Array.isArray` guard before `.map()`.

### Files Modified
- `src/pages/cogniblend/CurationReviewPage.tsx`

