

# Complexity Assessment UX Redesign

## Problem

The current UI has overlapping controls (Override toggle, Quick Select buttons, confirmation dialogs) that confuse users. The three assessment paths are not self-explanatory and the UX mixes concerns.

## Redesigned UX: 3 Clear Paths via Tab Selector

Replace the current mode/toggle/dialog mess with a clean **3-tab card selector** at the top. Each tab contextualizes the entire UI below it.

```text
┌─────────────────┐  ┌──────────────────────┐  ┌─────────────────┐
│  🤖 AI Review   │  │  🎚️ Manual Params    │  │  ⚡ Quick Select │
│  (recommended)  │  │  Adjust each slider  │  │  Pick a level   │
└─────────────────┘  └──────────────────────┘  └─────────────────┘
```

### Tab 1: AI Review (default)
- Shows AI-generated parameter ratings as **read-only bars** with justifications
- Score badge + derived level visible
- Sliders are NOT interactive but each shows a small "edit" pencil icon — clicking it directly makes THAT slider editable (badges it "Curator") without switching tabs. This addresses "simply allow override of AI-given parameter ratings"
- "Re-review this section" button at bottom (triggers AI re-assessment)
- Save button appears only when any param has been curator-edited

### Tab 2: Manual Parameters
- ALL sliders unlocked and interactive (1-10)
- Live weighted score recalculation as sliders move
- Derived level shown from score
- Source badges: AI / Curator / Default per parameter
- Save + Cancel buttons always visible

### Tab 3: Quick Select
- **5 level cards** (NOT buttons) in a vertical or 2-column grid:

```text
┌──────────────────────────────────────────┐
│  L1 — Very Low                           │
│  Score range: 0–2. Routine, well-defined │
│  challenges with established methods.    │
│                              [ Select ]  │
├──────────────────────────────────────────┤
│  L2 — Low                                │
│  Score range: 2–4. Moderate complexity    │
│  with some novel elements.               │
│                              [ Select ]  │
├──── ... L3, L4, L5 ─────────────────────┤
```

- When a level is selected, it's highlighted with a checkmark
- **Score display is HIDDEN** (no weighted score, no slider bars) — just the selected level card
- Parameter sliders NOT shown at all in this tab
- Save + Cancel visible after selection

### Confirmation Dialog
- Only appears when switching tabs IF the user has unsaved edits in the current tab
- Message: "You have unsaved changes. Switching will discard them. Continue?"
- NOT triggered when switching from a clean/saved state

### Key Changes from Current Code

1. **Remove** the `Override Assessment` Switch/toggle entirely
2. **Remove** the small L1-L5 buttons row — replaced by descriptive cards in Quick Select tab
3. **Add** tab selector (3 cards/tabs) at top of component
4. **AI Review tab**: allow per-param inline edit (click pencil on any slider to make it editable, no mode switch needed)
5. **Quick Select tab**: hide score and sliders, show only level cards with descriptions
6. **Confirmation dialog**: only on tab switch with dirty state, not on every override attempt

### Files to Change

**`src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`** — Full rewrite of the render section:
- Add tab state (`activeTab: 'ai_review' | 'manual_params' | 'quick_select'`)
- Tab selector row with 3 cards (icon + title + subtitle)
- Conditional rendering per tab
- Per-param edit button in AI Review tab (sets individual param to editable)
- Quick Select renders `COMPLEXITY_THRESHOLDS` as descriptive cards
- Dirty-state tracking for tab-switch confirmation
- Remove Override toggle, Quick Select button row, and always-show confirmation

**`src/pages/cogniblend/CurationReviewPage.tsx`** — No changes needed (props interface stays the same; `onSave` signature unchanged)

### Data Flow (unchanged)
- `onSave(params, score, level, mode)` — same signature
- AI Review tab with edits: `mode = 'AI_AUTO'`, score/level derived
- Manual Params tab: `mode = 'MANUAL_PARAMS'`, score/level derived
- Quick Select tab: `mode = 'QUICK_OVERRIDE'`, level = user selection, score = 0 (not applicable)

