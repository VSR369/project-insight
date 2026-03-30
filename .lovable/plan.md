

# Elevate AI to Principal Consultant Level — 7 Improvements

## Summary
Seven targeted changes across `promptTemplate.ts` and `index.ts` to transform AI output from "senior analyst checking boxes" to "principal consultant who sees the strategic whole." No DB migrations needed.

## Files Modified
1. `supabase/functions/review-challenge-sections/promptTemplate.ts` — Improvements 1, 3, 4, 5
2. `supabase/functions/review-challenge-sections/index.ts` — Improvements 2, 6, 7

---

## Improvement 1: Challenge Archetype Recognition + Maturity-Appropriate Depth

**File:** `promptTemplate.ts` — append to `INTELLIGENCE_DIRECTIVE` (after guardrails block, before closing backtick at line ~423)

Add two new numbered directives (5 and 6):
- **Directive 5 — CHALLENGE ARCHETYPE RECOGNITION**: Before reviewing, identify archetype (Data/ML Pipeline, Enterprise Integration, Process Redesign, Strategic Advisory, Product/UX Innovation, Cybersecurity Assessment). Comments must reflect archetype — e.g., missing training data specs is an ERROR for Data/ML, not a suggestion.
- **Directive 6 — MATURITY-APPROPRIATE DEPTH**: Blueprint reviews focus on strategic framing; POC on technical feasibility and demo-readiness; Pilot on production readiness, scalability, SLAs. Includes concrete examples of the same deliverable phrased for each maturity level.
- **Directive 7 — SOLVER-PERSPECTIVE THINKING**: Before concluding review of any section, mentally become a solver. Flag uncertainties as `[SOLVER VIEW]` warnings. Questions: "Would I understand this?", "Do I know what to deliver?", "Is the reward worth the effort?", "What risks do I face?"

---

## Improvement 2: Directed Dependency Reasoning

**File:** `index.ts` — add `DEPENDENCY_REASONING` constant (after `SECTION_DEPENDENCIES` at line ~114), then replace the `depBlock` construction in `callAIPass2Rewrite` (lines 553-577)

Add a new constant `DEPENDENCY_REASONING: Record<string, Record<string, string>>` with ~15 entries covering the most important section pairs. Each entry tells the LLM WHAT to check FOR when reviewing a section against a dependency:
- `evaluation_criteria.deliverables` → "VERIFY: Every criterion maps to a deliverable. Flag orphans."
- `reward_structure.complexity` → "SCALE: L4-L5 justifies higher rewards. L1-L2 at $100K+ is suspicious."
- `deliverables.scope` → "VERIFY: Deliverables collectively cover full scope. No items outside scope."
- `hook.reward_structure` → "EXTRACT: Reference reward to create concrete motivation."
- etc. (~50 dependency-reason pairs across 15 sections)

Then replace the depBlock builder (lines 553-577) to output directed format:
```
RELATED SECTIONS — CHECK EACH FOR THE STATED REASON:
deliverables [VERIFY: Every criterion can be assessed from at least one deliverable...]:
[content truncated to 1500 chars]
```

---

## Improvement 3: Solver-Perspective Review in Pass 1 Output Format

**File:** `promptTemplate.ts` — in `buildStructuredBatchPrompt`, add to the OUTPUT FORMAT section (after item 4 `cross_section_issues`, before the IMPORTANT reinforcement, around line ~594)

Add item 5 — `solver_perspective_issues`: For each section, consider the perspective of a globally distributed solver with NO internal context. Express issues as comments with type "warning" prefixed with "[SOLVER VIEW]". Covers: missing info for participation decision, unclear terms, risk/reward ratio, ambiguous requirements.

---

## Improvement 4: Strategic Coherence Check

**File:** `promptTemplate.ts` — in `buildStructuredBatchPrompt`, add after all per-section blocks but before the final reinforcement rules (after line ~705, before line ~733)

Add a `## STRATEGIC COHERENCE CHECK` section with 4 assessment areas:
1. **NARRATIVE COHERENCE** — Does Problem → Root Causes → Scope → Deliverables → Outcomes → Evaluation → Reward flow logically?
2. **AMBITION-CAPABILITY MATCH** — Are deliverables achievable by target solver profile within constraints?
3. **SOLVER ATTRACTIVENESS** — Would a top-tier solver choose this challenge over alternatives?
4. **PUBLICATION READINESS** — Rate as READY/NEEDS_WORK/NOT_READY with specific blockers.

---

## Improvement 5: Pass 2 Generative Elevation

**File:** `promptTemplate.ts` — replace the opening of `buildPass2SystemPrompt` (lines 872-897) with an elevated rewrite philosophy

Replace the current "senior management consultant rewriting" opening with a "principal management consultant" framing that includes:
- REWRITE PHILOSOPHY: "You are NOT just fixing issues. You are ELEVATING content to Big4 partner sign-off level."
- 8 rewrite rules (address issues, elevate beyond fixing, preserve intent, think like a solver, be specific, match format, production-ready, clean text)
- QUALITY BAR EXAMPLES: Concrete bad/good pairs for problem statements and deliverables showing the transformation expected

The existing INTELLIGENCE DIRECTIVE, CHALLENGE CONTEXT, and all downstream logic (domain frameworks, per-section enrichment, table format rules, cross-references) remain unchanged.

---

## Improvement 6: Enhanced Dependency Map

**File:** `index.ts` — update `SECTION_DEPENDENCIES` (lines 89-114) to add 6 new dependency links

Add to existing entries:
- `evaluation_criteria` += `submission_guidelines` (criteria must be assessable from submissions)
- `reward_structure` += `solver_expertise` (reward must match expertise level)
- `phase_schedule` += `evaluation_criteria` (eval phase needs time for criteria count)
- `hook` += `domain_tags` (hook should reference domain)
- `eligibility` += `complexity` (high complexity needs higher-tier solvers)
- `data_resources_provided` += `solver_expertise` (data format should match solver capabilities)

Also add corresponding `DEPENDENCY_REASONING` entries for these 6 new links.

---

## Improvement 7: Pass 1 User Prompt Thinking Framework

**File:** `index.ts` — add a thinking framework header to the user prompt (lines 1385-1442), inserted between `userPromptInstruction` and `CHALLENGE DATA:`

Add 5-question internal thinking framework:
1. What ARCHETYPE is this challenge?
2. What is the MATURITY-COMPLEXITY profile?
3. Who is the TARGET SOLVER?
4. What is the STRATEGIC STORY?
5. Where are the BIGGEST RISKS?

Instruction: "Use these answers to inform the DEPTH and FOCUS of your section-by-section review."

---

## Implementation Order
1. `promptTemplate.ts`: Improvements 1 (INTELLIGENCE_DIRECTIVE), 3 (solver perspective), 4 (coherence check), 5 (Pass 2 elevation)
2. `index.ts`: Improvements 2 (DEPENDENCY_REASONING + directed depBlock), 6 (enhanced deps), 7 (thinking framework)
3. Redeploy edge function

## Expected Impact
- Archetype-aware reviews (Data/ML vs Strategic Advisory get different error thresholds)
- Directed dependency reasoning ("check X against Y FOR reason Z" vs just injecting raw content)
- Solver perspective in every review ("[SOLVER VIEW]" warnings)
- Strategic coherence assessment (narrative flow, ambition-capability match, publication readiness)
- Pass 2 elevated from reactive fix to generative excellence
- 6 new critical dependency links for better cross-section consistency

