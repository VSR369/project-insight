

# Interview KIT Question Bank Implementation Plan

## Overview

Create a new Interview KIT Question Bank system that stores interview questions for the 5 universal competencies, scoped by Industry Segment and Expertise Level. This is separate from the existing self-assessment Question Bank (which is tied to Specialities in the Proficiency Taxonomy).

---

## Database Design

### New Table: `interview_kit_competencies`
Stores the 5 universal competency categories as master data.

```sql
CREATE TABLE public.interview_kit_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

**Initial Data:**
| code | name |
|------|------|
| solution_design | Solution Design & Architecture Thinking |
| execution_governance | Execution & Governance |
| data_tech_readiness | Data / Tech Readiness & Tooling Awareness |
| soft_skills | Soft Skills for Solution Provider Success |
| innovation_cocreation | Innovation & Co-creation Ability |

### New Table: `interview_kit_questions`
Stores interview questions linked to Industry, Expertise Level, and Competency.

```sql
CREATE TABLE public.interview_kit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_segment_id UUID NOT NULL REFERENCES industry_segments(id),
  expertise_level_id UUID NOT NULL REFERENCES expertise_levels(id),
  competency_id UUID NOT NULL REFERENCES interview_kit_competencies(id),
  question_text TEXT NOT NULL,
  expected_answer TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT interview_kit_questions_unique 
    UNIQUE (industry_segment_id, expertise_level_id, competency_id, question_text)
);

-- Indexes for common query patterns
CREATE INDEX idx_interview_kit_questions_industry 
  ON interview_kit_questions(industry_segment_id, is_active);
CREATE INDEX idx_interview_kit_questions_level 
  ON interview_kit_questions(expertise_level_id, is_active);
CREATE INDEX idx_interview_kit_questions_competency 
  ON interview_kit_questions(competency_id, is_active);
CREATE INDEX idx_interview_kit_questions_combo 
  ON interview_kit_questions(industry_segment_id, expertise_level_id, competency_id, is_active);
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.interview_kit_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_kit_questions ENABLE ROW LEVEL SECURITY;

