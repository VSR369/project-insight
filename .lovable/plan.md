

# Enhanced Wave Progress Panel + Pre-Flight Field Analysis

## Finding: All 33 Sections Already Have Rich Configs

The database confirms ALL 33 sections in `ai_review_section_config` have:
- `review_instructions` (147–1450 chars each)
- `dos` and `donts` (43–290 chars each)
- `min_words` and `max_words` ranges
- `importance_level` and `tone`

The "14 missing sections" issue from the expert assessment is **already resolved**. No config migration needed.

## What Needs Fixing: WaveProgressPanel Per-Section Status

Currently the panel shows only aggregate counts per wave ("4 reviewed, 1 drafted"). You need per-section detail for testing. The data already exists in `WaveResult.sections` — it just needs rendering.

### Change 1: Add Section-Level Detail to WaveProgressPanel

Expand each completed wave to show individual sections with:
- Section name (human-readable label from a mapping)
- Action taken: Reviewed / Drafted / Skipped
- Comment count (read from curation store's `aiComments` array length)
- Status icon (success/error/skipped)

**File:** `src/components/cogniblend/curation/WaveProgressPanel.tsx`

Add a collapsible section list under each wave. For each section:
```text
✅ Problem Statement — Reviewed · 3 comments
✅ Scope — Drafted · 2 comments  
⏭ Organization Context — Skipped
❌ Deliverables — Error
```

This requires:
- A `SECTION_LABELS` map (section_key → human label) — add to `waveConfig.ts`
- Access to the curation store to read `aiComments.length` per section
- The WaveProgressPanel needs `challengeId` prop to read store state

### Change 2: Add SECTION_LABELS Map

**File:** `src/lib/cogniblend/waveConfig.ts`

Add a constant mapping all 33 section keys to human-readable labels for display in progress panels and debugging.

### Change 3: Accept `challengeId` Prop in WaveProgressPanel

**File:** `src/components/cogniblend/curation/WaveProgressPanel.tsx`

Add optional `challengeId` prop. When provided, read comment counts from the curation store for each completed section.

## Pre-Flight Fields: Impact Analysis

The pre-flight dialog checks these fields before AI review:

### Mandatory (3 fields — blocks AI if missing)
| Field | Why Mandatory | Impact if Missing |
|-------|--------------|-------------------|
| `problem_statement` (min 50 chars) | Core business problem. AI cannot infer this. | AI has no foundation — all sections get generic output |
| `maturity_level` (min 2 chars) | Blueprint/POC/Pilot determines scale of all content | Timeline, budget, complexity all miscalibrated |
| `domain_tags` (min 3 chars) | Industry context for frameworks and benchmarks | No industry/geo pack grounding, generic expertise |

### Recommended (3 fields — warns but allows proceeding)
| Field | Why Recommended | Impact if Missing |
|-------|----------------|-------------------|
| `scope` (min 30 chars) | Bounds AI output. AI-generated if empty | Deliverables, evaluation criteria less focused |
| `expected_outcomes` (min 30 chars) | Guides KPI and evaluation generation | Success metrics and evaluation less specific |
| `context_and_background` (min 30 chars) | Industry context for specificity | AI uses org profile as fallback — less precise |

### Additional Checks (non-blocking)
- **Budget alignment**: If reward_structure budget exists, validates against maturity ranges
- **Domain coverage**: Warns if domains are too thin or too broad (3-5 optimal)
- **Org context score**: Warns if org profile is under 50% complete

### Quality Prediction Tiers
| Sections Filled | Quality | Manual Edits Needed |
|----------------|---------|-------------------|
| All 6 (mandatory + recommended) | 95% | 2–3 sections |
| Mandatory + outcomes only | 85% | 5–7 sections |
| Mandatory + scope only | 80% | 5–7 sections |
| Mandatory only | 65% | 10–15 sections |

### Dependency Chain
```text
problem_statement → scope → deliverables → complexity → phase_schedule
                 → expected_outcomes → success_metrics_kpis → evaluation_criteria
domain_tags → industry/geo packs → context_and_background enrichment
maturity_level → budget validation → reward_structure → escrow_funding
```

When upstream fields are empty, the AI drafts them first (Wave 1), then downstream waves use those AI-drafted values. Quality cascades — weak foundations produce weaker downstream output, even though every section still gets reviewed.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/cogniblend/waveConfig.ts` | Add `SECTION_LABELS` map (33 entries) |
| `src/components/cogniblend/curation/WaveProgressPanel.tsx` | Add per-section status rows with action, comment count, collapsible detail |

## No Database Changes Needed

All 33 config rows exist with rich instructions. No migration required.

