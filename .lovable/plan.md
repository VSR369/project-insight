

# Implement "Domain Mastery" Upgrade — 6 Changes

## Status: NOT IMPLEMENTED
None of the 6 changes exist in the codebase. Some overlapping elements from the earlier "Principal Consultant" upgrade are present (archetype recognition, thinking framework, Pass 2 elevation) but the specific Domain Mastery changes are absent.

## What Already Exists (from prior upgrades)
- INTELLIGENCE_DIRECTIVE with archetype recognition (directives 5-7) — but framed as checklist, not domain-expert thinking
- Thinking framework in user prompt (5 questions) — but without maturity/complexity interpolation
- Pass 2 with "Big4 partner" framing — but missing three-perspective (seeker/solver/evaluator) philosophy
- No org context fetch, no geography inference, no wave context, no knowledge activation directive

## Files Modified
1. `supabase/functions/review-challenge-sections/promptTemplate.ts`
2. `supabase/functions/review-challenge-sections/index.ts`

---

## Change 1: Context Intelligence Layer

**File:** `promptTemplate.ts` — add new exported function `buildContextIntelligence`
**File:** `index.ts` — fetch org context from DB, call `buildContextIntelligence`, prepend to system prompts

### promptTemplate.ts
- Add `CURRENCY_TO_GEOGRAPHY` map (15 currencies → geography strings)
- Add `buildContextIntelligence(challengeData, clientContext, orgContext?)` function that builds a `## CONTEXT INTELLIGENCE` block containing:
  - Geography inference from currency
  - Organization type context
  - Operating model implications (marketplace vs aggregator)
  - Maturity-complexity profile
  - Instructions for applying industry, geographic, and competitive knowledge
  - 4-point application guide (Comments, Best Practices, Suggestions, Warnings)

### index.ts
- After challenge data fetch, add org context fetch using `adminClient` (query `seeker_organizations` → `organization_types`)
- Import `buildContextIntelligence` from promptTemplate
- Prepend context intelligence block to system prompt (both Pass 1 and Pass 2)

---

## Change 2: Wave Sequence Awareness

**File:** `promptTemplate.ts` — add `SECTION_WAVE_CONTEXT` constant (exported)

A `Record<string, { wave, waveName, strategicRole, upstreamSections, downstreamSections }>` covering all 25 sections with strategic role descriptions explaining WHY each section matters.

### Injection points:
- **Pass 1** (`buildStructuredBatchPrompt`): For each section block, append POSITION, STRATEGIC ROLE, upstream/downstream info
- **Pass 1** (`buildConfiguredBatchPrompt`): Same injection for legacy path
- **Pass 2** (index.ts `callAIPass2Rewrite`): Add wave position block after ACTION line in per-section prompt

---

## Change 3: Replace INTELLIGENCE_DIRECTIVE

**File:** `promptTemplate.ts` — replace the existing `INTELLIGENCE_DIRECTIVE` constant (lines 405-451)

Replace with "DOMAIN EXPERT CONSULTANT" framing:
- Primary mode: THINK, THEN CHECK (not checklist-first)
- 3-step process: Comprehend → Contextualize → Critique
- "What you know" sections: consulting engagements, open innovation platforms, industry data
- "How to express" with BAD/GOOD examples showing domain-grounded comments
- Guardrails preserved (no fabrication)

The existing archetype recognition (directive 5), maturity depth (directive 6), and solver perspective (directive 7) content is preserved and integrated into the new framing.

---

## Change 4: Enhanced Pass 1 User Prompt

**File:** `index.ts` — replace the `userPromptInstruction` blocks (lines 1457-1465)

- Single-section re-review: Add 4-question pre-review thinking (wave position, archetype, solver needs, biggest risk)
- Full review: Replace 5-question framework with 6-question framework that interpolates actual maturity/complexity values and adds competitive positioning question

---

## Change 5: Pass 2 Three-Perspective Philosophy

**File:** `promptTemplate.ts` — replace the Pass 2 system prompt opening in `buildPass2SystemPrompt` (lines 922-959)

Replace with:
- "Think like three people simultaneously" framework (Seeker, Solver, Evaluator)
- Condensed 6 rewrite rules (merging existing 8 into cleaner set)
- Enhanced context header with operating model, currency, complexity
- Quality bar examples preserved

---

## Change 6: Wire orgContext Into Edge Function

**File:** `index.ts`
- Pass `orgContext` to `buildContextIntelligence` for both Pass 1 and Pass 2
- Import the new function from promptTemplate.ts
- Update the import line at top of index.ts to include `buildContextIntelligence` and `SECTION_WAVE_CONTEXT`

---

## Implementation Order
1. `promptTemplate.ts`: Changes 2 (SECTION_WAVE_CONTEXT), 3 (INTELLIGENCE_DIRECTIVE replacement), 1 (buildContextIntelligence), 5 (Pass 2 elevation) + inject wave context into buildStructuredBatchPrompt and buildConfiguredBatchPrompt
2. `index.ts`: Changes 1 (org fetch), 4 (user prompt), 6 (wiring) + inject wave context into Pass 2 depBlock builder
3. Redeploy edge function

## Risk Assessment
- INTELLIGENCE_DIRECTIVE replacement preserves all existing archetype/maturity/solver directives — no capability loss
- Pass 2 prompt replacement preserves quality bar examples and domain framework injection
- Org context fetch is optional (graceful fallback if org not found)
- Wave context is additive — no existing prompt content removed

