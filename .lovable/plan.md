

# Extended Brief Subsections — Format-Native Rebuild

## What Changes

The current `ExtendedBriefDisplay` treats all 7 subsections as either plain text or simple arrays with no format-aware rendering, no per-subsection AI review, no nested `CuratorSectionPanel` layout, and no format-specific editors. This rebuild replaces it with a nested panel architecture where each subsection is a proper `CuratorSectionPanel` with its own expand/collapse, status, fullscreen, and AI review — all using the correct format renderers (rich_text, line_items, table).

## Files to Create/Modify

### 1. `src/lib/cogniblend/curationSectionFormats.ts`
Add 7 new entries to `SECTION_FORMAT_CONFIG`:
- `context_and_background`: `rich_text`
- `root_causes`: `line_items`
- `affected_stakeholders`: `table` with columns `[stakeholder_name, role, impact_description, adoption_challenge]`
- `current_deficiencies`: `line_items`
- `extended_brief_expected_outcomes`: `line_items`
- `preferred_approach`: `rich_text`
- `approaches_not_of_interest`: `line_items`, `aiCanDraft: false`

Add a new export: `EXTENDED_BRIEF_SUBSECTION_KEYS` array listing these 7 keys in order.

### 2. `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` — Full Rewrite
Replace current flat `Collapsible` layout with nested `CuratorSectionPanel` architecture:

- Each of the 7 subsections renders as a `CuratorSectionPanel` child with its own status, expand/collapse, fullscreen modal
- **Parent panel header** shows aggregate worst score across all 7 subsections
- Format-native rendering per subsection:
  - `context_and_background` + `preferred_approach` → `RichTextSectionRenderer`
  - `root_causes` + `current_deficiencies` + `extended_brief_expected_outcomes` + `approaches_not_of_interest` → `LineItemsSectionRenderer`
  - `affected_stakeholders` → table with 4 columns (stakeholder_name, role, impact_description, adoption_challenge) using a simple table renderer
- `approaches_not_of_interest` shows persistent placeholder when empty: "Add approaches you want solvers to avoid..."
- `preferred_approach` empty state shows AI-drafted neutral placeholder
- Each subsection has its own "Refine with AI" button
- Parent header "Review with AI" button reviews all 7 subsections

New props needed: `challengeId`, `aiSectionReviews`, `onRefine`, `onAcceptRefinement`, `readOnly`

### 3. `src/pages/cogniblend/CurationReviewPage.tsx`
- Update the `extended_brief` case in the section switch to pass new props to `ExtendedBriefDisplay`
- Add `getSectionContent` handlers for each of the 7 subsection keys (reading from `challenge.extended_brief` JSONB sub-fields)
- Update `handleAcceptRefinement` to handle subsection saves — writing back into the `extended_brief` JSONB object (merge, not replace)
- Update `handleSaveExtendedBrief` to support per-subsection saves

### 4. `supabase/functions/review-challenge-sections/promptTemplate.ts` + `src/lib/aiReviewPromptTemplate.ts`
Add the 7 subsection keys to `SECTION_FORMAT_MAP` with correct format types. Add format-specific AI instructions:
- `root_causes`: "JSON array of short phrase strings only. Max 8 items."
- `affected_stakeholders`: "JSON array of row objects with keys stakeholder_name, role, impact_description (max 100 chars), adoption_challenge (max 100 chars). Always populate adoption_challenge."
- `current_deficiencies`: "JSON array of current-state observation phrases. Max 10 items."
- `approaches_not_of_interest`: "Always set requires_human_input: true. Never produce items."
- `preferred_approach`: "If content exists, do NOT rewrite. Review comments only."

### 5. `supabase/functions/refine-challenge-section/index.ts`
Add the 7 subsection keys to the allowed fields list. For `approaches_not_of_interest`, return `requires_human_input: true` immediately without calling LLM. For `preferred_approach` with existing content, instruct AI to return the content unchanged with review comments only.

## Data Flow

All 7 subsections read from and write to `challenges.extended_brief` JSONB — no new columns needed. The subsection key maps to the JSONB field:
- `context_and_background` → `extended_brief.context_background`
- `root_causes` → `extended_brief.root_causes`
- `affected_stakeholders` → `extended_brief.affected_stakeholders`
- `current_deficiencies` → `extended_brief.current_deficiencies`
- `extended_brief_expected_outcomes` → `extended_brief.expected_outcomes`
- `preferred_approach` → `extended_brief.preferred_approach`
- `approaches_not_of_interest` → `extended_brief.approaches_not_of_interest`

## Nesting Depth

Exactly two levels: Extended Brief parent panel → 7 subsection panels. No deeper nesting.

## What Does NOT Change

- Edge function input/output contract shape
- `challenges.ai_section_reviews` storage
- Admin AI Review Config page
- Any page outside curator role

