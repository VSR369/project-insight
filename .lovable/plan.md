

# Fix: Curator Version Gate Logic + Phase Auto-Completion Mystery

## Root Cause Analysis

The "mystery" of why the Curator Version shows content for a new challenge is now fully explained:

### Phase Auto-Completion Chain
When the Creator clicks "Submit to Curator", the `complete_phase` RPC executes recursively:

```text
Phase 1 (requires CR) → Creator has CR → ✅ complete
  ↓ auto-advance to Phase 2
Phase 2 (requires CR) → SAME_ACTOR → ✅ auto-complete
  ↓ auto-advance to Phase 3
Phase 3 (requires CU) → different actor → hand off, set phase_status = 'ACTIVE'
```

Result: `current_phase = 3, phase_status = 'ACTIVE'`

This is correct behavior — Phase 3 ACTIVE means "waiting for the Curator to start/complete their work." No AI engine is running automatically; the phase advancement is a governance chain reaction, not content generation.

### Why the Gate Failed
The current gate logic is:
```typescript
(data.current_phase ?? 1) >= 3
```

This passes because `current_phase = 3`, but this only means "the ball is in the Curator's court." The Curator hasn't done anything yet. The Curator Version tab should only show content **after** the Curator has completed Phase 3.

## Fix

### File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`

**Change the gate logic** from checking `current_phase >= 3` to checking whether the Curator has actually completed their phase. The correct condition is:

```typescript
// Curator has finished when: current_phase > 3 (moved past curation)
// OR current_phase === 3 AND phase_status === 'COMPLETED'
const curatorCompleted = 
  (data.current_phase ?? 1) > 3 || 
  ((data.current_phase ?? 1) === 3 && data.phase_status === 'COMPLETED');
```

This means:
- Phase 3 + ACTIVE → "Under Review by Curator" (curator hasn't finished)
- Phase 3 + COMPLETED → Show Curator Version (curator submitted)
- Phase 4+ → Show Curator Version (already past curation)

**Also need to add `phase_status` to the data model** — check if `usePublicChallenge` already fetches it.

### Data Model Check
The `usePublicChallenge` hook needs to include `phase_status` in its query if not already present.

### Summary of Changes

| File | Change |
|------|--------|
| `CreatorChallengeDetailView.tsx` | Update gate from `current_phase >= 3` to `current_phase > 3 OR (current_phase === 3 AND phase_status === 'COMPLETED')` |
| `usePublicChallenge.ts` | Add `phase_status` to the select query and `PublicChallengeData` type (if missing) |

No database changes needed. No AI engine is running — the phase auto-advancement is by design in `complete_phase`.

