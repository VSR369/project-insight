

# Complexity Assessment — 3-Mode State Machine Refactor

## Problem

The current `ComplexityAssessmentModule` has a single boolean `overrideEnabled` that conflates two different override behaviors (manual sliders vs. quick-select). This causes:

1. **No confirmation gate** — toggling Override or clicking Quick Select immediately changes state with no warning that AI assessment is being overridden
2. **Quick Select saves immediately** — bypasses any review, no undo path
3. **Score/level coupling confusion** — Quick Select recalculates slider values to match a target score, but the intent is to disconnect the level from the calculated score entirely
4. **No mode persistence** — the assessment mode (AI vs. manual vs. quick override) is not saved to DB

## Design: 3-Mode State Machine

```text
┌──────────────────────────────────────────────────────┐
│                    AI_AUTO (default)                  │
│  Sliders: read-only bars                             │
│  Score: from AI / stored value                       │
│  Quick Select: disabled until confirmed              │
│  Override toggle: triggers confirmation dialog       │
├──────────────────────────────────────────────────────┤
│         ↓ Confirm override?                          │
│    ┌────────────────────────────────────┐             │
│    │   Confirmation AlertDialog        │             │
│    │   "Override AI assessment?"       │             │
│    │   [Cancel]  [Confirm]             │             │
│    └────────────────────────────────────┘             │
│         ↓ Confirm                     ↓ Cancel       │
│    Mode = pendingMode            Stay AI_AUTO        │
├──────────────────────────────────────────────────────┤
│              MANUAL_PARAMS                           │
│  Sliders: interactive (1-10)                         │
│  Score: live weighted calculation                    │
│  Level: derived from score via thresholds            │
│  Save/Cancel buttons visible                         │
├──────────────────────────────────────────────────────┤
│              QUICK_OVERRIDE                          │
│  Sliders: read-only (no interaction)                 │
│  Score: still calculated but informational only      │
│  Level: FIXED to the selected L1-L5 button           │
│  Level is disconnected from score                    │
│  Quick Select buttons remain active to change level  │
│  Save/Cancel buttons visible                         │
└──────────────────────────────────────────────────────┘
```

## Implementation Plan

### File: `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`

#### 1. Add mode state and confirmation dialog

- Replace `overrideEnabled: boolean` with `mode: 'AI_AUTO' | 'MANUAL_PARAMS' | 'QUICK_OVERRIDE'`
- Add `pendingMode` state and `showConfirmDialog` boolean
- Import `AlertDialog` components from `@/components/ui/alert-dialog`

#### 2. Confirmation flow

When in `AI_AUTO` mode:
- **Override toggle ON** → set `pendingMode = 'MANUAL_PARAMS'`, open dialog
- **Quick Select click** → set `pendingMode = 'QUICK_OVERRIDE'`, store clicked level, open dialog
- **Dialog Confirm** → apply `pendingMode` as active `mode`, execute the pending action
- **Dialog Cancel** → clear `pendingMode`, keep `AI_AUTO`

When already in `MANUAL_PARAMS` or `QUICK_OVERRIDE`:
- Override toggle and Quick Select work immediately (no re-confirmation needed)
- Switching between MANUAL and QUICK does not require confirmation

#### 3. Mode-specific behavior

| Aspect | AI_AUTO | MANUAL_PARAMS | QUICK_OVERRIDE |
|--------|---------|---------------|----------------|
| Sliders | Read-only bars | Interactive | Read-only bars |
| Score display | Stored/AI value | Live weighted calc | Weighted calc (informational) |
| Level display | Derived from score | Derived from score | Fixed to selected button |
| Quick Select | Gated by confirm | Changes mode to QUICK_OVERRIDE | Active, changes level directly |
| Override toggle | Shows, triggers confirm | Shows ON, toggle OFF → AI_AUTO | Shows ON, toggle OFF → AI_AUTO |
| Save/Cancel | Hidden | Visible | Visible |

#### 4. Quick Select in QUICK_OVERRIDE mode

- Does NOT recalculate slider values
- Simply sets `overrideLevel` to the clicked L1-L5
- Slider values remain as-is (from AI or previous manual edit)
- Score is still calculated and shown but labeled "Calculated Score" (informational)
- The saved level is the user's chosen override, not the derived level

#### 5. Save behavior

- `onSave` called with: `{ params, score, level, mode }`
- In QUICK_OVERRIDE: `level` = user's selected level (not derived from score)
- In MANUAL_PARAMS: `level` = derived from weighted score
- In AI_AUTO: save not available (read-only)

#### 6. Cancel behavior

- Resets `mode` to `AI_AUTO`
- Restores draft from `currentParams`
- Clears any `overrideLevel`

#### 7. Persist mode to DB

- Add `assessment_mode` to the save payload in `handleSaveComplexity` (in CurationReviewPage)
- This requires no new column — store as part of the `complexity_parameters` JSON (add `_meta: { mode }` field)

### No database migration needed

The mode is stored inside the existing `complexity_parameters` JSONB column as metadata, avoiding schema changes.

## Technical Details

- Uses existing `AlertDialog` from `@/components/ui/alert-dialog`
- No new dependencies
- Props interface adds optional `onSave` parameter for mode
- Maintains backward compatibility with existing saved data (mode defaults to `AI_AUTO` if not present in params)
- `deriveComplexityLevel` and weighted score calculation logic remain unchanged

