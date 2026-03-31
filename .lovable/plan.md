

# Fix: Maturity Level, Delete Bug, Draft Resume, and Creator→Curator Data Flow

## Issues Found

### Bug 1: Missing "Prototype" maturity option
`EssentialDetailsTab.tsx` has only 3 options (blueprint, poc, pilot). The Zod schema in `ChallengeCreatorForm.tsx` also omits `prototype`. DB accepts 4: BLUEPRINT, POC, PROTOTYPE, PILOT.

### Bug 2: Delete not working
`useMyChallenges.ts` line 38 selects `id, title, current_phase, master_status, phase_status, governance_profile, operating_model` — **`is_deleted` is NOT in the select**. So the filter on line 51 (`if (!ch || ch.is_deleted) continue`) never triggers because `ch.is_deleted` is always `undefined`. Deleted challenges keep showing.

### Bug 3: Draft resume shows empty form
When a draft is saved, `maturity_level` is written as `BLUEPRINT` (uppercase). When resuming, the form hydration on line 191 does `(ch.maturity_level as any) || undefined` — but the Zod enum expects lowercase `'blueprint'`. The uppercase value fails validation silently, and since the resolver rejects it, the field appears empty. Same potential issue for other fields.

### Bug 4: Save Draft missing fields + creating duplicates
`handleSaveDraft` in `ChallengeCreatorForm.tsx` (line 293-312) does NOT include `maturityLevel`, `ipModel`, or `industrySegmentId` in the draft payload. These fields are lost on save. Additionally, `useSaveDraft` always calls `initialize_challenge` to create a NEW challenge — if the user saves draft multiple times without a `draftChallengeId` being set (e.g., due to an error), it creates duplicate records.

---

## Plan

### File 1: `src/components/cogniblend/creator/EssentialDetailsTab.tsx`
- Add `prototype` to `MATURITY_OPTIONS` array (between poc and pilot)

### File 2: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
- Add `'prototype'` to the Zod enum: `z.enum(['blueprint', 'poc', 'prototype', 'pilot'])`
- Fix draft hydration: lowercase `maturity_level` when loading from DB (`ch.maturity_level?.toLowerCase()`)
- Fix `handleSaveDraft` to include `maturityLevel`, `ipModel`, and `industrySegmentId` in the payload

### File 3: `src/hooks/cogniblend/useMyChallenges.ts`
- Add `is_deleted` to the challenge select query so the filter on line 51 actually works

### File 4: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`
- In `useSaveDraft`: add `currentDeficiencies` field to extended_brief (currently missing)
- Ensure `title` is written in the draft save (currently only uses problem_statement substring)

No new files. No migrations needed (all columns already exist).