-- Competencies: Public read, Admin manage
CREATE POLICY "Public read interview_kit_competencies" 
  ON interview_kit_competencies FOR SELECT 
  USING (is_active = true OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admin manage interview_kit_competencies" 
  ON interview_kit_competencies FOR ALL 
  USING (has_role(auth.uid(), 'platform_admin'));

-- Questions: Admin only (reviewers may get SELECT later)
CREATE POLICY "Admin manage interview_kit_questions" 
  ON interview_kit_questions FOR ALL 
  USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Active reviewers read interview_kit_questions" 
  ON interview_kit_questions FOR SELECT 
  USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM panel_reviewers 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

---

## File Structure

```
src/
├── hooks/queries/
│   └── useInterviewKitQuestions.ts      # CRUD hooks
├── pages/admin/interview-kit/
│   ├── InterviewKitPage.tsx             # Update: Add navigation to questions
│   ├── InterviewKitQuestionsPage.tsx    # NEW: Question bank by competency
│   ├── InterviewKitQuestionForm.tsx     # NEW: Create/Edit question dialog
│   ├── InterviewKitImportDialog.tsx     # NEW: Excel import
│   ├── InterviewKitExcelExport.ts       # NEW: Template + data export
│   └── index.ts                         # Update exports
```

---

## Component Details

### 1. Updated InterviewKitPage.tsx

Enhance the competency cards to be clickable, navigating to the questions page for that competency.

**Changes:**
- Make each competency card a Link to `/admin/interview/kit/questions?competency={code}`
- Add badge showing question count per competency
- Add "Manage All Questions" button at the top

### 2. New InterviewKitQuestionsPage.tsx

Main question bank page with:

**Header Section:**
- Title: "Interview KIT Questions"
- Breadcrumb: Admin > Interview KIT > Questions
- Import/Export buttons

**Filters Section:**
- Industry Segment dropdown (required)
- Expertise Level dropdown (required)
- Competency dropdown (required - pre-selected if from card click)
- Active/Inactive toggle

**Data Table Columns:**
| Column | Description |
|--------|-------------|
| Question | Truncated text (max 80 chars) |
| Expected Answer | Truncated text (max 60 chars) |
| Industry | Badge with segment name |
| Level | Badge with expertise level |
| Competency | Badge with color coding |
| Status | Active/Inactive badge |
| Actions | View, Edit, Deactivate, Delete |

**Actions:**
- Add Question button
- Bulk actions (Deactivate, Delete selected)

### 3. New InterviewKitQuestionForm.tsx

Dialog form for creating/editing questions.

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Industry Segment | Select | Yes | From industry_segments |
| Expertise Level | Select | Yes | From expertise_levels |
| Competency | Select | Yes | From interview_kit_competencies |
| Question Text | Textarea | Yes | Max 2000 chars |
| Expected Answer | Textarea | No | Max 3000 chars |
| Display Order | Number | No | Default 0 |
| Active | Switch | No | Default true |

### 4. New InterviewKitImportDialog.tsx

Excel import dialog following existing patterns.

**Import Modes:**
- **Add Only**: Insert new questions, skip duplicates
- **Replace**: Delete existing questions for the selected competencies, then insert

**Excel Template Columns:**
| Column | Required | Notes |
|--------|----------|-------|
| industry_segment | Yes | Must match existing segment name |
| expertise_level | Yes | Must match existing level name |
| competency | Yes | Code or name of competency |
| question_text | Yes | The interview question |
| expected_answer | No | Expected/ideal answer guidance |

**Validation:**
- Check industry_segment exists
- Check expertise_level exists
- Check competency exists (match by code or name)
- Question text not empty

### 5. New InterviewKitExcelExport.ts

**Functions:**
- `downloadInterviewKitTemplate()`: Empty template with headers + sample rows
- `exportInterviewKitQuestions(filters?)`: Export current data with optional filtering

---

## Routing Updates

**New Routes in App.tsx:**

```typescript
<Route
  path="/admin/interview/kit/questions"
  element={
    <AdminGuard>
      <InterviewKitQuestionsPage />
    </AdminGuard>
  }
/>
```

---

## Hooks Implementation

### useInterviewKitQuestions.ts

```typescript
// Types
export type InterviewKitCompetency = Tables<"interview_kit_competencies">;
export type InterviewKitQuestion = Tables<"interview_kit_questions">;

// Query hooks
export function useInterviewKitCompetencies(includeInactive?: boolean);
export function useInterviewKitQuestions(filters: {
  industrySegmentId?: string;
  expertiseLevelId?: string;
  competencyId?: string;
  includeInactive?: boolean;
});

// Mutation hooks
export function useCreateInterviewKitQuestion();
export function useUpdateInterviewKitQuestion();
export function useDeleteInterviewKitQuestion();  // Soft delete
export function useRestoreInterviewKitQuestion();
export function useHardDeleteInterviewKitQuestion();

// Bulk operations for import
export function useBulkDeleteInterviewKitQuestions();
```

---

## Technical Considerations

### Existing Patterns to Follow

1. **Audit Fields**: Use `withCreatedBy()` / `withUpdatedBy()` from `@/lib/auditFields.ts`
2. **Error Handling**: Use `handleMutationError()` from `@/lib/errorHandler.ts`
3. **Toast Notifications**: Use `sonner` toast pattern
4. **Cache Invalidation**: Use React Query's `invalidateQueries()`
5. **Pagination**: Follow the manual pagination pattern for large datasets (1000 per page)
6. **Import Batching**: Use chunked processing with yield delays for large imports

### UI Patterns

1. **AdminLayout**: Wrap all pages in `AdminLayout` component
2. **DataTable**: Use existing `DataTable` component with consistent column config
3. **Dialogs**: Use shadcn Dialog components with proper header/footer
4. **Forms**: Use React Hook Form + Zod validation
5. **Select Dropdowns**: Ensure proper background color (not transparent)

---

## Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Create database migration | Migration SQL |
| 2 | Seed competencies data | Migration SQL |
| 3 | Create hooks file | `useInterviewKitQuestions.ts` |
| 4 | Create question form | `InterviewKitQuestionForm.tsx` |
| 5 | Create questions page | `InterviewKitQuestionsPage.tsx` |
| 6 | Create export utilities | `InterviewKitExcelExport.ts` |
| 7 | Create import dialog | `InterviewKitImportDialog.tsx` |
| 8 | Update main KIT page | `InterviewKitPage.tsx` |
| 9 | Add route | `App.tsx` |
| 10 | Update exports | `index.ts` |

---

## Security Notes

- All mutations require `platform_admin` role (enforced via RLS)
- Reviewers get read-only access to active questions (for interview preparation)
- No public access to interview questions

---

## Summary

This implementation creates a complete Interview KIT Question Bank system with:
- 5 universal competencies as master data
- Questions scoped by Industry + Expertise Level + Competency
- Full CRUD operations with audit trails
- Excel import/export with validation
- Consistent UI following existing admin patterns

