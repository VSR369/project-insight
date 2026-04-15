

# AI Diagnostic Dashboard — Testing & Status Page

## What This Builds

A new route `/cogni/curation/:challengeId/diagnostics` accessible via a link in the curation sidebar. It provides a read-only, comprehensive test results view covering three pipelines: AI Review, Generate Suggestions, and Context Discovery.

## Consultant Level Mapping

The `importance_level` from `ai_review_section_config` maps to review depth:

| importance_level | Review Level | Suggestion Level |
|---|---|---|
| Critical | Principal Consultant | Principal Consultant |
| High | Senior Consultant | Senior Consultant |
| Medium | Consultant | Consultant |
| Low | Junior | Junior |

This mapping is purely display — it reflects the configured review rigor for each section.

## Page Layout: Three Collapsible Panels

### Panel 1: AI Review (Pass 1) — Wave-by-Wave

For each wave (1–6), show a table:

| Section | Status | Action | Comments | Review Level |
|---|---|---|---|---|
| Problem Statement | ✅ Success | Reviewed | 💬 3 | Principal Consultant |
| Scope | ✅ Success | Drafted | 💬 2 | Senior Consultant |
| Organization Context | ⏭ Skipped | — | — | Senior Consultant |

Summary row per wave: total reviewed / drafted / skipped / errors.

### Panel 2: Generate Suggestions (Pass 2) — Wave-by-Wave

Same wave structure, different labels:

| Section | Status | Action | Suggestions | Suggestion Level |
|---|---|---|---|---|
| Problem Statement | ✅ Success | Suggestions Generated | ✨ 3 | Principal Consultant |
| Deliverables | ✅ Success | Content Drafted | ✨ 2 | Principal Consultant |
| Eligibility | ❌ Error | — | — | Consultant |

### Panel 3: Context Discovery Pipeline

A step-by-step status checklist queried from DB:

```text
Step 1: Web Search .................. ✅ Success / ❌ Failed
  → Accepted Links: 4
  → Accepted Documents: 2
  → Excluded Links: 1
  → Excluded Documents: 0

Step 2: Extraction Summary
  → Summary Generated: ✅ Yes (for N sources)
  → Full Text Extracted: ✅ Yes (N sources) / ⚠️ Partial (M of N)
  → Key Data Extracted: ✅ Yes / ❌ No

Step 3: Consolidation
  → All accepted source text consolidated: ✅ Yes / ❌ No

Step 4: Context Digest
  → Generated: ✅ Success / ❌ Failed / ⚠️ Partial
  → Source Count: N
  → Curator Edited: Yes/No
  → Confirmed & Ready for Generate: ✅ / ❌
```

Data sources:
- `challenge_attachments` — query by `discovery_status` (accepted/rejected/suggested) and `source_type` (url/file) for counts
- `extraction_status`, `extraction_quality`, `extracted_summary`, `extracted_key_data` for extraction steps
- `challenge_context_digest` — for digest status, `curator_edited`, `source_count`

## Data Sources

- **Curation store (Zustand)**: `aiComments`, `aiSuggestion`, `reviewStatus`, `aiAction` per section
- **Wave progress state**: Already tracked in `WaveProgress` for both Pass 1 and Pass 2
- **DB config**: `importance_level` from `ai_review_section_config` (fetched via existing `usePromptConfig`)
- **DB context sources**: `challenge_attachments` filtered by `challenge_id`
- **DB digest**: `challenge_context_digest` by `challenge_id`

## Files to Create/Change

| File | Action |
|---|---|
| `src/pages/cogniblend/CurationDiagnosticsPage.tsx` | **Create** — Main diagnostic page (~200 lines, composition only) |
| `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | **Create** — Pass 1 wave table with comment counts and review levels |
| `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | **Create** — Pass 2 wave table with suggestion counts and levels |
| `src/components/cogniblend/diagnostics/DiagnosticsDiscoveryPanel.tsx` | **Create** — Context discovery pipeline status from DB queries |
| `src/hooks/cogniblend/useDiagnosticsData.ts` | **Create** — Combined hook fetching attachments, digest, config importance levels |
| `src/routes/cogniRoutes.tsx` | **Edit** — Add lazy route for diagnostics page |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | **Edit** — Add "Diagnostics" link button to sidebar |
| `src/lib/cogniblend/waveConfig.ts` | **Edit** — Export `IMPORTANCE_TO_LEVEL` mapping constant |

## No Database Changes

All data already exists. This is a read-only diagnostic view.

