

# Context-Aware Reward Suggestions — Intelligent Pricing and Non-Monetary Rewards

## Current Problem

The AI generates **random** prize amounts and generic non-monetary rewards because it receives almost no challenge context. The refine function only passes:
- `title`
- `maturity_level`
- `domain_tags`

It has **no visibility** into: complexity, scope, deliverables, budget/pool, industry, evaluation criteria, effort level, or the nature of the solution being sought (blueprints, strategies, architecture designs, etc.).

## Design Philosophy

Your challenges seek **blueprints** (business models, strategies, technology architectures, operating models, process maps, workplace designs) that may progress through maturity stages: Blueprint → POC → Prototype → Pilot. The AI must:

1. **Price based on maturity stage** — A blueprint is conceptual work; a POC requires hands-on feasibility evidence; a pilot demands real-world deployment. Each stage compounds effort and cost.
2. **Benchmark against Big-4 consulting** — Solutions should be priced at approximately **50% or lower** than equivalent Big-4 consulting engagement rates for similar scope.
3. **Factor complexity, scope, and deliverables** — More deliverables, higher complexity, broader scope = higher prize pool allocation.
4. **Domain-relevant non-monetary rewards** — Not generic certificates. Instead: advisory board seats, co-authorship on white papers, pilot partnership opportunities, conference speaking slots, IP licensing arrangements, etc.

## Changes

### 1. Enrich context passed to the edge function

**Files:** `src/pages/cogniblend/CurationReviewPage.tsx`, `src/components/cogniblend/shared/AIReviewInline.tsx`

Expand the `context` object sent in both Phase 2 auto-refinement and manual refinement calls to include:

```
context: {
  title, maturity_level, domain_tags,
  complexity,           // e.g. "high"
  scope,                // full scope text
  deliverables,         // parsed deliverable items
  evaluation_criteria,  // criteria names + weights
  effort_level,         // e.g. "expert"
  industry,             // from eligibility or domain
  reward_pool,          // existing total pool amount if set
  currency,             // existing currency
  problem_statement,    // first 500 chars for domain understanding
}
```

The `challengeCtx` memo (line ~1787) will be expanded to include these fields. Both the Phase 2 auto-trigger (line 1380) and AIReviewInline (line 434) use this same context shape.

### 2. Update edge function to consume enriched context

**File:** `supabase/functions/refine-challenge-section/index.ts`

Expand the `contextParts` builder (line 220) to include all new fields:

```typescript
if (context?.complexity) contextParts.push(`Complexity: ${context.complexity}`);
if (context?.scope) contextParts.push(`Scope: ${context.scope}`);
if (context?.deliverables) contextParts.push(`Deliverables: ${JSON.stringify(context.deliverables)}`);
if (context?.effort_level) contextParts.push(`Effort Level: ${context.effort_level}`);
if (context?.industry) contextParts.push(`Industry: ${context.industry}`);
if (context?.reward_pool) contextParts.push(`Total Reward Pool: ${context.currency || 'USD'} ${context.reward_pool}`);
if (context?.problem_statement) contextParts.push(`Problem Summary: ${context.problem_statement.slice(0, 500)}`);
```

### 3. Rewrite the reward_structure FORMAT_INSTRUCTIONS prompt

**File:** `supabase/functions/refine-challenge-section/index.ts` (line 308)

Replace the current generic prompt with a domain-aware, benchmark-driven prompt:

```
CRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON object with this structure:
{
  "type": "monetary" | "non_monetary" | "both",
  "monetary": {
    "tiers": { "platinum": <amount>, "gold": <amount>, "silver": <amount> },
    "currency": "<ISO currency code>",
    "justification": "<2-3 sentences explaining pricing rationale>"
  },
  "nonMonetary": {
    "items": ["<domain-specific item 1>", "<domain-specific item 2>", ...]
  }
}

PRICING METHODOLOGY (MANDATORY):
1. MATURITY-STAGE PRICING: Blueprint (conceptual/strategic) work commands lower base 
   than POC (feasibility evidence) which commands lower than Prototype/Pilot (implementation).
   If maturity is Blueprint, price for strategic/conceptual deliverables.
   If POC or beyond, factor implementation effort multipliers.

2. BIG-4 BENCHMARK: Total prize pool should be approximately 50% or LOWER than what 
   a Big-4 consulting firm (McKinsey, BCG, Bain, Deloitte) would charge for equivalent 
   scope. For reference:
   - Blueprint/strategy work: Big-4 charges $50K-$200K+ → suggest $15K-$75K range
   - POC/feasibility: Big-4 charges $100K-$500K+ → suggest $30K-$150K range  
   - Pilot/implementation: Big-4 charges $200K-$1M+ → suggest $50K-$300K range
   Scale within these ranges based on complexity, deliverable count, and effort level.

3. COMPLEXITY MULTIPLIER: Low=0.6x, Medium=1.0x, High=1.5x, Expert=2.0x of base range.

4. DELIVERABLE SCALING: More deliverables = proportionally higher pool (each deliverable 
   represents solver work). Scale by ~10-15% per deliverable beyond 3.

5. TIER DISTRIBUTION: Platinum=50-60% of pool, Gold=25-30%, Silver=15-20%.
   Omit tiers if pool is small (<$10K → single tier only).

NON-MONETARY REWARDS (MANDATORY):
- Must be DOMAIN-SPECIFIC and INNOVATIVE — directly relevant to the challenge industry
- Examples by domain: Technology → cloud credits, dev tool licenses, tech conference passes, 
  CTO advisory sessions. Business Strategy → co-authorship on published case study, 
  advisory board seat, investor introduction. Healthcare → clinical trial partnership, 
  regulatory advisory session, journal co-publication.
- Never suggest generic items like "certificate" or "trophy"
- Suggest 3-5 items that would genuinely attract top-tier solvers in the domain
```

### 4. Also update `ai-field-assist` prompts (for Seeker-side suggestions)

**File:** `supabase/functions/ai-field-assist/index.ts`

Update the `reward_tier_breakup` and `non_monetary_suggestions` prompts with the same pricing methodology and domain-awareness, since seekers also use AI to set initial reward structures.

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/refine-challenge-section/index.ts` | Expand context consumption + rewrite reward prompt with Big-4 benchmarking and maturity-stage pricing |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Enrich `challengeCtx` memo with complexity, scope, deliverables, effort, industry, reward_pool, problem_statement |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Pass enriched context (already uses challengeContext prop — just needs parent to supply more fields) |
| `supabase/functions/ai-field-assist/index.ts` | Update reward_tier_breakup and non_monetary_suggestions prompts with same methodology |

