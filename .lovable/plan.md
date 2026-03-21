

## Plan: Complexity Assessment — Standalone Component with Override Toggle

### What Exists Today
The complexity assessment is inline in `CurationReviewPage.tsx` (lines 1394-1474). It has:
- Quick-select buttons (L1-L5) that set all sliders to midpoint
- Per-parameter sliders (1-10) with weighted score calculation
- Save/Cancel buttons
- It only appears when `editingSection === "complexity"` (edit mode)

The read-only view (lines 384-410) shows score, level badge, and parameter values.

### What Changes

#### 1. New file: `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`
Extract the complexity UI into a dedicated component with these behaviors:

**Default (read-only) state:**
- Show the AI-generated parameters with their current values as labeled bars/indicators
- Prominent "Final Complexity Score" badge (score + L1-L5 level label) always visible at top
- "Override AI Assessment" toggle switch (off by default)

**Override mode (toggle ON):**
- Unlocks all parameter sliders for manual adjustment
- Real-time recalculation of weighted score as sliders move
- Quick-select buttons (L1-L5) remain available for bulk override
- Save/Cancel buttons appear

**Direct override:**
- A dropdown/button row (L1-L5) always visible, allowing instant level selection regardless of toggle state — sets all params to that level's midpoint and saves

**Props:**
- `challenge` data (complexity_score, complexity_level, complexity_parameters)
- `complexityParams` from `useComplexityParams()`
- `onSave(params, score, level)` callback
- `saving` boolean

#### 2. Update: `src/pages/cogniblend/CurationReviewPage.tsx`
- Replace the inline complexity editor block (lines 1394-1474) and the read-only render (lines 384-410) with `<ComplexityAssessmentModule />`
- The component handles its own toggle state internally — no need for `editingSection === "complexity"` guard
- Keep existing `handleSaveComplexity` logic, pass as `onSave` prop
- Remove `handleStartComplexityEdit` (no longer needed — component manages its own state)

### Component Structure

```text
┌─────────────────────────────────────────┐
│ Final Complexity Score: 5.42  [L3-Med]  │  ← always visible badge
├─────────────────────────────────────────┤
│ Quick Override: [L1] [L2] [L3] [L4] [L5] ← always clickable
├─────────────────────────────────────────┤
│ [Toggle: Override AI Assessment]         │
├─────────────────────────────────────────┤
│ Technical Risk        ████████░░  8     │  ← locked/unlocked
│ Timeline Pressure     ██████░░░░  6     │
│ Resource Needs        █████░░░░░  5     │
│ ...                                      │
├─────────────────────────────────────────┤
│                        [Cancel] [Save]   │  ← only when override ON
└─────────────────────────────────────────┘
```

### Technical Details
- Uses existing `useComplexityParams()` hook, `COMPLEXITY_THRESHOLDS`, `deriveComplexityLevel`, `deriveComplexityLabel`
- Switch component from `@/components/ui/switch` for the override toggle
- Slider from `@/components/ui/slider` for parameters
- Badge from `@/components/ui/badge` for score display
- Internal state: `overrideEnabled` (boolean), `draft` (Record<string, number>)
- Score recalculates on every draft change via `useMemo`

