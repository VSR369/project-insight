

## Fix Seed Demo + Fill Test Data + Field Sync Bugs

### Problem Summary
1. **Seed Demo edge function** — CONTROLLED challenges (C1, C2) have no `phase_durations` or `source` in `phase_schedule`
2. **WeightedCriteriaEditor double-click bug** — The `useEffect` sync only replaces when `fields.length === 0`, so on second fill, stale fields persist until a re-render cycle
3. **CreatorPhaseTimeline internal state not syncing** — Uses `useState` initialized once; `form.reset()` doesn't update internal `phases` state, so toggling shows stale/empty dates after fill

### Changes

**File 1: `supabase/functions/setup-test-scenario/index.ts`**
- C1 (CONTROLLED+AGG, line 260): Replace `phase_schedule: { expected_timeline: "6-12" }` with:
  ```
  phase_schedule: {
    expected_timeline: "6-12",
    source: "creator",
    phase_durations: [
      { phase_number: 5, label: "Solver Submission Period", target_date: "2026-07-15", duration_days: 45 },
      { phase_number: 6, label: "Abstract/Proposal Review", target_date: "2026-08-01", duration_days: 17 },
      { phase_number: 8, label: "Full Solution Review", target_date: "2026-09-01", duration_days: 31 },
      { phase_number: 9, label: "Award Decision", target_date: "2026-09-15", duration_days: 14 },
      { phase_number: 10, label: "Payment & Delivery", target_date: "2026-10-01", duration_days: 16 },
    ]
  }
  ```
- C2 (CONTROLLED+MP, line 287): Same pattern with slightly different dates
- C3/C4 (STRUCTURED): Add `source: "creator"` only (no `phase_durations` — Curator sets phases)

**File 2: `src/components/cogniblend/creator/WeightedCriteriaEditor.tsx`**
- Fix the sync `useEffect` to handle both cases: fields empty AND fields stale (different length than watched value)
- Change condition from `fields.length === 0` to comparing lengths AND checking if values actually differ:
  ```typescript
  useEffect(() => {
    if (!watchedCriteria || watchedCriteria.length === 0) return;
    // Replace when fields are empty OR when external value changed (e.g., second fill)
    if (fields.length !== watchedCriteria.length ||
        fields.some((f, i) => (f as any).name !== watchedCriteria[i]?.name)) {
      replace(watchedCriteria as never[]);
    }
  }, [watchedCriteria, fields, replace]);
  ```

**File 3: `src/components/cogniblend/creator/CreatorPhaseTimeline.tsx`**
- Add a `useEffect` that watches `value.phase_durations` prop and syncs internal `phases` state + `showPhases` toggle when the external value changes (handles `form.reset()` from Fill Test Data):
  ```typescript
  useEffect(() => {
    const incoming = value.phase_durations;
    if (incoming?.length) {
      setPhases(incoming);
      setShowPhases(true);
    } else if (!incoming || incoming.length === 0) {
      setShowPhases(false);
      setPhases(CREATOR_PHASES.map(p => ({ ... empty ... })));
    }
  }, [value.phase_durations]);
  ```
- This ensures: CONTROLLED fill → toggle ON with dates populated; STRUCTURED fill → toggle OFF with empty phases

**File 4: `src/components/cogniblend/creator/creatorSeedContent.ts`**
- Already has `phase_durations` for CONTROLLED (lines 303-309) — no change needed
- Already has empty `phase_durations` for STRUCTURED — no change needed

### Technical Notes
- The WeightedCriteriaEditor fix uses a shallow comparison of criterion names to detect stale fields, avoiding unnecessary re-renders when values haven't changed
- The CreatorPhaseTimeline sync uses a JSON-stable reference check via the prop to avoid infinite loops
- Edge function deploy required for seed demo changes

