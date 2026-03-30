

# AI Prompt Quality Overhaul — From 4/10 to 8/10

## Summary
Eight fixes to the AI review pipeline's prompt construction. Changes are concentrated in the edge function (`index.ts` + `promptTemplate.ts`). No DB migrations needed.

## Files Modified
1. `supabase/functions/review-challenge-sections/promptTemplate.ts` — Fixes 2, 3, 5, 6
2. `supabase/functions/review-challenge-sections/index.ts` — Fixes 1, 3, 4, 8
3. Edge function redeploy required after changes

---

## Fix 1 (CRITICAL): Cross-Section Dependencies in Pass 2

**File:** `index.ts` — inside `callAIPass2Rewrite`, after building each per-section prompt block

Add a `SECTION_DEPENDENCIES` map (24 entries mapping each section to its upstream dependencies). For each section in Pass 2, look up dependencies, extract their content from `challengeData`, and inject a `RELATED SECTIONS (for consistency)` block into the per-section rewrite prompt — max 1500 chars per dep, truncated.

This replaces the unreliable `cross_references` DB field mechanism with deterministic, code-driven dependency injection.

---

## Fix 2 (CRITICAL): Section-Specific Format Instructions for All 26 Sections

**File:** `promptTemplate.ts` — add entries to `EXTENDED_BRIEF_FORMAT_INSTRUCTIONS`

Add detailed format + content guidance for the 12 sections currently missing instructions:
- `problem_statement`: structure (context → problem → impact → constraints), 200-400 words
- `scope`: in-scope vs out-of-scope structure
- `hook`: 50-100 word compelling opener
- `deliverables`: JSON with acceptance_criteria per item
- `expected_outcomes`: SMART format
- `submission_guidelines`: format reqs, file types, page limits
- `phase_schedule`: standard phases, maturity-aware duration
- `maturity_level`: decision guide (Blueprint/POC/Pilot)
- `eligibility`: tier selection guidance
- `visibility`: anonymous vs named guidance
- `domain_tags`: 3-8 tags, specificity rules
- `solution_type`: code selection from allowed list

---

## Fix 3 (CRITICAL): Curated Pass 1 User Prompt

**File:** `index.ts` — replace line 1275's raw JSON dump

Replace:
```typescript
const userPrompt = `${userPromptInstruction}\n\nDATA: ${JSON.stringify(challengeData, null, 2)}${additionalData}`;
```

With a structured, curated summary that:
1. Strips HTML tags from rich text fields
2. Truncates long fields to 3000 chars
3. Removes irrelevant fields (`ai_section_reviews`, `targeting_filters`)
4. Labels each field clearly (Title, Problem Statement, Scope, etc.)
5. Presents JSON fields in readable format

Helper functions `stripHtml()` and `jsonBrief()` added as utilities.

---

## Fix 4 (HIGH): Enriched Pass 2 Context Header

**File:** `index.ts` — replace lines 507-517 in `callAIPass2Rewrite`

Replace the raw `JSON.stringify(challengeData)` with a structured context header:
- Title, Solution Type, Maturity Level, Complexity (score + level)
- Operating Model, Currency, Rate Card (if available)
- Today's Date
- Then the full data dump as a backup reference

---

## Fix 5 (MEDIUM): Default Quality Criteria as Code Constants

**File:** `promptTemplate.ts` — add `DEFAULT_QUALITY_CRITERIA` constant

Provide fallback quality criteria for key sections when the DB `ai_review_section_config` has NULL quality_criteria. Covers:
- `problem_statement`: Specificity, Solver Comprehension, Impact Quantification
- `deliverables`: Acceptance Criteria, Evaluation Alignment, Maturity Match
- `evaluation_criteria`: Weight Sum, Deliverable Coverage, Evaluator Feasibility
- `phase_schedule`: Date Validity, Duration Alignment
- `reward_structure`: Budget Alignment, Tier Rationale
- `solver_expertise`: Solution Type Alignment
- `submission_guidelines`: Deliverable Coverage

Inject these in `buildStructuredBatchPrompt` and `buildPass2SystemPrompt` when config quality_criteria is empty.

---

## Fix 6 (MEDIUM): Domain-to-Framework Mapping

**File:** `promptTemplate.ts` — add `DOMAIN_FRAMEWORKS` map + injection logic

Map 10+ domain keywords to relevant industry frameworks:
- `supply_chain` → SCOR Model, Lean Six Sigma, S&OP
- `cybersecurity` → NIST CSF 2.0, ISO 27001, MITRE ATT&CK
- `ai_ml` → CRISP-DM, ML Ops, Responsible AI
- `data_analytics` → DAMA-DMBOK, Data Mesh, dbt
- etc.

In `buildStructuredBatchPrompt` and `buildPass2SystemPrompt`, detect domain from `challengeData.domain_tags` and inject matching frameworks into the system prompt.

---

## Fix 7 (LOW): Post-Accept Validation Warnings

Not implemented in this phase — existing `postLlmValidation.ts` already covers date math and weight normalization. Further validation is deferred.

---

## Fix 8 (LOW): Batch Size Optimization

**File:** `index.ts` — reduce `MAX_BATCH_SIZE` from 12 to 6

Add a `SOLO_SECTIONS` set for high-stakes sections (`evaluation_criteria`, `reward_structure`, `deliverables`, `solver_expertise`) that should be batched alone (batch size = 1) to maximize LLM attention.

---

## Implementation Order
1. Fix 2 (format instructions) + Fix 5 (quality criteria) + Fix 6 (domain frameworks) → all in `promptTemplate.ts`
2. Fix 3 (curated Pass 1 prompt) + Fix 1 (cross-section deps) + Fix 4 (Pass 2 context) + Fix 8 (batch size) → all in `index.ts`
3. Redeploy edge function

## Expected Impact
- Prompt quality score: 4/10 → 8/10
- Every section gets specific format + content guidance
- Pass 2 sees dependent section content for consistency
- LLM receives clean, structured input instead of raw JSON dump
- Critical sections get solo batches for maximum attention

