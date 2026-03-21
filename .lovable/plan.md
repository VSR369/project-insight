

## Plan: Deep AI Section Review with Editable Comments and AI Refinement Loop

### Concept

Transform the current superficial "Review Sections by AI" into a deep, contextual per-section review with an iterative refinement loop:

1. **AI reviews each section deeply** — considering industry context, maturity level, problem area, consistency, completeness, and unambiguity (not just "is it filled?")
2. **Review comments appear inline under each section** — editable by the curator
3. **Curator edits comments → clicks "Refine with AI"** → the modified comment becomes the prompt for AI to rewrite that section
4. **Curator accepts or discards** the AI-refined content

### Flow

```text
[Section Content]
     │
     ▼
[AI Review] ── status badge + editable comments
     │
     ├─ Curator edits a comment (e.g., "Make scope more specific to pharma")
     │
     ▼
[Refine with AI] button
     │
     ▼
[AI rewrites section using curator's comment as instruction]
     │
     ▼
[Accept / Discard] ── Accept saves to DB, Discard keeps original
```

### Changes

#### 1. New Edge Function: `refine-challenge-section`
**File: `supabase/functions/refine-challenge-section/index.ts`**

Accepts `{ challenge_id, section_key, current_content, curator_instructions }` and returns refined content. The system prompt instructs AI to rewrite the section content following the curator's instructions while maintaining consistency with the challenge context (title, maturity level, industry, other sections).

#### 2. Upgrade Edge Function: `review-challenge-sections`
**File: `supabase/functions/review-challenge-sections/index.ts`**

Enhance the system prompt to require deep, contextual review:
- Assess content quality (clarity, specificity, actionability) not just presence
- Check cross-section consistency (e.g., deliverables align with evaluation criteria)
- Evaluate industry-appropriateness and maturity-level fit
- Flag ambiguous language, vague goals, missing quantifiers
- Each comment should be a specific improvement instruction (not just "needs work")

#### 3. Upgrade Component: `CurationAIReviewPanel.tsx`
**File: `src/components/cogniblend/curation/CurationAIReviewPanel.tsx`**

Transform from read-only display to interactive review panel:
- Comments become editable `Textarea` fields (click to edit)
- Add "Refine with AI" button per section — sends edited comments as instructions to `refine-challenge-section`
- Show AI-refined content in a diff-like preview (proposed vs current)
- "Accept" and "Discard" buttons for the refined content
- Loading states during refinement

#### 4. Update CurationReviewPage integration
**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

- Remove the separate "Review Sections by AI" button from the right rail
- Add a small "AI Review" trigger button inside each section's accordion header (next to Edit button)
- When triggered, call `review-challenge-sections` for just that section (or batch for all)
- Pass `onAcceptRefinement` callback that saves the refined content via `saveSectionMutation`
- Pass section's current content to the review panel so it can feed the refine function

### Technical Details

**`refine-challenge-section` edge function payload:**
```typescript
{
  challenge_id: string,
  section_key: string,           // e.g., "problem_statement"
  current_content: string,       // current section text/JSON
  curator_instructions: string,  // edited review comment = the refinement prompt
  context: {                     // full challenge context for coherence
    title, maturity_level, industry, domain_tags
  }
}
```

**Enhanced review prompt (excerpt):**
```
Review for: consistency with stated maturity level, industry-specific accuracy,
unambiguous language, completeness of requirements, cross-section alignment
(e.g., do deliverables match evaluation criteria?), and actionability for solvers.
Each comment MUST be a specific, editable instruction that could be used to
directly improve the section.
```

**CurationAIReviewPanel new props:**
```typescript
interface CurationAIReviewPanelProps {
  sectionKey: string;
  review: SectionReview | undefined;
  currentContent: string | null;
  challengeId: string;
  challengeContext: { title, maturity_level, domain_tags };
  onAcceptRefinement: (newContent: string) => void;
  onReviewRequest: (sectionKey: string) => void;
}
```

### Files to Create
- `supabase/functions/refine-challenge-section/index.ts`

### Files to Modify
- `supabase/functions/review-challenge-sections/index.ts` — deeper review prompt
- `src/components/cogniblend/curation/CurationAIReviewPanel.tsx` — editable comments + refine button + accept/discard
- `src/pages/cogniblend/CurationReviewPage.tsx` — wire up per-section review triggers, pass new props, handle accept callback

