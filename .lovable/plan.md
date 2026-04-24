
# Plan — Fix "Fill Test Data" for ALL governance × engagement combinations

## Audit summary (gaps found)

I audited `creatorSeedContent.ts`, `ChallengeCreatorForm.handleFillTestData`, `ChallengeCreatePage`, `creatorFormSchema.ts`, and `governanceFieldFilter.ts` against the recent industry-segment + governance + audience changes. Real gaps below:

### G-A. Industry segment fallback is incomplete (handleFillTestData)
`ChallengeCreatorForm.handleFillTestData` only does `industrySegmentId || industrySegmentOptions[0]?.id`. It **ignores `orgContext.primaryIndustryId`** — the canonical org default added in the recent industry-segment plan. The `useEffect` in `ChallengeCreatePage` does run that resolution on mount, so in practice the prop is usually populated — **but** if the page hits Fill Test Data before the org-primary effect fires, or if a user manually clears the segment, the seeder skips the org-default tier. The auto-fill chain must mirror page-level priority: `prop → org primary → first option`, and announce provenance (`org_default` / `fallback`) back through `onIndustrySegmentResolved` so the `industrySource` badge stays truthful.

### G-B. STRUCTURED-AGG seeds prize = 0
`AGG_SEED.platinum_award = 0`. STRUCTURED branch returns `...base` unchanged. AGG passes Zod (no `>0` refine), but Step 2 then renders an empty escrow card and the publish-readiness gate flags it. Seed should set a realistic AGG prize (e.g. `300000 USD`) and ensure `currency_code` is consistent.

### G-C. STRUCTURED & CONTROLLED `creator_legal_instructions` copy refers to scenarios the seed doesn't represent
The seeds now describe **supply-chain digital workforce (MP)** and **financial services autonomous ops (AGG)**, but legal instructions still talk about "smart grid / NERC CIP", "Siemens MindSphere", "SOX cross-border", "HIPAA / 45 CFR Part 164". Curators reading the brief will see incoherent copy. Rewrite the four legal-instruction strings (STRUCTURED-MP, STRUCTURED-AGG, CONTROLLED-MP, CONTROLLED-AGG) so each matches its actual seed domain.

### G-D. STRUCTURED & CONTROLLED don't exercise AGG audience selector
For AGG, `solver_audience` is selectable (Internal / External / All). All non-QUICK AGG seeds inherit `'ALL'` from base, so the audience selector is never demonstrated when filling test data. Set:
- STRUCTURED-AGG → `'INTERNAL'`
- CONTROLLED-AGG → `'EXTERNAL'`
(QUICK-AGG already uses `'INTERNAL'`.) MP stays `'ALL'` (forced by `audienceSelectable(MP)=false`).

### G-E. CONTROLLED seeds don't set `is_anonymous` / `community_creation_allowed` distinctly
Both seeds use defaults (false/false). To exercise the creator-preference toggles end-to-end (especially in CONTROLLED where they appear in the brief), set CONTROLLED-MP `is_anonymous: true` and CONTROLLED-AGG `community_creation_allowed: true`. (Optional but improves coverage.)

### G-F. QUICK seeds wipe context arrays to `['']` even though governance hides them
QUICK seeds set `preferred_approach: ['']`, `current_deficiencies: ['']`, etc. Then `filterSeedByGovernance` runs and *re-resets* them to `['']` since they're hidden in QUICK. Net behavior is correct, but the explicit `['']` in the seed is redundant noise. Replace with `[]` (empty array) so the filter is the single source of truth and the seed reads cleanly. (Cosmetic / maintenance — keep as low-priority cleanup.)

### G-G. `expected_outcomes` in QUICK is `['Working prototype …']` but field is hidden
Same issue — QUICK hides `expected_outcomes`, so the seed value is dropped by `filterSeedByGovernance`. Harmless, but again redundant. Set to `[]` for consistency.

### G-H. No seed for `hook` in STRUCTURED / CONTROLLED
`hookRule` requires `min(1)` for CONTROLLED. Base seeds set `hook` only via the optional `& { hook?: string }` — but neither MP_SEED nor AGG_SEED defines `hook`. Result: filling test data in **CONTROLLED** mode produces a Zod error on the `hook` field (300-char one-liner). Add a one-line hook to both base seeds (e.g. `hook: 'Reimagine supply chain through autonomous AI agents and a new human-agent operating model.'`).

### G-I. `phase_durations` only seeded for CONTROLLED — STRUCTURED with optional schedule never demoed
STRUCTURED can optionally define phase durations (per the timeline-config memory). Currently STRUCTURED seeds leave it empty. For demo coverage, seed STRUCTURED with a 3-phase schedule (phases 5/8/9) so reviewers can see the toggle populated. (Low priority — only matters if testers want to exercise the timeline UI.)

