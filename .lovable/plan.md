

# Curator Screen Rebuild — Phased Implementation Plan

## Current State

The CurationReviewPage is a monolithic 1925-line file with section definitions, renderers, editors, queries, mutations, checklist logic, and layout all in one place. The AI review system (`AIReviewInline`) treats all sections as text, writing prose into structured fields. There is no expand-to-fullscreen, no format-native rendering of AI suggestions, no Send for Modification workflow, and no master-data-driven checkbox sections.

---

## Phase Breakdown

### Phase 1 — Foundation: Section Format Config + CuratorSectionPanel Shell

**Goal**: Define the `SECTION_FORMAT_CONFIG` constant and build the `CuratorSectionPanel` wrapper component with expand/collapse + fullscreen modal. Replace the current Accordion-based layout with the new panel shell. No renderer changes yet — existing render functions are temporarily wrapped inside the new shell.

**Files created/modified**:
- `src/lib/cogniblend/curationSectionFormats.ts` — `SECTION_FORMAT_CONFIG` constant with all 16 sections, format types, flags (`aiCanDraft`, `aiReviewEnabled`, `curatorCanEdit`), column definitions, and `aiUsesContext` arrays
- `src/components/cogniblend/curation/CuratorSectionPanel.tsx` — Panel shell with:
  - Collapsible header row (chevron toggle, section label, status badge, fullscreen button, AI review button slot, approve/modify buttons for locked sections)
  - Inline expand/collapse with localStorage persistence per challenge ID
  - Fullscreen dialog overlay rendering the same children at viewport size
  - Auto-expand for sections with warnings/blocks on load
- `src/pages/cogniblend/CurationReviewPage.tsx` — Replace `<Accordion>` section loop with `<CuratorSectionPanel>` mapping. Remove existing expand/collapse logic. Existing `section.render()` calls remain temporarily as panel children.

**What does NOT change**: Edge functions, AIReviewInline, data queries, mutations, checklist logic.

---

### Phase 2 — Format-Native Renderers (A through H)

**Goal**: Build one renderer component per format type. Each receives `data`, `onSave`, `readOnly`, and renders the correct UI. Replace existing inline render functions and editor branches in CurationReviewPage with renderer calls driven by `SECTION_FORMAT_CONFIG`.

**Files created**:
- `src/components/cogniblend/curation/renderers/RichTextSectionRenderer.tsx` — Tiptap editor (view/edit), used for `problem_statement`, `scope`
- `src/components/cogniblend/curation/renderers/LineItemsSectionRenderer.tsx` — Vertical item list with add/delete/reorder, used for `deliverables`, `expected_outcomes`, `submission_guidelines`
- `src/components/cogniblend/curation/renderers/TableSectionRenderer.tsx` — Editable table with column config, weight total footer for eval criteria, used for `evaluation_criteria`, `reward_structure`, `legal_docs`
- `src/components/cogniblend/curation/renderers/ScheduleTableSectionRenderer.tsx` — Table with date pickers, auto-duration, milestone checkbox, used for `phase_schedule`
- `src/components/cogniblend/curation/renderers/CheckboxMultiSectionRenderer.tsx` — Master-data-driven checkbox list, used for `eligibility`, `visibility`
- `src/components/cogniblend/curation/renderers/CheckboxSingleSectionRenderer.tsx` — Radio-style single select from master data, used for `complexity`, `ip_model`, `maturity_level`
- `src/components/cogniblend/curation/renderers/DateSectionRenderer.tsx` — Date picker, used for `submission_deadline`
- `src/components/cogniblend/curation/renderers/StructuredFieldsSectionRenderer.tsx` — Read-only structured display, used for `escrow_funding`

**Files modified**:
- `src/pages/cogniblend/CurationReviewPage.tsx` — Remove all inline render/editor branches (the large if/else chain from lines 1574-1746). Replace with a single `<SectionRenderer format={config.format} ... />` dispatcher. Delete `CurationSectionEditor.tsx` imports. Significant line count reduction (~400 lines removed).

**Files deleted** (absorbed into renderers):
- `src/components/cogniblend/curation/CurationSectionEditor.tsx` — Functionality moved into individual renderers

---

### Phase 3 — AI Review Result Panel + Format-Aware AI Prompts

