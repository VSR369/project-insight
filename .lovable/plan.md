

# Phase 7: Challenge Completeness + New Sections + Polish

## Overview

Three features: (1) a completeness checklist sidebar card, (2) two new optional curation sections, and (3) wiring to ensure everything integrates with existing waves, dependencies, and staleness tracking. Feature 3 (end-to-end test scenario) is a manual verification guide, not code.

---

## Feature 1: Challenge Completeness Checklist

### Step 1: Database — Create `completeness_checks` table

Migration to create a reference table storing the 10 checklist items:

```sql
CREATE TABLE completeness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept TEXT NOT NULL,
  question TEXT NOT NULL,
  check_sections JSONB NOT NULL DEFAULT '[]',
  criticality TEXT NOT NULL CHECK (criticality IN ('error','warning','conditional')),
  condition_field TEXT,
  condition_value TEXT,
  remediation_hint TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE completeness_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active checks" ON completeness_checks FOR SELECT TO authenticated USING (is_active = TRUE);
```

Then seed the 10 default checks via the insert tool.

### Step 2: Completeness engine — `src/lib/cogniblend/completenessCheck.ts`

Pure function that takes all section contents + challenge metadata + check definitions and returns `CompletenessResult` with score, passed count, and failures with remediation hints. Uses the simple heuristic (content length > 50 chars across relevant sections).

### Step 3: React Query hook — `src/hooks/queries/useCompletenessChecks.ts`

- `useCompletenessCheckDefs()` — fetches active checks from DB
- `useRunCompletenessCheck(challengeId)` — combines section data from curation store with check defs, runs engine, returns results

### Step 4: Sidebar widget — `src/components/cogniblend/curation/CompletenessChecklistCard.tsx`

Card component placed in the right rail of `CurationReviewPage.tsx`, between "AI Quality" card and "Review Sections by AI" button (around line 3138). Shows:
- Progress bar with X/N score
- Pass items with green checkmarks
- Failed items with warning/error icons + remediation hint on hover
- Click on failed item navigates to the first relevant section (sets `activeGroup`)
- "Run completeness check" button for on-demand analysis

### Step 5: Auto-trigger after Global AI Review

In `CurationReviewPage.tsx`, after wave execution completes (when `phase2Status === 'completed'`), auto-run the completeness check.

---

## Feature 2: Two New Recommended Sections

### Step 6: Database — Add columns to `challenges` table

Migration to add two JSONB columns:
```sql
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS data_resources_provided JSONB,
  ADD COLUMN IF NOT EXISTS success_metrics_kpis JSONB;
```

### Step 7: Register sections in config files

**`curationSectionFormats.ts`** — Add `data_resources_provided` (format: `table`, columns: resource/type/format/size/access_method/restrictions) and `success_metrics_kpis` (format: `table`, columns: kpi/baseline/target/measurement_method/timeframe).

**`sectionDependencies.ts`** — Add dependency entries:
- `data_resources_provided` depends on `scope` and `deliverables`; downstream: `submission_guidelines`
- `success_metrics_kpis` depends on `expected_outcomes`; downstream: `evaluation_criteria`

**`waveConfig.ts`** — Add `data_resources_provided` to Wave 3 (Complexity), `success_metrics_kpis` to Wave 1 (Foundation).

### Step 8: Register in CurationReviewPage

- Add to `SECTIONS` array with `SectionDef` (key, label, attribution, dbField, isFilled, render)
- Add `data_resources_provided` to GROUPS `scope_complexity` (position 2, after deliverables)
- Add `success_metrics_kpis` to GROUPS `problem_definition` (position 5, after expected_outcomes)
- Add to `SECTION_DB_FIELD_MAP` in `useCurationStoreSync.ts`

### Step 9: Seed AI prompt configs

Use insert tool to UPDATE `ai_review_section_config` with prompt configs for the 2 new sections (quality criteria, cross-references, content templates as specified in the Phase 7 doc).

---

## Technical Details

### Files to create
- `src/lib/cogniblend/completenessCheck.ts` — Engine
- `src/hooks/queries/useCompletenessChecks.ts` — Hook
- `src/components/cogniblend/curation/CompletenessChecklistCard.tsx` — UI card

### Files to modify
- `src/pages/cogniblend/CurationReviewPage.tsx` — Add completeness card to right rail, add 2 new section defs, update GROUPS
- `src/lib/cogniblend/curationSectionFormats.ts` — Add 2 section format configs
- `src/lib/cogniblend/sectionDependencies.ts` — Add dependency entries + display names
- `src/lib/cogniblend/waveConfig.ts` — Add sections to waves
- `src/hooks/useCurationStoreSync.ts` — Add 2 entries to SECTION_DB_FIELD_MAP
- `src/types/sections.ts` — Types auto-derive from SECTION_FORMAT_CONFIG (no change needed)

### Execution order
1. Migration: `completeness_checks` table + RLS
2. Seed 10 default checks
3. Migration: Add 2 columns to `challenges`
4. Create completeness engine + hook + card
5. Update config files (formats, dependencies, waves)
6. Add sections + card to CurationReviewPage
7. Seed AI prompt configs for new sections