### G-J. `evaluator_count` for CONTROLLED hard-coded to 3 — no MP/AGG variation needed
This is fine, just confirming. DELPHI requires ≥1, ≤5; 3 is sensible. No change.

### G-K. Org-context fill (`onFillTestData → setOrgFillTrigger`) fires on every Fill, including QUICK
Currently `onFillTestData?.()` is called unconditionally inside `handleFillTestData`. For QUICK that's fine (org context is still useful). No bug — just confirming current behavior is intentional.

---

## Files to change

### 1. `src/components/cogniblend/creator/creatorSeedContent.ts`  (~30-line delta inside the same file)
- Add `hook` to both `MP_SEED` and `AGG_SEED` (one-line summary matching each scenario).
- `AGG_SEED.platinum_award = 1500000` USD (or similar non-zero baseline).
- Replace the four `creator_legal_instructions` strings inside `getSeedForCombination` so STRUCTURED-MP/AGG and CONTROLLED-MP/AGG copy matches the supply-chain (MP) and financial-services (AGG) scenarios.
- STRUCTURED branch: set `solver_audience: 'INTERNAL'` when AGG; leave MP at `'ALL'`.
- CONTROLLED branch: set `solver_audience: 'EXTERNAL'` when AGG; `'ALL'` for MP. Set CONTROLLED-MP `is_anonymous: true`; CONTROLLED-AGG `community_creation_allowed: true`.
- (Cleanup) QUICK branch: empty arrays (`[]`) instead of `['']` for the hidden line-item fields and `expected_outcomes`.
- (Optional) STRUCTURED branch: seed a 3-row `phase_durations` schedule for visual coverage.

### 2. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`  (~6-line delta in `handleFillTestData`)
- Pull `orgContext.primaryIndustryId` via `useOrgModelContext()` (already imported in the page; add the hook call here).
- Replace the resolution line:
  ```
  const resolvedIndustryId =
    industrySegmentId
    || orgContext?.primaryIndustryId
    || industrySegmentOptions[0]?.id
    || '';
  ```
- Keep `onIndustrySegmentResolved?.(resolvedIndustryId)` so `ChallengeCreatePage.industrySource` flips to `org_default` or `fallback` (page already maps to `'fallback'` when prev was null — extend to set `'org_default'` when the resolved id matches the org primary).

### 3. `src/pages/cogniblend/ChallengeCreatePage.tsx`  (~4-line delta in `handleIndustryResolvedFromForm`)
- Compare incoming id to `orgContext?.primaryIndustryId`:
  ```
  const handleIndustryResolvedFromForm = useCallback((id: string) => {
    setIndustrySegmentId(id);
    setIndustrySource((prev) =>
      prev ?? (id === orgContext?.primaryIndustryId ? 'org_default' : 'fallback')
    );
  }, [orgContext?.primaryIndustryId]);
  ```
  This keeps the provenance badge accurate when Fill Test Data resolves the industry.

### 4. (No DB / RPC / migration changes.) Verification only — `npx tsc --noEmit`.

---

## Out of scope
- Seeding `weighted_criteria` for QUICK (field is hidden by governance — already correctly dropped).
- Adding new languages / currencies beyond what each scenario uses (INR for MP, USD for AGG).
- Touching `ORG_SEED` (Organization context fill) — already fine.
- Mutating the curation-side seed (different surface, different file).
- Re-seeding attached files / reference URLs (no changes needed; tester adds those manually if wanted).

---

## Verification matrix (after changes)

| Combo | Title set | Industry resolves | Prize > 0 | Audience seeded | Legal copy matches scenario | Hook present | Zod passes |
|---|---|---|---|---|---|---|---|
| QUICK-MP | ✓ Waste sorting | org_primary→fallback | ✓ 500000 INR | ALL | Platform CPA note | n/a (hidden) | ✓ |
| QUICK-AGG | ✓ Onboarding sprint | same | ✓ 300000 USD | INTERNAL | Org CPA note | n/a (hidden) | ✓ |
| STRUCTURED-MP | ✓ Supply chain AI | same | ✓ 45M INR | ALL | Supply-chain regulated data | ✓ | ✓ |
| STRUCTURED-AGG | ✓ FinServ autonomous | same | ✓ 1.5M USD | INTERNAL | Financial-services regulated | ✓ | ✓ |
| CONTROLLED-MP | ✓ Supply chain AI | same | ✓ 45M INR | ALL | Supply-chain controlled-tier | ✓ | ✓ |
| CONTROLLED-AGG | ✓ FinServ autonomous | same | ✓ 1.5M USD | EXTERNAL | Financial-services controlled-tier | ✓ | ✓ |

All six combinations will pass schema validation, render a non-zero escrow display where applicable, demonstrate the AGG audience selector across modes, and show the correct industry-segment provenance badge ("Org default" / "Auto-selected" / "Creator set").
