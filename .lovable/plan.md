
### Fix Plan — Phase Schedule Edit + Format-Preserving AI Refinement

#### What is actually wrong (confirmed in code)
1. **No Edit button for Phase Schedule**  
   In `CurationReviewPage.tsx`, `case "phase_schedule"` renders `ScheduleTableSectionRenderer`, but unlike other sections it never shows the outer **Edit** button that sets `editingSection`.  
   Result: edit mode is never entered.

2. **Phase Schedule format is inconsistent in code paths**  
   - Canonical renderer is 4-column (`phase_name`, `duration_days`, `start_date`, `end_date`) in `ScheduleTableSectionRenderer.tsx`.  
   - But legacy `SECTIONS` definition for `phase_schedule` still contains old 3-column render logic.  
   This is architectural drift from the format-native model.

3. **AI accept flow breaks structured formats (major flaw)**  
   In `AIReviewInline.tsx`, all structured sections (`line_items`, `table`, `schedule_table`) are parsed into `string[]`, then accepted as either `{criteria:[...]}` or `{items:[...]}`.  
   This **loses row structure** for tables/schedules and can save wrong shapes.

4. **Refinement prompt for `phase_schedule` is outdated**  
   In `supabase/functions/refine-challenge-section/index.ts`, phase schedule instruction still asks for `milestone/dependencies` and omits `duration_days`.  
   Also found a bug: `userPrompt` is appended before it is declared in solver_expertise branch.

---

### Implementation changes

#### 1) Restore Edit for Phase Schedule (UI)
- **File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Add the same `canEdit && !isEditing` **Edit** button pattern for `case "phase_schedule"`.
- Keep save target as `phase_schedule` JSONB array.
- Update section label copy to match your wording:  
  **Deliverable/Milestone | Duration (days) | Start Date | Target Completion Date** (maps to `end_date` internally).

#### 2) Enforce format-native AI suggestion parsing/acceptance
- **Files:**  
  - `src/components/cogniblend/shared/AIReviewInline.tsx`  
  - `src/components/cogniblend/curation/AIReviewResultPanel.tsx`
- Replace current single `parseStructuredItems` behavior with format-aware parsing using `SECTION_FORMAT_CONFIG`:
  - `line_items` → `string[]`
  - `table` → `object[]` (preserve full row objects)
  - `schedule_table` → `PhaseRow[]` (preserve full row objects)
- Update accept logic so saved payload matches section format exactly:
  - line items → JSON array of strings
  - table/schedule → JSON array of objects (not `{items:[...]}`)
- Render AI suggested schedule in actual tabular view (not list text), with selectable rows before accept.

#### 3) Make save handlers schema-safe
- **File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- In `handleAcceptRefinement`, add explicit structured handling for:
  - `phase_schedule` (validate/normalize row object array)
  - `evaluation_criteria` (preserve name/weight fields)
  - `reward_structure` (preserve row objects)
- Keep existing master-data validation behavior.
- Add a guard: if AI returns prose for a structured section, reject with clear error toast.

#### 4) Align edge prompts to canonical phase schedule schema
- **Files:**  
  - `supabase/functions/refine-challenge-section/index.ts`  
  - `supabase/functions/review-challenge-sections/promptTemplate.ts`  
  - `src/lib/aiReviewPromptTemplate.ts` (sync copy)
- Update phase schedule instruction to canonical schema:
  `[{ phase_name, duration_days, start_date, end_date }]`
- Remove old `milestone/dependencies` requirement from refinement instruction.
- Fix `userPrompt` declaration order bug in `refine-challenge-section`.

#### 5) Clean architecture drift for phase_schedule section definition
- **File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Remove/replace old legacy 3-column render logic from `SECTIONS` metadata for `phase_schedule` so there is one canonical format path (renderer-driven).

---

### Deviations from intended architecture (highlighted)
- **Format config says `schedule_table`, but AI accept pipeline currently flattens schedule/table into line-item strings.**
- **Phase schedule has canonical renderer, but legacy old-format render remains in section metadata.**
- **Refine edge function phase schedule schema is not aligned with current UI schema.**
- **Solver expertise refinement branch currently has a prompt-construction bug (`userPrompt` used before declaration).**

---

### Outcome after fix
- Phase Schedule shows Edit and is fully editable in table form.
- AI refinement for Phase Schedule stays in exact table schema; accepted output saves directly into same schema.
- Structured sections (not only phase schedule) stop being corrupted by string-flattening.
- Prompt contracts are synchronized across edge + frontend preview templates.
- Existing batch AI review behavior remains intact (already split by `MAX_BATCH_SIZE = 12`).
