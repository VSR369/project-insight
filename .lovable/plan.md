

# Redesign Reward Structure — Phased Implementation Plan

## Current State
The existing `RewardStructureDisplay.tsx` (748 lines) is a monolithic component with inline editing for monetary tiers, payment milestones, and non-monetary tiered perks. It has no concept of upstream data sources, no mutual exclusivity enforcement, no source attribution, and no type-chooser wizard. The challenge's `operating_model` field (`'MP'` / `'AGG'`) is already available in the curation page query.

No `rewardStructureResolver` service exists yet. No upstream reward data from AM/CA/CR roles is currently resolved — the component just reads `challenge.reward_structure` directly.

---

## Phased Approach

### Phase 1: Foundation — Service Layer + State Hook
**Files created:**
- `src/services/rewardStructureResolver.ts` — Pure functions: `resolveRewardSource()` reads the challenge's `reward_structure` JSONB and `operating_model` to determine source role (AM/CA/CR/CURATOR), `isAutoPopulated`, and `isEditable`. Role display name mapping. Since upstream role data is embedded in the same `reward_structure` JSONB (not separate tables), the resolver checks for a `source_role` field within the JSON, falling back to model-based inference.
- `src/hooks/useRewardStructureState.ts` — State machine hook managing `RewardSectionState` (`empty_no_source`, `populated_from_source`, `curator_editing`, `saved`, `reviewed`). Handles transitions, mutual exclusivity assertion (`monetary` XOR `non_monetary`), and the `validateRewardStructure()` function with all monetary/non-monetary validation rules.
- `src/lib/rewardValidation.ts` — Pure validation utilities: tier ordering enforcement, total pool matching, non-monetary item validation, auto-balance algorithm.

### Phase 2: Type Chooser Wizard + Reward Type Toggle
**Files created:**
- `src/components/cogniblend/curation/rewards/RewardTypeChooser.tsx` — Full guided setup with two large cards (Monetary / Non-Monetary). Shown when `state === 'empty_no_source'` and `type === null`. On selection, transitions to `curator_editing`.
- `src/components/cogniblend/curation/rewards/RewardTypeToggle.tsx` — Two-option toggle (not tabs). Switching with existing data shows confirmation dialog. Enforces mutual exclusivity.

### Phase 3: Monetary Reward Editor
**Files created:**
- `src/components/cogniblend/curation/rewards/MonetaryRewardEditor.tsx` — Contains:
  - Lump sum input mode (currency selector + amount + AI Breakup button)
  - Prize tier cards (Platinum/Gold/Silver/Honorable Mention) with the specified visual design
  - Live total validator with color-coded states (green/amber/red)
  - Tier ordering enforcement with inline errors
  - Auto-balance functionality
- `src/components/cogniblend/curation/rewards/PrizeTierCard.tsx` — Individual tier card component (icon, label, amount input, winner count input)

### Phase 4: Non-Monetary Reward Editor
**Files created:**
- `src/components/cogniblend/curation/rewards/NonMonetaryRewardEditor.tsx` — Contains:
  - Type-categorized item cards with badge colors per type
  - Inline editing (title + description textarea)
  - AI suggestion panel ("Generate with AI" button)
  - Add item flow (type selector pills → inline form)
  - Drag-sortable items via `@dnd-kit/sortable`
- `src/components/cogniblend/curation/rewards/NonMonetaryItemCard.tsx` — Individual card with type badge, hover delete, AI/source attribution dots

### Phase 5: Source Attribution + AI Integration
**Changes:**
- `src/components/cogniblend/curation/rewards/SourceBanner.tsx` — Blue info banner showing "Populated from [Role] · [Date]" with Edit button. Reset option when curator modifies auto-populated data. "Modified" pills on changed fields.
- `src/services/aiRewardBreakup.ts` — AI breakup service calling edge function with structured prompts for both monetary tier breakdown and non-monetary suggestions. Handles response parsing and validation.
- Update `ai-field-assist` edge function to support `reward_tier_breakup` and `non_monetary_suggestions` field names with the specified system/user prompts.

### Phase 6: Compose + Integrate
**Files modified:**
- `src/components/cogniblend/curation/RewardStructureDisplay.tsx` — **Complete rewrite** as a thin orchestrator that:
  1. Calls `resolveRewardSource()` to determine state
  2. Uses `useRewardStructureState()` hook for state machine
  3. Renders `RewardTypeChooser` (empty state), `SourceBanner` (populated), `RewardTypeToggle` (editing), `MonetaryRewardEditor` or `NonMonetaryRewardEditor` based on type, validation summary bar, and save/cancel footer
  4. Handles reviewed state footer with re-review button
- `src/pages/cogniblend/CurationReviewPage.tsx` — Pass `aiStatus`/`panelStatus` to `RewardStructureDisplay` (minor prop addition)

---

## Technical Notes

- **No database changes needed** — all data stays in `reward_structure` JSONB column. Source role metadata is stored within the JSON itself (e.g., `{ source_role: 'AM', source_date: '...', type: 'monetary', ... }`).
- **Backward compatible** — existing reward data (platinum/gold/silver flat numbers, payment_milestones, tiered_perks) is parsed and migrated in-memory to the new interface format.
- **Mutual exclusivity** — enforced at three levels: UI toggle prevents simultaneous display, state hook asserts before save, validation function blocks save if both populated.
- **Auto-balance algorithm** — scales each tier proportionally: `newAmount = Math.round(tierAmount / currentTotal * targetTotal / roundUnit) * roundUnit`, distributes rounding remainder to platinum.

## Recommended Sequence
Implement phases 1 → 2 → 3 → 4 → 5 → 6 sequentially. Each phase is independently testable. Phases 3 and 4 can be parallelized since they are independent editor components.

