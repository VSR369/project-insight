

# Add AI Review to CR/CA Intake (ConversationalIntakeContent)

## Problem

The CR/CA flow (`ConversationalIntakeContent`) has no AI review functionality. When a user clicks Edit, there is no "Review with AI" button and no inline review panels — unlike the AM/RQ flow (`SimpleIntakeForm`) which has full AI review integration.

Additionally, in edit mode, all fields are already editable (RichTextEditor is rendered when `!isViewMode`), so manual editing works. The missing piece is solely the AI review layer.

## Changes

### File: `src/pages/cogniblend/ConversationalIntakePage.tsx`

**1. Add imports:**
- `AIReviewInline`, `SectionReview` from `@/components/cogniblend/shared/AIReviewInline`
- `Bot` from `lucide-react`
- `supabase` from `@/integrations/supabase/client`

**2. Add state (alongside existing state declarations ~line 416):**
```typescript
const [aiReviews, setAiReviews] = useState<Record<string, SectionReview>>({});
const [isAiReviewing, setIsAiReviewing] = useState(false);
```

**3. Add useEffect to load existing reviews from `editChallenge.ai_section_reviews` (~after line 623):**
- Same pattern as SimpleIntakeForm lines 276-283

**4. Add AI review handler functions (~before the conditional returns at line 626):**
- `handleRunAiReview` — calls `review-challenge-sections` with `role_context: 'spec'`
- `handleAcceptRefinement` — maps section keys to form fields (`problem_statement` → `problem_statement`, `expected_outcomes` → `expected_outcomes`, plus extended_brief fields like `scope_definition`, `beneficiaries_mapping`, etc.) and persists to DB
- `handleSingleSectionReview` — updates single section review state
- `handleMarkAddressed` — marks a review as addressed

**5. Add "Review with AI" button in the form (edit mode only, after the title heading ~line 900):**
```tsx
{mode === 'edit' && editChallengeId && (
  <Button variant="outline" size="sm" onClick={handleRunAiReview} disabled={isAiReviewing} className="gap-1.5">
    {isAiReviewing ? <Loader2 /> : <Bot />}
    {isAiReviewing ? 'Reviewing…' : 'Review with AI'}
  </Button>
)}
```

**6. Add `AIReviewInline` panels after each major field (edit mode only):**

Sections to add review panels for:
- **Problem Statement** (after line 1136) — `sectionKey="problem_statement"`
- **Expected Outcomes** (after line 1189) — `sectionKey="expected_outcomes"`
- **Scope Definition** (in ExpandField area) — `sectionKey="scope"`
- **Beneficiaries Mapping** — `sectionKey="beneficiaries_mapping"`

Each panel follows this pattern:
```tsx
{mode === 'edit' && editChallengeId && (
  <AIReviewInline
    sectionKey="problem_statement"
    review={aiReviews['problem_statement']}
    currentContent={form.watch('problem_statement')}
    challengeId={editChallengeId}
    challengeContext={{ title: form.watch('title') }}
    onAcceptRefinement={handleAcceptRefinement}
    onSingleSectionReview={handleSingleSectionReview}
    onMarkAddressed={handleMarkAddressed}
    roleContext="spec"
    defaultOpen={aiReviews['problem_statement']?.status === 'needs_revision' || aiReviews['problem_statement']?.status === 'warning'}
  />
)}
```

**7. Field mapping for `handleAcceptRefinement`:**

| Section Key | Form Field | DB Column |
|---|---|---|
| `problem_statement` | `problem_statement` | `problem_statement` |
| `expected_outcomes` | `expected_outcomes` | `expected_outcomes` |
| `scope` | `scope_definition` | `extended_brief.scope_definition` |
| `beneficiaries_mapping` | `beneficiaries_mapping` | `extended_brief.beneficiaries_mapping` |

**8. Need `updateMutation` reference** — add a `useSaveChallengeStep` or direct Supabase update call for persisting review data, matching the pattern already used in `handleUpdateChallenge`.

**Files modified**: 1 (`ConversationalIntakePage.tsx`)

