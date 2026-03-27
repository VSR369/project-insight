

# Fix: Complexity Assessment — Equal Ratings Bug & AI Input Enrichment

## Problems Identified

### Bug 1: Quick-select L1-L5 sets ALL parameters to the same value
In `handleQuickSelect` (line 169-189), when a user clicks L1/L2/L3/L4/L5, every parameter is set to the same midpoint value:
```typescript
const midpoint = Math.round((threshold.min + threshold.max) / 2);
complexityParams.forEach((p) => {
  newDraft[p.param_key] = midpoint; // ALL get the same value
});
```
This is fundamentally wrong — clicking "L3" sets Technical Novelty, Budget Scale, Domain Breadth, etc. all to 5. The quick-select should set the **overall target level** and distribute parameter values proportionally using their weights, or better: it should call the AI with a hint, or use a weighted distribution that produces the target score but with variance.

### Bug 2: AI assessment may return equal ratings due to insufficient context
The edge function only fetches basic challenge fields (title, problem_statement, scope, deliverables, etc.) but is missing the **extended brief** (context/background, root causes, stakeholders, current deficiencies, preferred approach) and **expected_outcomes, submission_guidelines, hook, effort_level, operating_model**. With thin input data, the AI defaults to similar ratings across parameters.

### Bug 3: Section ordering — Complexity after Rewards
Complexity is at index 8 (after Reward Structure at index 7). Rewards should factor in complexity, so complexity must come first.

---

## Proposed Changes

### 1. Fix quick-select to use weighted distribution (not equal values)

**File:** `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`

Replace `handleQuickSelect` logic. Instead of setting all params to the same midpoint, create a differentiated spread around the target score:

```typescript
const handleQuickSelect = useCallback((threshold) => {
  const targetScore = (threshold.min + threshold.max) / 2;
  const newDraft: Record<string, number> = {};

  // Use existing AI ratings as a shape if available, scaled to target level
  const hasAIRatings = Object.keys(aiJustifications).length > 0;

  if (hasAIRatings) {
    // Scale existing AI-derived ratings proportionally to hit the target score
    const currentAvg = complexityParams.reduce((s, p) => s + (draft[p.param_key] ?? 5), 0) / complexityParams.length;
    const scaleFactor = currentAvg > 0 ? targetScore / currentAvg : 1;
    complexityParams.forEach((p) => {
      const scaled = Math.round((draft[p.param_key] ?? 5) * scaleFactor);
      newDraft[p.param_key] = Math.max(1, Math.min(10, scaled));
    });
  } else {
    // No AI data — use parameter weights to create variance
    // Higher-weighted params get slightly higher values, lower-weighted get lower
    const weights = complexityParams.map(p => p.weight);
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);
    const range = maxW - minW || 1;

    complexityParams.forEach((p) => {
      // Spread ±1.5 around target based on weight rank
      const weightRank = (p.weight - minW) / range; // 0..1
      const offset = (weightRank - 0.5) * 3; // -1.5 to +1.5
      const value = Math.round(targetScore + offset);
      newDraft[p.param_key] = Math.max(1, Math.min(10, value));
    });
  }

  setDraft(newDraft);
  setAiJustifications({});
  // Save immediately
  const totalWeight = complexityParams.reduce((s, p) => s + p.weight, 0);
  const ws = totalWeight > 0
    ? complexityParams.reduce((s, p) => s + (newDraft[p.param_key] ?? 5) * p.weight, 0) / totalWeight
    : 5;
  const score = Math.round(ws * 100) / 100;
  onSave(newDraft, score, threshold.level);
}, [complexityParams, draft, aiJustifications, onSave]);
```

### 2. Enrich AI inputs in the edge function

**File:** `supabase/functions/assess-complexity/index.ts`

Expand the challenge SELECT to include all available context:

```sql
title, problem_statement, scope, description, deliverables,
evaluation_criteria, reward_structure, ip_model, maturity_level,
eligibility, visibility, phase_schedule, domain_tags,
consulting_fee, management_fee, total_fee, currency_code,
max_solutions, submission_deadline,
-- NEW fields:
extended_brief, expected_outcomes, submission_guidelines,
hook, operating_model, effort_level
```

Update the user prompt to explicitly break out the extended brief subsections when present:

```
EXTENDED BRIEF (deep context):
- Context & Background: ...
- Root Causes: ...
- Affected Stakeholders: ...
- Current Deficiencies: ...
- Preferred Approach: ...
- Approaches Not of Interest: ...
```

This gives the AI rich context to differentiate ratings — e.g., complex stakeholder mapping increases `domain_breadth`, novel root causes increase `technical_novelty`, tight schedules with broad scope increase `timeline_urgency`.

### 3. Reorder sections — Complexity before Rewards

**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

In the `SECTIONS` array, swap `complexity` (currently after `reward_structure`) to appear before it. Move the complexity object (lines 369-375) above the reward_structure object (lines 349-368).

### 4. Add source attribution badges (AI / Curator)

**File:** `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`

Track source per parameter:

```typescript
const [paramSources, setParamSources] = useState<Record<string, 'ai' | 'curator' | 'default'>>({});
```

- When AI assessment runs → mark all rated params as `'ai'`
- When curator moves a slider → mark that param as `'curator'`
- Render a small badge next to each parameter name showing the source

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Fix quick-select distribution, add source badges, track AI vs curator per param |
| `supabase/functions/assess-complexity/index.ts` | Add extended_brief, expected_outcomes, submission_guidelines, hook, operating_model, effort_level to SELECT; restructure prompt |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Swap complexity and reward_structure in SECTIONS array |

