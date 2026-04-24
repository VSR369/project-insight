

# Plan — Refresh "Fill Test Data" + Auto-Fill Industry Segment

## Goal
Bring `Fill Test Data` in line with the new QUICK two-role / config-driven workflow, and make it self-sufficient: if no industry segment is picked in Step 1, the seeder picks one automatically (org's primary industry → first available) so the form is publish-ready in one click.

## Files touched

### 1. `src/components/cogniblend/creator/creatorSeedContent.ts` — refresh QUICK seed
Update only the QUICK branch in `getSeedForCombination` (STRUCTURED + CONTROLLED unchanged):

- **QUICK MP**: keep "AI-Powered Waste Sorting" but rewrite copy to reflect simple Accept/Decline workflow (no abstract step, direct Creator review). `solver_audience: 'ALL'`. Currency `INR`, prize `500000`. Add a short `creator_legal_instructions` showing the Platform CPA template will be used (KEEP_DEFAULT path).
- **QUICK AGG**: rotate `solver_audience` to `'INTERNAL'` so the new `QuickPublishConfirmModal` demonstrates "Solution Providers from your organization only." Currency `USD`, prize `300000`. Mention internal sprint context.
- Both QUICK seeds: explicitly set `quick_legal_override_mode: 'KEEP_DEFAULT'`, `evaluation_method: 'SINGLE'`, `evaluator_count: 1`, `phase_durations: []` (QUICK skips phase 5/6 via DB config — no schedule needed).
- Both QUICK seeds: ensure `domain_tags` has 3-5 relevant tags (currently inherited from base AGG/MP — re-state explicitly so QUICK is self-contained and not 6-tag enterprise overkill).

STRUCTURED + CONTROLLED seed copy stays — it's still correct for those flows.

### 2. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — `handleFillTestData` auto-picks industry

Replace the current line that uses `industrySegmentId || ''` with a 3-tier resolution:

1. Use `industrySegmentId` prop if Step 1 set one.
2. Else use `currentOrg`'s primary industry (already loaded via `useOrgModelContext` upstream — pass it through, OR read from `form` defaults if available).
3. Else fall back to the first entry from `useIndustrySegmentOptions()`.

After resolution, also call `onIndustrySegmentChange` upstream so Step 1's Select reflects the auto-pick (keeps UI consistent — user sees what was chosen).

To do that without prop drilling, add an optional callback prop `onIndustrySegmentResolved?: (id: string) => void` and pass `setIndustrySegmentId` from `ChallengeCreatePage`.

Also: pull `useIndustrySegmentOptions` into `ChallengeCreatorForm` (already imported in the page; just import here too — it's a cached query, no extra fetch) so the fallback list is local to the handler.

### 3. `src/pages/cogniblend/ChallengeCreatePage.tsx` — wire the new callback

Pass `onIndustrySegmentResolved={setIndustrySegmentId}` to `<ChallengeCreatorForm/>`. Single line addition.

## What does NOT change
- `creatorFormSchema.ts`, `governanceFieldFilter.ts`, `QuickPublishConfirmModal.tsx`, `ChallengeConfigurationPanel.tsx` — untouched.
- STRUCTURED + CONTROLLED seed copy and behavior — untouched.
- DB / RPC / migrations — none required (this is pure UI seed/wiring work).
- Org-context fill (`onFillTestData` → `setOrgFillTrigger`) — untouched.

## Verification checklist
1. Click **Fill Test Data** without selecting an industry first → industry auto-picks from org primary or first available; Step 1 dropdown updates; form passes Zod validation.
2. QUICK MP fill → Title shows waste-sorting scenario; `solver_audience='ALL'`; Publish opens modal with "All Solution Providers on the platform."
3. QUICK AGG fill → `solver_audience='INTERNAL'`; Publish opens modal with "Solution Providers from your organization only."
4. STRUCTURED MP/AGG fill → unchanged copy and behavior.
5. CONTROLLED MP/AGG fill → unchanged copy, phase durations and Delphi seed intact.
6. `npx tsc --noEmit` passes; no file exceeds 250 lines (seed file stays a constants file, exempted by R10 spirit, but we keep edits minimal).

