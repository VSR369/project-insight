

# Unify Complexity Assessment with Standard AI Review Flow

## Problem

The Complexity section currently has a standalone "Assess by AI" button (calling the `assess-complexity` edge function) AND participates in the global "Review Sections by AI" flow. This is redundant and confusing. Every other section follows one consistent pattern: AI review generates comments → AI suggested version → Accept/Keep original → re-review. Complexity should too.

## Current Flow (Broken)

```text
Complexity section:
├── "Assess by AI" button → calls assess-complexity edge function → returns per-param ratings
├── Quick-select L1-L5 → sets uniform/weighted values
├── Override toggle → manual sliders
└── Global "Review Sections by AI" → treats complexity as checkbox_single → just picks a level
```

Two separate AI calls, two different response formats, no unified UX.

## Proposed Flow (Unified)

```text
Complexity section (like every other section):
├── "Review with AI" button (in section header) → calls assess-complexity
│   ├── AI Review comments panel (pass/warning/needs_revision)
│   └── AI Suggested Version panel showing per-parameter ratings + justifications
│       ├── "Accept suggestion" → applies AI ratings, saves
│       └── "Keep original" → retains current values
├── After acceptance: Override toggle + sliders for curator adjustments
├── Quick-select L1-L5 remains as a manual shortcut
└── Re-review button available after acceptance (like all sections)
```

## Technical Changes

### 1. Remove standalone "Assess by AI" from ComplexityAssessmentModule

**File:** `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`

- Remove the "Assess by AI" button, `handleAIAssess`, `aiAssessing` state, and the `supabase.functions.invoke("assess-complexity")` call
- Keep: Quick-select L1-L5, Override toggle + sliders, Save/Cancel, source badges
- Add a new prop `aiSuggestedRatings` to receive AI-generated per-parameter ratings from the parent when the AI review suggested version is accepted
- Add prop `onAcceptAISuggestion` callback

### 2. Route complexity AI review through the assess-complexity edge function

**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

When the AI review runs for the `complexity` section (either via global "Review Sections by AI" or per-section "Review with AI"):
- Instead of sending complexity to the generic triage batch, call `assess-complexity` separately
- Transform the `assess-complexity` response (per-parameter ratings + justifications) into the standard AI review format (`status`, `comments`, `structured_output`)
- The suggested version displays the parameter ratings table with justifications
- "Accept suggestion" applies the ratings via `handleSaveComplexity`

### 3. Update the AI Review inline display for complexity

When AI review results exist for the complexity section:
- **Comments panel**: Show AI observations (e.g., "Timeline urgency rated 8/10 due to 30-day deadline with prototype deliverable")
- **Suggested Version panel**: Show a formatted table of parameter ratings with justifications and the computed weighted score
- Accept/Keep original actions work as standard

### 4. Keep quick-select L1-L5 as manual override

Quick-select stays as a curator shortcut. These are not AI-driven — they remain weight-distributed manual overrides. Source badge shows "Curator" for these.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Remove standalone AI assess button/logic; add props for AI review integration; keep sliders, quick-select, source badges |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Route complexity section's AI review to `assess-complexity` edge function; transform response to standard review format; wire Accept to `handleSaveComplexity` |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Remove `complexity` from `SECTION_FORMAT_MAP` (no longer processed by generic triage) |

