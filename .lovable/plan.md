

## Bidirectional Sync: Target Timeline ↔ Phase Schedule

### Problem
Currently there is **no sync** between the two controls:
1. Changing the **Target Timeline** dropdown (e.g., 4w → 16w) does NOT adjust phase dates
2. Changing **phase dates** does NOT update the Target Timeline dropdown to reflect actual total duration
3. The dropdown only offers fixed values (4w/8w/16w/32w), so a 72-day schedule still shows "8 weeks"

### Solution

**Direction 1 — Phase dates → Timeline dropdown (bottom-up sync):**
- After any phase date change, calculate `totalDays` from today to last phase date
- Find the closest matching `TIMELINE_OPTIONS` entry and auto-update the dropdown
- Use a "snap to nearest" approach: 0-35 days → 4w, 36-84 → 8w, 85-168 → 16w, 169+ → 32w

**Direction 2 — Timeline dropdown → Phase dates (top-down sync):**
- When user changes the dropdown AND phases already have dates, proportionally redistribute dates
- Calculate current total span, compute scale factor (`newDays / oldDays`), apply to each phase offset from today
- If no dates are set yet, auto-populate evenly spaced dates across the selected duration

### Changes — Single file: `src/components/cogniblend/creator/CreatorPhaseTimeline.tsx`

1. **Add `daysToTimeline` helper** — maps total days to nearest timeline option value
   ```
   function daysToTimeline(days: number): string {
     if (days <= 35) return '4w';
     if (days <= 84) return '8w';
     if (days <= 168) return '16w';
     return '32w';
   }
   ```

2. **Update `updatePhaseDate`** — after setting dates and calling `onChange`, also compute the matching timeline:
   ```
   const lastDate = updated[updated.length - 1].target_date;
   if (lastDate) {
     const total = differenceInCalendarDays(new Date(lastDate), new Date(today));
     const newTimeline = daysToTimeline(total);
     onChange({ expected_timeline: newTimeline, phase_durations: updated });
   }
   ```

3. **Update `handleTimelineChange`** — when dropdown changes and phases have dates, redistribute:
   - Calculate current total span (today → last phase date)
   - Compute ratio: `newDays / currentTotalDays`
   - Scale each phase's offset from today by that ratio, round to whole days
   - Recalculate `duration_days` for each phase
   - Call `setPhases(redistributed)` and `onChange` with both new timeline and updated phases
   - If no dates set, auto-populate with even distribution across the new duration

4. **Remove the mismatch warning badge** — since timeline and dates now stay in sync, the "X days over/under" warning becomes unnecessary (dates always snap the dropdown). Keep total days badge for reference.

### Technical Notes
- The proportional redistribution preserves the relative spacing the user set — e.g., if submission was 50% of total time, it stays 50% after rescaling
- `daysToTimeline` uses midpoint boundaries so the dropdown reflects the closest standard option
- No schema or payload changes needed — `expected_timeline` and `phase_durations` are already wired