**Goal**: Rebuild the AI review result display so it uses format-native renderers for the "AI Suggested Version" and supports structured comment display with severity badges and blockquote `applies_to`.

**Files created/modified**:
- `src/components/cogniblend/curation/AIReviewResultPanel.tsx` — New component replacing the current inline refinement display in `AIReviewInline`. Shows:
  - Summary in rich text
  - Comments with `[STRENGTH]` / `[WARNING]` / `[REQUIRED]` badges
  - `applies_to` as styled blockquote
  - AI suggested version rendered through the correct format renderer in readOnly mode
  - Accept / Reject buttons
  - Collapsible (badge + summary when collapsed)
- `src/components/cogniblend/shared/AIReviewInline.tsx` — Refactored to delegate result rendering to `AIReviewResultPanel`. Comment selection and refinement trigger remain here. Format-aware accept flow: structured merge for tables/line items, full replace for rich text, ID-based for checkboxes.
- `supabase/functions/review-challenge-sections/index.ts` — Add format instruction block per section (from Step 7 of the prompt). Section prompts include format type, column definitions, and master data option IDs for checkbox sections.
- `supabase/functions/refine-challenge-section/index.ts` — Add format-specific output instructions so AI returns JSON for tables/line items, option IDs for checkboxes, dates for date sections.

---

### Phase 4 — Legal/Escrow Special Treatment + Send for Modification

**Goal**: Implement the special read-only behavior for `legal_docs` and `escrow_funding` with the "Approve" and "Send for Modification" workflow.

**Files created/modified**:
- `src/components/cogniblend/curation/SendForModificationModal.tsx` — Modal with auto-filled "To" field (LC for legal, FC for escrow), rich text comment editor, priority selector, Send action that creates a notification record
- `src/pages/cogniblend/CurationReviewPage.tsx` — Wire Approve and Send for Modification buttons into `CuratorSectionPanel` header for locked sections. Add status badges (View Only, Curator Approved, Pending Modification, Response Received).
- SQL migration — Add `section_approvals` or extend `cogni_notifications` table for tracking curator approval status and modification request threads per section per challenge.

---

### Phase 5 — Master Data Context + Creator-to-Curator Data Streaming

**Goal**: Load master data for checkbox sections and implement the data transformation layer for creator content arriving in free-text format.

**Files created/modified**:
- `src/contexts/MasterDataContext.tsx` — Context provider that batch-fetches `solver_profiles`, `visibility_options`, `complexity_levels`, `ip_models`, `maturity_levels` (some may need new DB tables/seed data)
- `src/lib/cogniblend/creatorDataTransformer.ts` — Parser utilities that attempt to extract structured items from creator free-text (rich text to line items, text to table rows). Shows fallback banner when parsing fails with raw content in collapsed panel.
- SQL migration — Create any missing master data lookup tables (`visibility_options`, `ip_models`) if they do not already exist, with seed data.

---

## Implementation Order and Dependencies

```text
Phase 1 ──► Phase 2 ──► Phase 3
                 │            │
                 └──► Phase 4 (can start after Phase 2)
                 │
                 └──► Phase 5 (can start after Phase 2)
```

Phase 1 is the prerequisite for everything — it establishes the panel shell. Phases 4 and 5 are independent of Phase 3 and can proceed in parallel after Phase 2.

## What Does NOT Change (across all phases)

- Edge function input/output contract shape (sections array, status/comments structure)
- `challenges.ai_section_reviews` storage format
- Admin AI Review Config page
- `refine-challenge-section` and `check-challenge-quality` edge function core logic (only prompt additions)
- Any page outside the curator role

## Estimated Scope

| Phase | New Files | Modified Files | Complexity |
|-------|-----------|---------------|------------|
| 1     | 2         | 1             | Medium     |
| 2     | 8         | 1             | High       |
| 3     | 1         | 3             | High       |
| 4     | 1         | 1 + migration | Medium     |
| 5     | 2         | 0 + migration | Medium     |

---

## Recommendation

Start with **Phase 1** only. It is self-contained, testable, and does not break any existing functionality — it wraps the current content in the new panel shell. Once verified, proceed to Phase 2 to replace the rendering layer.

