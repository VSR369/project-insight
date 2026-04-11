

## Root Cause Analysis: 4 Issues in Creator→Curator Data Flow

### Issue 1: `industry_segment_id` — Why was Creator allowed to submit without it?

**5-Why:**
1. Why is it NULL in DB? Creator submitted without selecting an industry segment.
2. Why did the form allow submission? The Zod schema has `industry_segment_id: z.string().optional().default('')` (line 90 of `creatorFormSchema.ts`).
3. Why is it optional? Because it was added later and wasn't wired as mandatory for any governance mode.
4. Why does this matter? Curator's `resolveIndustrySegmentId` returns null → pre-flight blocks AI analysis.

**Fix:** Make `industry_segment_id` mandatory for STRUCTURED and CONTROLLED modes in `creatorFormSchema.ts`. QUICK stays optional (auto-derived from org).

### Issue 2: Domain Tags not recognized by AI Analysis

**Not a bug.** DB confirms 6 domain tags exist: `[AI/ML, Supply Chain, Digital Transformation, SAP Integration, Manufacturing, Change Management]`. Our previous fix (seeding `sectionContents` from challenge DB object in `runPreFlight`) already handles this. The pre-flight now recognizes them correctly. The AI analysis blockage the user experienced was due to `industry_segment_id` being NULL (Issue 1), not domain tags.

### Issue 3: Reward Structure — "Can't have 3 tiers" / confusing interface

**5-Why:**
1. Why is Platinum amount 0 even though Creator set ₹4.5Cr budget? The Creator saves `budget_max: 45000000` in `reward_structure` but NOT individual tier amounts (Creator only sets total budget, not tier breakdown).
2. Why doesn't the Curator see the Creator's budget pre-filled in Platinum? Because `migrateRawReward` reads `raw.platinum` (line 203) which is 0. The `budget_max` is only stored in `upstream_source` — never mapped to tier amounts.
3. Why does `totalPool` = 45M but tiers = 0? `totalPool` was correctly derived from `budget_max` during initial migration, but no tier pre-population logic exists.
4. Why "Fix 2 issues"? Validation fires: (a) "Platinum prize amount must be greater than 0" and (b) "Prize breakdown is 45000000 under the total pool of 45000000". These are correct validation messages — the Curator hasn't allocated the budget yet.
5. Why is Gold/Silver disabled? By design — Curator must toggle them on. This is correct behavior.

**Root cause:** When Creator submits a total budget (`budget_max`), the system should auto-populate the Platinum tier with the full amount as a starting point. Currently it leaves all tiers at 0 and shows confusing validation errors immediately.

**Fix:** In `migrateRawReward`, when parsing Creator data (`source_role: CR`), if `budget_max > 0` but no tier amounts exist, pre-populate Platinum with `budget_max`. Also in `legacyToTierState`, when `totalPool > 0` but Platinum amount is 0, auto-set Platinum = totalPool.

### Issue 4: Pre-flight blocks AI Analysis due to reward amount

**Root cause:** `preFlightCheck` line 288-296 requires `budgetMax > 0` for Marketplace challenges. It reads from `reward_structure.budget_max`. Since the Curator's saved version has `source_role: CURATOR` but the Creator's `budget_max` was at the root level, and the current DB has `budget_max` missing from the Curator-saved data — it reads 0.

Actually checking the DB more carefully: `totalPool: 4.5e+07` is present. `budget_max` is NOT present in the current Curator-saved JSONB. The pre-flight reads `budget_max` specifically via `parseRewardStructureBudgetMax()`, which returns 0.

**Fix:** `parseRewardStructureBudgetMax` should also check `totalPool` and `platinum_award` as fallbacks, not just `budget_max`.

---

### Fix Plan (3 files)

**1. `src/components/cogniblend/creator/creatorFormSchema.ts` (line 90)**

Make `industry_segment_id` mandatory for STRUCTURED and CONTROLLED:
```typescript
industry_segment_id: isQuick
  ? z.string().optional().default('')
  : z.string().min(1, 'Please select an industry segment'),
```

**2. `src/hooks/useRewardStructureState.ts` (line 95-108, `legacyToTierState`)**

When Platinum tier has amount 0 but `monetary.totalPool > 0`, auto-populate Platinum with totalPool:
```typescript
function legacyToTierState(monetary?: MonetaryReward, ...): Record<string, TierState> {
  const state = defaultTierState(srcDefault);
  if (!monetary) return state;
  for (const tier of monetary.tiers) {
    if (tier.rank in state) {
      state[tier.rank] = { enabled: true, amount: tier.amount, amountSrc: { src: srcDefault } };
    }
  }
  // Auto-populate Platinum from totalPool if Creator only set budget
  if (state.platinum.enabled && state.platinum.amount === 0 && monetary.totalPool && monetary.totalPool > 0) {
    state.platinum.amount = monetary.totalPool;
    state.platinum.amountSrc = { src: srcDefault };
  }
  return state;
}
```

**3. `src/lib/cogniblend/preFlightCheck.ts` (line 104-123, `parseRewardStructureBudgetMax`)**

Extend to check `totalPool` and `platinum_award` as fallbacks:
```typescript
function parseRewardStructureBudgetMax(sections): number {
  // ... existing budget_max check ...
  // Fallback to totalPool
  const totalPool = obj.totalPool;
  if (typeof totalPool === 'number' && totalPool > 0) return totalPool;
  // Fallback to platinum_award
  const platAward = obj.platinum_award;
  if (typeof platAward === 'number' && platAward > 0) return platAward;
  return 0;
}
```

### What stays the same
- Gold/Silver toggle behavior — this is correct UX (Curator enables tiers as needed)
- Validation messages — they're correct, they just fire prematurely when Platinum isn't auto-populated
- No edge function changes
- No migrations needed

### After fix
- Creator STRUCTURED/CONTROLLED must select industry segment before submitting
- Curator opens Reward Structure → Platinum auto-populated with Creator's ₹4.5Cr → can then break into 3 tiers
- Pre-flight recognizes totalPool as valid budget → doesn't block AI analysis

