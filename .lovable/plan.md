

# Fix Deliverables: Add String Parser + Align Card Design

## Problem

The `DeliverableCardRenderer` and `DeliverableCardEditor` components already exist, but deliverables stored as flat strings (e.g. `"D1: Functional ML Model: A fully trained machine learning model... Acceptance criteria: Inference latency under 200ms..."`) are never parsed into structured fields. The `getDeliverableObjects` function just maps them to `{ name: entireString, description: "", acceptance_criteria: "" }`, so the cards show a wall of text in the title with empty description/criteria.

Additionally, the card design needs to match the reference spec (rounded-xl containers, bg-gray-50 header band, blue-50 pill badge, green-50 acceptance criteria block with dashed placeholder when empty).

## Plan

### 1. Create `parseDeliverableItem.ts` utility

**New file**: `src/utils/parseDeliverableItem.ts`

- `parseDeliverableItem(raw: string)` — regex parser for `"D{N}: Title: Description. Acceptance criteria: Criteria"` pattern
- `parseDeliverableFromJSON(raw: string)` — handles pre-structured JSON objects (string or object)
- `parseDeliverables(items: any[])` — orchestrator: tries JSON parse first, then regex, then fallback to `{ name: raw }`

Handles all data shapes: structured DB objects, flat strings with `D1:` prefix, and plain strings without any pattern.

### 2. Update `getDeliverableObjects` in CurationReviewPage

Replace the current mapping logic to use `parseDeliverables()` so flat strings are decomposed into structured fields before reaching the card renderer.

### 3. Align card design to reference spec

Update `DeliverableCardRenderer.tsx` and `DeliverableCardEditor.tsx`:
- Outer: `border border-gray-100 rounded-xl overflow-hidden`
- Header band: `bg-gray-50 border-b border-gray-100 px-4 py-2.5` with ID badge (blue-50/blue-700 rounded-full) + title
- Description: `text-[12px] text-gray-500 leading-relaxed`
- Acceptance criteria: `bg-green-50 border border-green-100 rounded-lg` with CheckCircle icon + uppercase label
- Empty criteria: dashed placeholder `"No acceptance criteria defined"`
- Footer: item count summary

### 4. Apply same card renderer to Expected Outcomes

The `expected_outcomes` case block (line 2216) also renders flat numbered lists. Wire it through the same `parseDeliverables` + `DeliverableCardRenderer` pattern (badges show `O1`, `O2` instead of `D1`, `D2`). Add a `badgePrefix` prop to the renderer.

### 5. Update section config `render` functions

The `render` callbacks in SECTIONS config (lines 262-276 for deliverables, 319-333 for expected_outcomes) also render flat numbered lists. Update them to use `DeliverableCardRenderer` with parsed items so the collapsed/summary view also shows cards.

## Technical details

### Files

| File | Action |
|------|--------|
| `src/utils/parseDeliverableItem.ts` | Create — parser utility |
| `src/components/cogniblend/curation/renderers/DeliverableCardRenderer.tsx` | Update — align design, add `badgePrefix` prop, add empty-criteria placeholder, add footer count |
| `src/components/cogniblend/curation/renderers/DeliverableCardEditor.tsx` | Update — align design to match renderer |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Update — use `parseDeliverables` in `getDeliverableObjects`, wire expected_outcomes through card renderer, update SECTIONS config `render` functions |

### Parser logic (core)

```text
Input:  "D1: Functional ML Model: A fully trained machine learning model that... Acceptance criteria: Inference latency under 200ms..."

Step 1: Extract ID → "D1"
Step 2: Split on "Acceptance criteria:" → before / after
Step 3: Split before on first ":" → title / description

Output: { id: "D1", name: "Functional ML Model", description: "A fully trained...", acceptance_criteria: "Inference latency..." }
```

Falls back gracefully: no `D1:` prefix → entire string becomes name. No `Acceptance criteria:` → description only. Already a JSON object → use directly.

