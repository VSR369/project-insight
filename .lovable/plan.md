

## Phase-wise Timeline Toggle for Creator Screen

### Overview
Add a toggle to STRUCTURED and CONTROLLED governance modes that lets creators optionally define target dates for solver-facing phases. Default shows duration-only (current behavior). When toggled ON, shows an editable phase table.

### Changes

**File 1: `src/components/cogniblend/creator/CreatorPhaseTimeline.tsx`** (NEW, ~180 lines)
- Props: `governanceMode`, `value` (timeline + phase_durations), `onChange`
- Top section: duration select dropdown (4w/8w/16w/32w) — same TIMELINE_OPTIONS
- Toggle: "Define phase-wise schedule" Switch, default OFF
- Helper text changes based on toggle state
- Phase table (visible when ON): 5 rows for phases 5/6/8/9/10
  - Phase label + description (read-only)
  - Target date input (`type="date"`, min=today)
  - Duration days badge (auto-calculated from previous phase date or today)
  - Validation: each date must be >= previous date (red error if out of order)
  - Total duration badge at bottom with amber warning if mismatch with selected timeline
- `onChange` emits full `phase_schedule` object with `source: "creator"` and optional `phase_durations` array

**File 2: `src/components/cogniblend/creator/creatorFormSchema.ts`**
- Add `phase_durations` optional field to schema:
  ```
  phase_durations: z.array(z.object({
    phase_number: z.number(), label: z.string(),
    target_date: z.string(), duration_days: z.number(),
  })).optional().default([])
  ```
- Add `phase_durations` to `CreatorFormValues` type

**File 3: `src/components/cogniblend/creator/EssentialDetailsTab.tsx`**
- Replace the plain `Input` for `expected_timeline` in STRUCTURED collapsible with `CreatorPhaseTimeline` using nested `Controller` for both `expected_timeline` and `phase_durations`

**File 4: `src/components/cogniblend/creator/AdditionalContextTab.tsx`**
- Replace the `Select` for `expected_timeline` (CONTROLLED) with `CreatorPhaseTimeline` using nested `Controller`

**File 5: `src/lib/cogniblend/challengePayloads.ts`**
- Add `phaseDurations` to `DraftPayload` and `SubmitPayload` interfaces
- Update `buildChallengeUpdatePayload` to include `phase_durations` and `source: "creator"` in `phase_schedule`

**File 6: `src/hooks/cogniblend/useCreatorDraftSave.ts`**
- Add `phaseDurations: data.phase_durations?.length ? data.phase_durations : undefined` to the base payload

**File 7: `src/lib/cogniblend/curationSectionDefs.tsx`**
- Add "Target Date" column to the phase_schedule table rendering (lines ~449-461)
- Add source badge when `phase_schedule.source === 'creator'`

**File 8: `src/components/cogniblend/creator/creatorSeedContent.ts`**
- CONTROLLED seeds: add `phase_durations` with dates ~3 months from today
- STRUCTURED seeds: no `phase_durations` (toggle OFF)

### Technical Details
- No database migration needed — `phase_schedule` JSONB column already exists
- Duration calculation: `daysBetween(prevDate || today, currentDate)`
- Timeline weeks to days mapping: `{ '4w': 28, '8w': 56, '16w': 112, '32w': 224 }`
- Phase numbers 5/6/8/9/10 match `md_lifecycle_phase_config` solver-facing phases (skipping 7 which is internal)

