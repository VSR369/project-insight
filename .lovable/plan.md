

# Phase 2 System Prompt: Focused Section Refinement

## Problem
The current `refine-challenge-section` edge function uses a verbose, generic system prompt (~90 lines) that doesn't leverage Phase 1 triage results. It treats every call as if it needs full context about the curator's role, when Phase 1 has already identified the specific issues.

## Changes

### 1. Edge Function: `supabase/functions/refine-challenge-section/index.ts`

**Replace `getSystemPrompt()` (lines 35-91)** with a minimal, format-aware system prompt:

```text
You are fixing a specific curator section.
Section type: {section_type}
Known issues: {issues_from_phase1}
Current content: {section_content}

Return ONLY the corrected content in the same format as the input.
- If line items: return a JSON array of strings
- If rich text: return clean HTML
- If table: return JSON rows
No explanation. No preamble. Corrected content only.
```

**Refactor the request body** (line 169) to accept a new optional `issues` field from the frontend — these are the Phase 1 triage issues array.

**Rebuild `userPrompt` construction** (lines 201-260):
- Use `issues` (from Phase 1) as the `Known issues` block instead of `curator_instructions` when issues are provided
- Keep `curator_instructions` as fallback for manual refinement calls
- Determine `section_type` from an internal `SECTION_TYPE_MAP` (reuse existing `SECTION_FORMAT_MAP` pattern: `line_items`, `rich_text`, `table`, `schedule_table`, `checkbox_single`, `checkbox_multi`, etc.)
- Keep all existing format-specific instructions (EB formats, master data constraints, solver expertise taxonomy) — these append after the base prompt

**Keep backward compatibility**: If `curator_instructions` is provided but `issues` is not, fall back to the existing verbose prompt style. This ensures manual "Edit & Accept" refinements still work.

### 2. Frontend: `src/components/cogniblend/shared/AIReviewInline.tsx`

**Update `handleRefineWithAI`** (~line 384) to pass the Phase 1 `issues` array from the review's `comments` field into the edge function body:

```typescript
body: {
  challenge_id: challengeId,
  section_key: sectionKey,
  current_content: currentContent || "[empty]",
  issues: comments,  // Phase 1 triage issues
  curator_instructions: selectedInstructions, // kept as fallback
  role_context: roleContext,
  context: { ... },
}
```

### 3. Frontend: `src/pages/cogniblend/CurationReviewPage.tsx`

**Update Phase 2 loop** (~lines 1300-1327): After the deep review call returns for each section, pass the review's `comments` array as `issues` when triggering auto-refinement. Currently Phase 2 only calls `review-challenge-sections` — it should also trigger the refine call with the issues from the deep review result.

## Summary of token savings

- Phase 1: ~1,200 input tokens (triage, no suggestions)
- Phase 2 (new): ~200-500 input tokens per section (section content + issues only, no role preamble)
- vs. old: ~2,000-4,000 input tokens per section with full verbose prompt

## Files modified
- `supabase/functions/refine-challenge-section/index.ts` — new minimal system prompt, accept `issues` field
- `src/components/cogniblend/shared/AIReviewInline.tsx` — pass issues to edge function
- `src/pages/cogniblend/CurationReviewPage.tsx` — wire Phase 1 issues into Phase 2 refinement calls

