

# Interview Kit Complete Fix - 5-Why Root Cause Resolution

## 5-Why Root Cause Summary

| Why | Question | Root Cause |
|-----|----------|------------|
| **1** | Why 1824 proof point questions? | Multiple mutation calls before mutex fix + no domain/competency |
| **2** | Why only proof points? | The domain/competency queries returned 0 results at time of generation |
| **3** | Why is section_type wrong in DB? | `section_type` was set to section name instead of constant |
| **4** | Why templates instead of description? | `generateProofPointQuestions` uses static templates, NOT the proof point description |
| **5** | Why can't this be fixed? | **Corrupted data must be deleted** AND **generation logic must be completely rewritten** |

---

## Critical Problems to Fix

### Problem 1: Proof Point Questions Use Templates, NOT Descriptions
**Current (WRONG):**
```typescript
// Uses static templates like:
'Regarding your proof point "{title}": What specific metrics...'
```

**Required (CORRECT):**
- Proof point questions must be generated **based on the DESCRIPTION** provided by the provider
- NOT using generic templates with just the title
- Questions should probe the specific claims in the description

### Problem 2: No Domain or Competency Questions Generated
**Analysis:**
- 1824 questions = ALL proof_point source
- 0 domain questions from question_bank
- 0 competency questions from interview_kit_questions

**Root Cause:** The `section_type` field was incorrectly set (used section_name value), and generation may have failed silently for domain/competency.

### Problem 3: Corrupted Data Blocking Regeneration
The existing evaluation with 1824 responses must be deleted for any fix to work.

---

## Implementation Plan

### Phase 1: Delete Corrupted Data (SQL - User Action Required)

```sql
-- Delete all 1824 corrupted responses
DELETE FROM interview_question_responses 
WHERE evaluation_id = 'd30f121d-7327-485d-a864-26da899db24a';

-- Delete corrupted evaluation
DELETE FROM interview_evaluations 
WHERE id = 'd30f121d-7327-485d-a864-26da899db24a';
```

### Phase 2: Fix Proof Point Question Generation

**File: `src/services/interviewKitGenerationService.ts`**

**Current approach (WRONG - uses templates):**
```typescript
export function generateProofPointQuestions(proofPoints) {
  for (const pp of proofPoints) {
    const shuffledTemplates = shuffleArray([...PROOF_POINT_QUESTION_TEMPLATES]);
    selectedTemplates.forEach((template) => {
      const questionText = template.replace('{title}', pp.title);
      // Uses TITLE only, ignores DESCRIPTION
    });
  }
}
```

**New approach - Generate questions from DESCRIPTION:**

Option A: Simple description-based templates
```typescript
export function generateProofPointQuestions(proofPoints) {
  const questions = [];
  
  for (const pp of proofPoints) {
    const descriptionQuestions = [
      `Based on your experience with "${pp.title}": ${pp.description ? 'You mentioned: "' + truncate(pp.description, 100) + '". Can you elaborate on the methodology you used?' : 'Can you walk me through the approach you took?'}`,
      `For "${pp.title}": What measurable outcomes did you achieve, and how were they verified?`,
    ];
    
    // Pick 1-2 questions per proof point
    const count = randomBetween(1, 2);
    const selected = shuffleArray(descriptionQuestions).slice(0, count);
    
    selected.forEach((text, idx) => {
      questions.push({
        question_text: text,
        expected_answer: pp.description ? `Reference: ${pp.description}` : PROOF_POINT_DEFAULT_GUIDANCE,
        question_source: QUESTION_SOURCE.proof_point,
        section_name: SECTION_CONFIG.proof_point.name,
        section_type: SECTION_TYPE.proof_point, // FIXED: use constant
        section_label: pp.title,
        display_order: SECTION_DISPLAY_ORDER.proof_point + orderOffset++,
        proof_point_id: pp.id,
      });
    });
  }
  
  return questions;
}
```

Option B: **Leave proof points EMPTY for now** (user preference to not generate without proper AI)
```typescript
export function generateProofPointQuestions(proofPoints) {
  // Return empty array - proof points require AI generation which is not implemented
  console.log('[InterviewKit] Proof point generation requires AI - returning empty');
  return [];
}
```

### Phase 3: Fix Section Type Values

In `generateDomainQuestions` and `generateCompetencyQuestions`, ensure `section_type` uses the constant:

```typescript
section_type: SECTION_TYPE.domain,  // NOT "Domain & Delivery Depth"
section_type: SECTION_TYPE.competency, // NOT "Solution Design..."
section_type: SECTION_TYPE.proof_point, // NOT "Proof Points Deep-Dive"
```

### Phase 4: Verify Domain Questions Generate

Add logging to trace why domain questions returned 0:
```typescript
console.log('[InterviewKit] Provider specialities:', specResult?.length || 0);
console.log('[InterviewKit] Domain questions found:', questionsResult?.length || 0);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/interviewKitGenerationService.ts` | Fix `generateProofPointQuestions` to return empty array (Option B) OR use description-based questions (Option A). Fix all `section_type` values to use constants. |
| Database (SQL by user) | Delete corrupted evaluation and responses |

---

## Expected Result After Fix

| Section | Source | Expected Count |
|---------|--------|----------------|
| Domain & Delivery Depth | question_bank (interview/both usage_mode) | 10 |
| Proof Points Deep-Dive | Empty (pending AI implementation) | 0 |
| Solution Design & Architecture Thinking | interview_kit_questions | 1-2 |
| Execution & Governance | interview_kit_questions | 1-2 |
| Data/Tech Readiness & Tooling Awareness | interview_kit_questions | 1-2 |
| Soft Skills for Solution Provider Success | interview_kit_questions | 1-2 |
| Innovation & Co-creation Ability | interview_kit_questions | 1-2 |
| **TOTAL** | | **~15-20** |

The Proof Points section will show **0 questions** until proper AI-based generation from descriptions is implemented.

---

## UI Display (Already Working)

The collapsible sections using `InterviewKitSection.tsx` are already correctly implemented with:
- Chevron expand/collapse
- Section name + question count badge
- Score/rated display on the right
- Per-section scoring

Once data is cleaned and regenerated, the UI will display correctly.

---

## Action Required from User

1. **Execute the cleanup SQL** in Supabase SQL editor
2. **Choose Option A or B** for proof point handling:
   - **Option A**: Generate simple description-based questions  
   - **Option B**: Leave proof points empty (recommended until AI is integrated)

