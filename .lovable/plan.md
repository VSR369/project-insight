

## Plan: Fix Maturity Level Save, Enhance Complexity Override, Fix Domain Tags Editor

### Issues Found

1. **Maturity Level won't save** — DB trigger requires **uppercase** values (`BLUEPRINT`, `POC`, `PROTOTYPE`, `PILOT`) but the Select sends lowercase keys from `MATURITY_LABELS`. Fix: `.toUpperCase()` before saving.

2. **Complexity Assessment lacks direct override** — Currently only supports slider-based calculation. Need to add a quick-select option (L1–L5 with labels like "Low", "Medium", "High") that overrides the calculated value.

3. **Domain Tags editor works but UX needs improvement** — The edit button exists but the flow isn't YouTube-style (always-editable inline tags). Need to make tags directly editable in view mode without needing to click Edit first.

---

### Changes

#### File: `src/pages/cogniblend/CurationReviewPage.tsx`

**1. Maturity Level — uppercase fix (line ~919)**
- Change `handleSaveMaturityLevel` to save `value.toUpperCase()` instead of `value`

**2. Complexity Assessment — add direct level override**
- Add a row of 5 clickable level buttons (L1 Very Low, L2 Low, L3 Medium, L4 High, L5 Very High) above the sliders
- Clicking a button sets `complexity_level` directly and auto-sets `complexity_score` to the midpoint of that level's range
- Label: "Quick select or use sliders below for precise calculation"
- Both modes coexist: clicking a level button pre-fills, sliders refine

**3. Domain Tags — always-editable inline (YouTube-style)**
- Remove the Edit button requirement for domain tags
- In the section's default render, show existing tags as removable badges + the tag input field always visible
- Tags are added/removed directly without entering "edit mode"
- Save happens on each add/remove (auto-save) rather than requiring explicit Save button

### Technical Details

- Maturity: Single line change — `value.toUpperCase()` in `handleSaveMaturityLevel`
- Complexity: Add `Select` dropdown or button group for L1–L5 inside the complexity edit UI, above sliders. On click, set draft values to preset midpoints and update score display
- Domain Tags: Refactor the `domain_tags` section's `render` function to include the tag input inline. Each add/remove triggers `saveSectionMutation` immediately with the updated array

