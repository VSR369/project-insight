

# Structured Deliverables Card Renderer

## Problem

Deliverables data in the DB contains rich objects (name, description, acceptance_criteria) but:
1. **`getDeliverableItems()`** flattens everything to `item?.name ?? ""` — losing description and acceptance criteria
2. **`LineItemsSectionRenderer`** renders flat strings as plain text blocks
3. **`DeliverablesEditor`** only edits flat strings
4. The AI generates structured deliverable objects but they get flattened on save/display

The result: structured content trapped in a plain-text renderer (image 2), when it should look like the professional card layout (image 1).

## Plan

### 1. Create `DeliverableCardRenderer` component

**New file**: `src/components/cogniblend/curation/renderers/DeliverableCardRenderer.tsx`

A card-based view renderer for structured deliverables matching the design in image 1:
- Each deliverable gets a card with a colored `D1`, `D2`, `D3` badge
- Bold title (name)
- Description paragraph
- Green-bordered "Acceptance Criteria" callout block with checkmark icon

Handles both structured objects (`{name, description, acceptance_criteria}`) and plain strings (fallback to current numbered list).

### 2. Create `DeliverableCardEditor` component

**New file**: `src/components/cogniblend/curation/renderers/DeliverableCardEditor.tsx`

Structured editor matching the card layout — each deliverable has inputs for:
- Name (text input)
- Description (textarea)
- Acceptance Criteria (textarea)
- Delete button, Add button

Used for both manual editing and "Edit & Accept" AI suggestion flow.

### 3. Update `LineItemsSectionRenderer` to use card renderer

Replace the flat text rendering with `DeliverableCardRenderer` for view mode and `DeliverableCardEditor` for edit mode, when items are structured objects.

### 4. Update data pipeline to preserve structure

- **`getDeliverableItems()`** → new `getDeliverableObjects()` returning full objects, not flattened strings
- **`handleSaveDeliverables()`** → accept structured objects, save as `{items: [{name, description, acceptance_criteria}, ...]}` 
- **`handleAcceptRefinement()`** for deliverables → already parses JSON; just needs the downstream renderer to handle objects

### 5. Update section config render function

The `render` function in the `SECTIONS` config (line 262) should use the new card renderer instead of inline flat text.

## Files

| File | Action |
|------|--------|
| `src/components/cogniblend/curation/renderers/DeliverableCardRenderer.tsx` | Create — card-based view with badges, descriptions, acceptance criteria |
| `src/components/cogniblend/curation/renderers/DeliverableCardEditor.tsx` | Create — structured editor with name/description/criteria fields |
| `src/components/cogniblend/curation/renderers/LineItemsSectionRenderer.tsx` | Update — detect structured objects, delegate to card renderer/editor |
| `src/components/cogniblend/curation/renderers/index.ts` | Export new components |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Update `getDeliverableItems`, `handleSaveDeliverables`, section render, to work with structured objects |

