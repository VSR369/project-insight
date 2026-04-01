

# Creator Functionality Audit: Governance + Engagement + Tier + CRUD Alignment

## Audit Summary

After reviewing all Creator-related files end-to-end, the pipeline is **largely correct** post-recent fixes, but **7 issues remain** ranging from display bugs to data integrity gaps.

---

## Issues Found

### Issue 1: `governanceLabel()` in MyChallengesPage doesn't handle `QUICK`

**File:** `MyChallengesPage.tsx` line 56-63

The `governanceLabel()` function maps `LIGHTWEIGHT` → `Quick`, `STRUCTURED` → `Structured`, `CONTROLLED` → `Controlled`. But the Creator form now writes `QUICK` to `governance_mode_override`, not `LIGHTWEIGHT`. If `governance_profile` is `QUICK`, the function falls through to the default case and displays the raw string `QUICK` instead of `Quick`.

**Fix:** Add `case 'QUICK': return 'Quick';` to the switch.

Same issue exists in `CreatorChallengeDetailView.tsx` line 96-103 — identical switch with same gap.

---

### Issue 2: EssentialDetailsTab field hiding is hardcoded, not governance-driven

**File:** `EssentialDetailsTab.tsx` lines 96, 270

The `Scope` and `IP Preference` fields are hidden with `{!isQuick && (...)}` — a hardcoded check against `governanceMode === 'QUICK'`. This works today but ignores the Supervisor-configurable `md_governance_field_rules` table. If a Supervisor marks `scope` as `required` for QUICK mode, the form still hides it.

Similarly, `Budget Range` always shows regardless of governance rules (no visibility check against `platinum_award` field_key).

**Fix:** Pass `fieldRules` from the parent form and use `isFieldVisible(fieldRules, 'scope')` instead of `!isQuick`. Apply the same pattern to `ip_model` and `platinum_award` (budget fields).

---

### Issue 3: AdditionalContextTab field hiding is hardcoded

**File:** `AdditionalContextTab.tsx`

The Tab 2 fields (context_background, root_causes, etc.) always render regardless of governance mode. Their `required` flag is driven by `isControlled` but they are never hidden for QUICK mode. The Zod schema handles validation (optional for QUICK), but the UI doesn't hide fields the Supervisor has marked `hidden`.

**Fix:** Accept `fieldRules` prop. Wrap each field group in `isFieldVisible(fieldRules, fieldKey)` checks. Timeline field should check `expected_timeline` visibility.

---

### Issue 4: `expected_timeline` location mismatch with memory

Per project memory: "The 'Target Timeline' field is located in the **Essential Details** tab." But the actual code has it in `AdditionalContextTab.tsx` (line 237). This contradicts the documented intent.

**Fix:** Either move `expected_timeline` to `EssentialDetailsTab` or update the memory. Recommend keeping it in Tab 2 as it's an optional enrichment field for most modes.

---

### Issue 5: Draft resume doesn't load `governance_mode_override`

**File:** `ChallengeCreatorForm.tsx` lines 188-261

When resuming a draft via `?draft=<id>`, the form fetches challenge data but does NOT fetch `governance_mode_override` or `operating_model`. The parent `ChallengeCreatePage` initializes governance/engagement from org defaults, so a draft saved as `CONTROLLED/AGG` will resume as `QUICK/MP` if that's the org default.

**Fix:** Fetch `governance_mode_override` and `operating_model` in the draft load query. Expose a callback to the parent page to set the governance mode and engagement model from the loaded draft values.

---

### Issue 6: `useMyChallenges` doesn't fetch `governance_mode_override`

**File:** `useMyChallenges.ts` line 39

The query fetches `governance_profile` but not `governance_mode_override`. The `MyChallengesPage` badge shows `governanceLabel(ch.governance_profile)` — this will show the ORG-level default, not the per-challenge override. A QUICK challenge under a STRUCTURED org will incorrectly display "Structured".

**Fix:** Add `governance_mode_override` to the select query and the `MyChallengeItem` interface. In the card, display `governance_mode_override ?? governance_profile`.

---

### Issue 7: Delete draft has no RLS guard for ownership

**File:** `MyChallengesPage.tsx` lines 103-124

The delete handler does a raw `supabase.from('challenges').update({ is_deleted: true }).eq('id', deleteTarget)` with no ownership check. This relies entirely on RLS. If RLS is misconfigured or the table has a broad update policy, any user could delete any challenge. The handler also doesn't verify the challenge is in Phase 1 (draft state) — it could soft-delete an active published challenge.

**Fix:** Add `.eq('created_by', user.id)` and `.eq('current_phase', 1)` filters to the update query as defense-in-depth.

---

## Fix Plan

### Files to Change

| File | Changes |
|------|---------|
| `src/pages/cogniblend/MyChallengesPage.tsx` | Fix `governanceLabel` switch; add `governance_mode_override` display; add ownership + phase guard to delete |
| `src/hooks/cogniblend/useMyChallenges.ts` | Fetch `governance_mode_override`; add to interface |
| `src/components/cogniblend/creator/EssentialDetailsTab.tsx` | Accept `fieldRules` prop; use `isFieldVisible()` for scope, IP, budget fields |
| `src/components/cogniblend/creator/AdditionalContextTab.tsx` | Accept `fieldRules` prop; use `isFieldVisible()` for all context fields |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Pass `fieldRules` to both tabs; fetch `governance_mode_override` + `operating_model` on draft resume; expose callback to parent for mode sync |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Accept mode sync callback from form for draft resume |
| `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Fix `governanceLabel` switch to handle `QUICK` |

### Implementation Order

1. Fix `governanceLabel()` in both files (trivial, zero risk)
2. Add `governance_mode_override` to `useMyChallenges` + card display
3. Add defense-in-depth to delete handler
4. Make EssentialDetailsTab + AdditionalContextTab governance-rule-driven
5. Fix draft resume to load and apply saved governance/engagement model

