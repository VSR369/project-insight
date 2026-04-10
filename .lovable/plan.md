

## Fix "Submit to Curator" for CONTROLLED and STRUCTURED Modes

### Problem
The "Submit to Curator" button silently fails. Two root causes:

1. **No validation error feedback** — `form.handleSubmit()` has no error handler (second argument). When Zod validation fails (likely for CONTROLLED's many required fields), nothing happens — no toast, no visual indication.

2. **Phase schedule data lost on submit** — The `buildPayload` function in `ChallengeCreatorForm.tsx` doesn't pass `phaseDurations` to the `SubmitPayload`. Additionally, the `useChallengeSubmit` mutation (line 104) hardcodes `phase_schedule: { expected_timeline: ... }`, overwriting `phase_durations` and `source` even when they exist.

### Changes

**File 1: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- Add error handler to `form.handleSubmit` that shows a toast with the first validation error and logs the field name:
  ```typescript
  const handleSubmit = form.handleSubmit(
    async (data) => { ... },
    (errors) => {
      const firstKey = Object.keys(errors)[0];
      const firstError = errors[firstKey as keyof typeof errors];
      toast.error(`Please fix: ${firstError?.message || firstKey}`);
    }
  );
  ```
- Add `phaseDurations` to `buildPayload`:
  ```typescript
  phaseDurations: data.phase_durations?.length ? data.phase_durations : undefined,
  ```

**File 2: `src/hooks/cogniblend/useChallengeSubmit.ts`**
- Fix line 104 to include `phase_durations` and `source` in the `phase_schedule` object:
  ```typescript
  phase_schedule: {
    expected_timeline: filteredPayload.expectedTimeline,
    source: 'creator',
    ...(filteredPayload.phaseDurations?.length
      ? { phase_durations: filteredPayload.phaseDurations }
      : {}),
  },
  ```
- Same fix for the creator snapshot `phase_schedule` on line 152

### Technical Notes
- The silent failure is the primary UX issue — adding the error handler will immediately show users which field is blocking submission
- The `phase_durations` fix ensures the bidirectional timeline data survives the submit flow
- No database or RPC changes needed — `phase_schedule` is already a JSONB column that accepts any structure

