

# Fix: Reward Section Triage Comments — Specialist Reward Design Guidance

## Problem

The AI Review comments shown under the Reward Structure section (Phase 1 triage) are generic and technical — telling the curator things like "provide a written rationale as a JSON object" or referencing "L4 rating" and "Budget Scale parameter". These are meaningless to a curator.

**Root cause:** The triage system prompt in `triage-challenge-sections/index.ts` is a single generic prompt for all 28 sections. It has zero knowledge of reward design principles. It just evaluates "is content complete, correctly formatted" — producing structural/technical observations.

## Solution

Add **section-specific triage instructions** that are appended to the user prompt when the `reward_structure` section is being triaged. This transforms the AI from a generic format checker into a reward design specialist.

## Changes

### File: `supabase/functions/triage-challenge-sections/index.ts`

**1. Add a section-specific instructions map** (new constant, ~30 lines):

```typescript
const SECTION_TRIAGE_INSTRUCTIONS: Record<string, string> = {
  reward_structure: `
For the reward_structure section, evaluate as a REWARD DESIGN SPECIALIST, not a format checker.
Your comments must be curator-friendly recommendations, NOT technical or structural.

Evaluate against these principles:
1. BIG-4 BENCHMARK: Is the total prize pool reasonable compared to what Big-4 consulting 
   firms (McKinsey, BCG, Deloitte, Bain) would charge for equivalent scope? 
   Target ≈50% of Big-4 rates. Comment if the pool seems too low or too high.
2. MATURITY ALIGNMENT: Does the prize amount match the maturity stage 
   (Blueprint=$15K-$75K, POC=$30K-$150K, Pilot=$75K-$300K)?
3. SOLVER ATTRACTION: Will this reward structure attract the right quality of solution 
   providers? Explain why or why not.
4. TIER STRUCTURE: Is the tier distribution (Platinum/Gold/Silver) appropriate for the 
   pool size? Are there too many or too few tiers?
5. NON-MONETARY VALUE: Are non-monetary items domain-relevant and genuinely attractive 
   to top-tier solvers, or are they generic (certificates, trophies)?

Frame every issue as a professional recommendation, e.g.:
- "Consider increasing the prize pool to $X-$Y range — for a [maturity] challenge of this 
  complexity, Big-4 firms would charge $Z, and 50% benchmark suggests at least $W."
- "The current non-monetary rewards are generic. For [domain], consider [specific items] 
  to attract specialized solvers."

NEVER produce technical comments like "provide JSON", "missing field", or reference 
internal data formats.`,
};
```

**2. Inject section-specific instructions into the user prompt** in `buildTriageUserPrompt()`:

After adding the section content line, append any section-specific instructions:

```typescript
for (const key of sectionKeys) {
  let content = extractSectionContent(key, challengeData);
  if (content && content.length > 500) {
    content = content.substring(0, 497) + "...";
  }
  parts.push(`[${key}]: ${content || "[empty]"}`);
  
  // Append specialist instructions for specific sections
  if (SECTION_TRIAGE_INSTRUCTIONS[key]) {
    parts.push(SECTION_TRIAGE_INSTRUCTIONS[key]);
  }
}
```

**3. Enrich the triage prompt with challenge context for reward evaluation**

The reward triage needs to know maturity, complexity, deliverable count, and domain to make meaningful comments. Add a context block when `reward_structure` is in the batch:

```typescript
// In buildTriageUserPrompt, before sections
if (sectionKeys.includes('reward_structure')) {
  parts.push(`\nChallenge Context for Reward Evaluation:`);
  parts.push(`- Maturity: ${challengeData.maturity_level || 'not set'}`);
  parts.push(`- Complexity: ${challengeData.complexity_level || 'not set'}`);
  parts.push(`- Effort: ${challengeData.effort_level || 'not set'}`);
  parts.push(`- Domains: ${JSON.stringify(challengeData.domain_tags || [])}`);
  parts.push(`- Deliverables count: ${countDeliverables(challengeData.deliverables)}`);
  parts.push(`- Problem summary: ${(challengeData.problem_statement || '').slice(0, 200)}\n`);
}
```

### Result

Instead of comments like:
- "Provide a written rationale as a JSON object: { 'selected_id': '...', 'rationale': '...' }"
- "Align the 'Budget Scale' parameter (currently 4/10) with the high complexity"

Curators will see:
- "The current prize pool of $1,750 is significantly below the recommended range for a high-complexity Blueprint challenge. Big-4 firms would charge $80K-$150K for equivalent scope — consider a pool of at least $40K-$75K to attract quality solvers."
- "Non-monetary rewards should include domain-specific items like SAP developer certifications, IoT lab access partnerships, or co-authorship on an industrial automation white paper."

## Files

| File | Change |
|------|--------|
| `supabase/functions/triage-challenge-sections/index.ts` | Add reward-specialist triage instructions, inject challenge context for reward evaluation |

