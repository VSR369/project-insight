

# Final Plan: Admin-Configurable AI Review Section Library

## Claude's Two Notes — Both Valid, Both Addressed

**Note 1 (Data fetching for new contexts)**: Correct. The existing edge function fetches different data per context. For the 3 new contexts, the data sources are now explicitly defined based on the live schema:

| Context | Data to Fetch | Tables/Fields |
|---------|--------------|---------------|
| **legal** | Challenge core fields (title, ip_model, maturity_level) + all legal docs with LC review status | `challenges` (title, ip_model, maturity_level, eligibility) + `challenge_legal_docs` (document_type, tier, status, lc_status, lc_review_notes, content_summary, rationale) |
| **finance** | Challenge reward/budget fields + escrow record | `challenges` (title, reward_structure, phase_schedule) + `escrow_records` (escrow_status, deposit_amount, currency, remaining_amount, rejection_fee_percentage, fc_notes, bank_name) |
| **evaluation** | Challenge evaluation setup + evaluation records + solutions | `challenges` (title, evaluation_criteria, deliverables, complexity_level) + `evaluation_records` (rubric_scores, commentary, individual_score, conflict_declared, conflict_action) + `solutions` (count only) |

**Note 2 (Seed rows need actual content)**: Correct. All ~36 seed rows will include sensible default values for `section_description`, `review_instructions`, `required_elements`, `dos`, and `donts`. Not nulls. Admins can refine later.

---

## 4 Deliverables

### 1. SQL Migration

**Table A: `ai_review_section_config`**
- Composite PK: `(role_context, section_key)` -- no prefix stripping anywhere
- `role_context` TEXT CHECK IN ('intake','spec','curation','legal','finance','evaluation')
- `section_key` TEXT (matches existing hardcoded keys exactly)
- `section_label`, `importance_level`, `section_description`, `review_instructions`, `dos`, `donts`, `tone`, `min_words`, `max_words`, `required_elements` (TEXT[]), `example_good` VARCHAR(500), `example_poor` VARCHAR(500), `is_active` BOOLEAN DEFAULT true, `updated_at`, `updated_by`

**Table B: `ai_review_global_config`** (singleton, id=1 CHECK id=1)
- `default_model` TEXT DEFAULT 'google/gemini-3-flash-preview'
- `batch_split_threshold` INT DEFAULT 15
- `updated_at`, `updated_by`

**RLS**: SELECT for authenticated. UPDATE/INSERT for supervisor only.

**Seed data**: ~36 rows with real content. Example for one row:

```
('intake', 'problem_statement', 'Problem Statement', 'Critical',
 'The core business problem the seeker wants solved. Must be specific enough for a Challenge Creator to draft a full specification.',
 'Check for: specific pain point identification, affected stakeholder mention, measurable impact, what has already been tried. Flag vague or generic problem descriptions.',
 'Look for concrete metrics. Acknowledge strengths before issues.',
 'Do not suggest solutions. Do not rewrite unless asked.',
 'Balanced', 80, 300,
 ARRAY['specific pain point','affected stakeholder','measurable impact','what has already been tried'],
 'Our supply chain loses $2.3M annually due to manual inventory reconciliation across 12 warehouses. We have tried barcode scanning but accuracy remains below 91%.',
 'We need to improve our processes and be more efficient.',
 true, now(), NULL)
```

All 36 rows follow this pattern with role-appropriate content.

### 2. Edge Function Update (`review-challenge-sections/index.ts`)

**A. Expand `RoleContext` type** to include `'legal' | 'finance' | 'evaluation'`.

**B. Add data fetching per new context** (inside the existing `fetchPromises` pattern):
- `legal`: fetch `challenge_legal_docs` (all columns) + challenge core (title, ip_model, maturity_level, eligibility)
- `finance`: fetch `escrow_records` (all columns) + challenge core (title, reward_structure, phase_schedule)
- `evaluation`: fetch `evaluation_records` (rubric_scores, commentary, individual_score, conflict_declared) + challenge core (title, evaluation_criteria, deliverables, complexity_level)

**C. Load config from DB** at start of each call:
```sql
SELECT * FROM ai_review_section_config WHERE role_context = $1 AND is_active = true
```
Plus load `ai_review_global_config` (single row). If no config rows returned, fall back to existing hardcoded arrays.

**D. Enhanced prompt construction**: When config rows exist, inject `review_instructions`, `required_elements`, `tone`, `importance_level`, `dos`, `donts`, `section_description`, `min_words`, `max_words` into the system prompt per section. The existing `buildSystemPrompt` function is extended with a config-aware branch.

**E. Configurable model**: Read `default_model` from global config instead of hardcoded string.

**F. Batch split**: If active sections > `batch_split_threshold`, split into two sequential calls (intake+spec first, curation+legal+finance+evaluation second). Merge results before persisting.

**G. No contract changes**: Input/output schema stays identical. Existing callers unaffected.

### 3. Admin Configurator Page

**New file**: `src/pages/admin/seeker-config/AIReviewConfigPage.tsx`

- Accordion grouped by `role_context` (6 groups)
- Each row: section label, role context badge, importance badge, active toggle
- Expanded panel: all editable fields. `example_good`/`example_poor` textareas with 500-char limit and visible character counter
- Save per section (PATCH by composite key)
- `updated_at` + `updated_by` display name
- Global settings card at top: model text input, batch threshold number input
- Access: `PermissionGuard permissionKey="supervisor.configure_system"`

### 4. Preview Prompt Modal

- Button per section in expanded panel
- Read-only Dialog showing the assembled prompt with current config values substituted
- Local string assembly only, no API call
- Shared template file: `src/lib/aiReviewPromptTemplate.ts` used by both the preview modal and duplicated at `supabase/functions/review-challenge-sections/promptTemplate.ts` for the edge function, with sync comments in both files

### 5. Route + Sidebar

- `App.tsx`: lazy import + route at `seeker-config/ai-review-config` with `PermissionGuard`
- `AdminSidebar.tsx`: add entry `{ title: 'AI Review Config', icon: Bot, path: '/admin/seeker-config/ai-review-config' }` to `seekerConfigItems`

## Files Changed

| Type | File | Change |
|------|------|--------|
| SQL migration | 1 file | 2 tables + ~36 seeded rows + RLS |
| Edge function | `supabase/functions/review-challenge-sections/index.ts` | DB config loading, 3 new contexts with data fetching, enhanced prompts, configurable model, batch split |
| Edge function util | `supabase/functions/review-challenge-sections/promptTemplate.ts` | Shared prompt template (edge copy) |
| Shared util | `src/lib/aiReviewPromptTemplate.ts` | Shared prompt template (frontend copy) |
| New page | `src/pages/admin/seeker-config/AIReviewConfigPage.tsx` | Configurator + preview modal |
| Route | `src/App.tsx` | Lazy import + route |
| Sidebar | `src/components/admin/AdminSidebar.tsx` | Nav entry |

## What Does NOT Change

AIReviewInline, refine-challenge-section, check-challenge-quality, ConversationalIntakePage, AISpecReviewPage, CurationReviewPage, challenges.ai_section_reviews JSONB persistence, all existing review orchestration.

