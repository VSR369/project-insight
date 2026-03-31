

# Plan: Dual-Version Challenge View (Creator Version + Curator Version)

## Problem

The Creator's original input (problem_statement, scope, extended_brief, etc.) is written directly to the `challenges` table. When the Curator refines the challenge, they **overwrite the same columns**. There is no separate snapshot of the Creator's original submission. This means the Creator currently sees the Curator's refined content when viewing their challenge — which appears as "junk" because the Curator adds structured HTML, technical sections, and formatted content the Creator never wrote.

## Solution Overview

**Two changes required:**

1. **Database**: Add a `creator_snapshot` JSONB column to `challenges` that captures the Creator's original submission at the moment they submit (Phase 1 → Phase 2 transition). This is a one-time snapshot — immutable after creation.

2. **UI**: Replace the current 4-tab Creator view in `PublicChallengeDetailPage` with a **2-tab layout**: "My Version" (from `creator_snapshot`) and "Curator Version" (from current challenge columns). Both tabs show a single vertically scrollable page of all relevant sections with a search/filter bar to jump to section headings.

## Detailed Plan

### Step 1: Database Migration — Add `creator_snapshot` Column

Add a JSONB column to `challenges`:

```sql
ALTER TABLE public.challenges 
  ADD COLUMN IF NOT EXISTS creator_snapshot JSONB;
```

This stores the Creator's original input fields as a frozen snapshot:
```json
{
  "problem_statement": "...",
  "scope": "...",
  "expected_outcomes": {...},
  "reward_structure": {...},
  "phase_schedule": {...},
  "extended_brief": {...},
  "maturity_level": "...",
  "ip_model": "...",
  "eligibility": "...",
  "domain_tags": [...]
}
```

### Step 2: Populate `creator_snapshot` on Challenge Submission

In `useSubmitSolutionRequest.ts`, after the challenge fields are written but **before** `complete_phase` is called, save a snapshot:

```typescript
// After the update call succeeds, snapshot the Creator's original input
await supabase.from('challenges').update({
  creator_snapshot: {
    problem_statement: payload.businessProblem,
    scope: payload.constraints || null,
    expected_outcomes: payload.expectedOutcomes,
    reward_structure: rewardStructure,
    phase_schedule: phaseSchedule,
    extended_brief: { ...extendedBriefObj },
    maturity_level: payload.maturityLevel || null,
    ip_model: payload.ipModel || null,
    domain_tags: payload.domainTags,
    budget_min: payload.budgetMin,
    budget_max: payload.budgetMax,
    currency: payload.currency,
    expected_timeline: payload.expectedTimeline,
    beneficiaries_mapping: payload.beneficiariesMapping || null,
  }
}).eq('id', challengeId);
```

### Step 3: Fetch `creator_snapshot` in `usePublicChallenge`

Add `creator_snapshot` to the select query so the detail page can access it.

### Step 4: New Component — `CreatorChallengeDetailView`

Replace the existing Creator section in `PublicChallengeDetailPage` with a dedicated component that has:

**Two top-level tabs:**
- **My Version** — Reads from `creator_snapshot` JSONB
- **Curator Version** — Reads from current challenge columns (what the Curator wrote)

**Each tab renders a single vertically scrollable page** with all sections displayed as cards:

**My Version sections** (from `creator_snapshot`):
- Problem Statement, Scope/Constraints, Expected Outcomes
- Context & Background, Root Causes, Affected Stakeholders, Current Deficiencies
- Preferred Approach, Approaches Not of Interest
- Budget Range, Expected Timeline
- Maturity Level, IP Model, Domain Tags

**Curator Version sections** (from live challenge columns — all 26 curation sections):
- Problem Statement, Scope, Expected Outcomes, Context & Background
- Root Causes, Affected Stakeholders, Current Deficiencies, Preferred/Not Preferred Approach
- Solution Type, Deliverables, Maturity Level, Data Resources, Success Metrics/KPIs
- Complexity, Solver Expertise, Eligibility
- Phase Schedule, Evaluation Criteria, Submission Guidelines, Reward Structure, IP Model
- Hook, Visibility, Domain Tags

Each section is rendered as a Card with proper content rendering:
- Rich text → `SafeHtmlRenderer`
- JSON arrays (deliverables, criteria) → structured lists/tables
- Badges for tags, checkboxes, single-value fields
- Empty sections show "Not yet curated" placeholder

**Search bar** at the top of each tab filters sections by heading text (case-insensitive match on section titles).

### Step 5: Handle Missing Snapshot (Existing Challenges)

For challenges created before this migration (no `creator_snapshot`), the "My Version" tab shows a message: "Original submission data is not available for challenges created before this feature was added." and defaults to the Curator Version tab.

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Add `creator_snapshot JSONB` column |
| `useSubmitSolutionRequest.ts` | Save snapshot before `complete_phase` |
| `usePublicChallenge.ts` | Add `creator_snapshot` to select query + type |
| New: `CreatorChallengeDetailView.tsx` | Dual-tab view with search + vertical scroll |
| `PublicChallengeDetailPage.tsx` | Replace Creator section with new component |

## Technical Notes

- `creator_snapshot` is write-once at submission time — never updated after
- No RLS changes needed — `creator_snapshot` lives on `challenges` table which already has RLS
- The Curator Version tab renders the same data the Curator workspace edits, using `SafeHtmlRenderer` for HTML and structured renderers for JSON arrays/objects
- Search is client-side filtering on section heading strings — no server round-trip

