
# Interview KIT Question Bank - Implementation Plan
**Aligned with Project Knowledge Standards v3.1**

---

## Overview

Implement a complete Interview KIT Question Bank system for managing interview questions categorized by:
- Industry Segment
- Expertise Level  
- Universal Competency (5 categories)

This system is **separate** from the existing self-assessment Question Bank (which uses Specialities in the Proficiency Taxonomy).

---

## Phase 1: Database Setup

### 1.1 Create Tables & Seed Data

**Migration File:** `supabase/migrations/YYYYMMDD_create_interview_kit_tables.sql`

**Table: `interview_kit_competencies`** (Master Data)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| code | VARCHAR(50) | NOT NULL, UNIQUE |
| description | TEXT | nullable |
| icon | VARCHAR(50) | nullable |
| color | VARCHAR(50) | nullable |
| display_order | INTEGER | default 0 |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| updated_at | TIMESTAMPTZ | nullable |
| created_by | UUID | FK auth.users |
| updated_by | UUID | FK auth.users |

**Seed Data:**
| code | name | icon | color |
|------|------|------|-------|
| solution_design | Solution Design & Architecture Thinking | Lightbulb | amber |
| execution_governance | Execution & Governance | Target | blue |
| data_tech_readiness | Data / Tech Readiness & Tooling Awareness | Database | green |
| soft_skills | Soft Skills for Solution Provider Success | Users | purple |
| innovation_cocreation | Innovation & Co-creation Ability | Sparkles | pink |

**Table: `interview_kit_questions`**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| industry_segment_id | UUID | NOT NULL, FK industry_segments |
| expertise_level_id | UUID | NOT NULL, FK expertise_levels |
| competency_id | UUID | NOT NULL, FK interview_kit_competencies |
| question_text | TEXT | NOT NULL |
| expected_answer | TEXT | nullable |
| display_order | INTEGER | default 0 |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| updated_at | TIMESTAMPTZ | nullable |
| created_by | UUID | FK auth.users |
| updated_by | UUID | FK auth.users |

### 1.2 Indexes (Per Project Knowledge Section 6.4)

```sql
-- Required indexes for common query patterns
CREATE INDEX idx_interview_kit_questions_industry 
  ON interview_kit_questions(industry_segment_id, is_active);
CREATE INDEX idx_interview_kit_questions_level 
  ON interview_kit_questions(expertise_level_id, is_active);
CREATE INDEX idx_interview_kit_questions_competency 
  ON interview_kit_questions(competency_id, is_active);
CREATE INDEX idx_interview_kit_questions_combo 
  ON interview_kit_questions(industry_segment_id, expertise_level_id, competency_id, is_active);
```

### 1.3 RLS Policies (Per Project Knowledge Section 7)

```sql
-- Enable RLS
ALTER TABLE interview_kit_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_kit_questions ENABLE ROW LEVEL SECURITY;

-- Competencies: Public read active, Admin full manage
CREATE POLICY "Public read active competencies"
  ON interview_kit_competencies FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admin manage competencies"
  ON interview_kit_competencies FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'));

-- Questions: Admin manage, Active reviewers read active
CREATE POLICY "Admin manage questions"
  ON interview_kit_questions FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Reviewers read active questions"
  ON interview_kit_questions FOR SELECT
  USING (
    is_active = true AND 
    EXISTS (SELECT 1 FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true)
  );
```

---

## Phase 2: Constants File

**File:** `src/constants/interview-kit.constants.ts`

Following Project Knowledge Section 1 - Constants Extraction Pattern:

```typescript
// Competency display configuration
export const COMPETENCY_CONFIG = {
  solution_design: {
    label: 'Solution Design & Architecture Thinking',
    icon: 'Lightbulb',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  // ... other competencies
} as const;

// Import batch sizes (per memory/features/enterprise-import-system-v2)
export const INTERVIEW_KIT_IMPORT_BATCH_SIZE = 100;
export const INTERVIEW_KIT_DELETE_BATCH_SIZE = 50;
```

Update `src/constants/index.ts` to re-export.

---

## Phase 3: Hooks Implementation

**File:** `src/hooks/queries/useInterviewKitQuestions.ts`

Following Project Knowledge Section 6 - Hook Organization Pattern:

### 3.1 Types (Per Project Knowledge Section 6 Template)

```typescript
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type InterviewKitCompetency = Tables<"interview_kit_competencies">;
export type InterviewKitQuestion = Tables<"interview_kit_questions">;
export type InterviewKitQuestionInsert = TablesInsert<"interview_kit_questions">;
export type InterviewKitQuestionUpdate = TablesUpdate<"interview_kit_questions">;
```

### 3.2 Query Hooks

```typescript
// Competencies query with cache configuration (Per Section 2)
export function useInterviewKitCompetencies(includeInactive = false) {
  return useQuery({
    queryKey: ["interview_kit_competencies", { includeInactive }],
    queryFn: async () => { /* ... */ },
    staleTime: 5 * 60 * 1000,   // 5 minutes - reference data
    gcTime: 30 * 60 * 1000,     // 30 minutes cache
  });
}

// Questions query with filters and pagination
export function useInterviewKitQuestions(filters: {
  industrySegmentId?: string;
  expertiseLevelId?: string;
  competencyId?: string;
  includeInactive?: boolean;
}) {
  return useQuery({
    queryKey: ["interview_kit_questions", filters],
    queryFn: async () => {
      // Manual pagination pattern (per memory/features/question-bank-pagination-logic)
      const PAGE_SIZE = 1000;
      // ... paginate through results
    },
  });
}
```

### 3.3 Mutation Hooks (Per Project Knowledge Section 6-7)

Each mutation follows the standard template with:
- `withCreatedBy()` / `withUpdatedBy()` from `@/lib/auditFields`
- `handleMutationError()` from `@/lib/errorHandler`
- Query invalidation on success
- Toast notifications via `sonner`

```typescript
export function useCreateInterviewKitQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (question: InterviewKitQuestionInsert) => {
      const questionWithAudit = await withCreatedBy(question);
      const { data, error } = await supabase
        .from("interview_kit_questions")
        .insert(questionWithAudit)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      toast.success("Question created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_interview_kit_question' });
    },
  });
}

// Similar patterns for:
// - useUpdateInterviewKitQuestion()
// - useDeleteInterviewKitQuestion() (soft delete - is_active = false)
// - useRestoreInterviewKitQuestion()
// - useHardDeleteInterviewKitQuestion()
// - useBulkDeleteInterviewKitQuestions() (for import replace mode)
```

---

## Phase 4: UI Components

### 4.1 Question Form Dialog

**File:** `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx`

Following Project Knowledge Section 9.3 - Form Handling Standard:
- React Hook Form + Zod validation
- Validate on blur + submit
- Inline errors under fields
- Loading state during API calls

**Form Fields:**
| Field | Type | Validation |
|-------|------|------------|
| Industry Segment | Select | Required |
| Expertise Level | Select | Required |
| Competency | Select | Required, from interview_kit_competencies |
| Question Text | Textarea | Required, 10-2000 chars |
| Expected Answer | Textarea | Optional, max 3000 chars |
| Display Order | Number | Optional, default 0 |
| Active | Switch | Optional, default true |

### 4.2 Questions Page

**File:** `src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx`

**Header Section:**
- Title with breadcrumb
- Import / Export buttons
- "Add Question" button

**Filters Section:**
- Industry Segment dropdown (required for filtering)
- Expertise Level dropdown (required)
- Competency dropdown (required)
- Active/Inactive toggle

**Data Table (Per Project Knowledge patterns):**
| Column | Cell Renderer |
|--------|---------------|
| Question | Truncated text, max 80 chars |
| Expected Answer | Truncated text, max 60 chars |
| Industry | Badge |
| Level | Badge |
| Competency | Badge with color coding |
| Status | StatusBadge component |
| Actions | View, Edit, Restore/Deactivate, Delete |

**Pagination (Per memory/features/question-bank-ui-pagination):**
- Page size selector (10, 25, 50, 100)
- Page X of Y indicator
- Total count badge in header

### 4.3 Import Dialog

**File:** `src/pages/admin/interview-kit/InterviewKitImportDialog.tsx`

Following patterns from existing `QuestionImportDialogOptimized.tsx`:

**Features:**
- File upload with size validation (50MB max)
- Chunked Excel parsing with progress
- Validation preview table (virtualized for large datasets)
- Import modes: Add Only / Replace
- Progress tracking during import
- Error export ("Download Issues" button)

**Excel Template Columns:**
| Column | Required | Notes |
|--------|----------|-------|
| industry_segment | Yes | Must match existing |
| expertise_level | Yes | Must match existing |
| competency | Yes | Code or name |
| question_text | Yes | 10-2000 chars |
| expected_answer | No | Max 3000 chars |

### 4.4 Export Utilities

**File:** `src/pages/admin/interview-kit/InterviewKitExcelExport.ts`

```typescript
// Download empty template
export function downloadInterviewKitTemplate(): void;

// Export current data with optional filters
export function exportInterviewKitQuestions(
  questions: InterviewKitQuestion[],
  competencies: InterviewKitCompetency[],
  industrySegments: IndustrySegment[],
  expertiseLevels: ExpertiseLevel[]
): void;
```

---

## Phase 5: Update Existing Components

### 5.1 Enhance InterviewKitPage.tsx

Make competency cards clickable navigation:
```tsx
<Link to={`/admin/interview/kit/questions?competency=${competency.code}`}>
  <Card>
    {/* existing card content */}
    <Badge>{questionCount} questions</Badge>
  </Card>
</Link>
```

Add "Manage All Questions" button at top.

### 5.2 Add Route in App.tsx

```tsx
<Route
  path="/admin/interview/kit/questions"
  element={
    <AdminGuard>
      <InterviewKitQuestionsPage />
    </AdminGuard>
  }
/>
```

### 5.3 Update index.ts exports

```typescript
export { default as InterviewKitPage } from './InterviewKitPage';
export { InterviewKitQuestionsPage } from './InterviewKitQuestionsPage';
export { InterviewKitQuestionForm } from './InterviewKitQuestionForm';
export { InterviewKitImportDialog } from './InterviewKitImportDialog';
```

---

## File Creation Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/YYYYMMDD_create_interview_kit_tables.sql` | CREATE | Tables, indexes, RLS, seed data |
| `src/constants/interview-kit.constants.ts` | CREATE | Competency config, batch sizes |
| `src/constants/index.ts` | UPDATE | Add re-export |
| `src/hooks/queries/useInterviewKitQuestions.ts` | CREATE | All CRUD hooks |
| `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx` | CREATE | Create/Edit dialog |
| `src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx` | CREATE | Questions table page |
| `src/pages/admin/interview-kit/InterviewKitImportDialog.tsx` | CREATE | Excel import |
| `src/pages/admin/interview-kit/InterviewKitExcelExport.ts` | CREATE | Export utilities |
| `src/pages/admin/interview-kit/InterviewKitPage.tsx` | UPDATE | Add navigation, counts |
| `src/pages/admin/interview-kit/index.ts` | UPDATE | Add exports |
| `src/App.tsx` | UPDATE | Add route |

---

## Standards Compliance Checklist

### Database Layer (Per Project Knowledge Section 6)
- [x] snake_case table/column names
- [x] UUID primary keys with gen_random_uuid()
- [x] Audit fields: created_at, updated_at, created_by, updated_by
- [x] is_active for soft delete
- [x] display_order for sorting
- [x] Indexes on FKs and common query patterns
- [x] RLS enabled with appropriate policies

### Hook Layer (Per Section 6-7)
- [x] Type exports from Supabase types
- [x] withCreatedBy/withUpdatedBy for audit
- [x] handleMutationError for error handling
- [x] Query key pattern: ["entity", filters]
- [x] Cache configuration: staleTime/gcTime for reference data
- [x] Toast notifications via sonner

### Frontend Layer (Per Section 9)
- [x] AdminLayout wrapper
- [x] React Hook Form + Zod validation
- [x] Loading/empty/error/success states
- [x] DataTable with consistent patterns
- [x] StatusBadge for active/inactive

### Error Handling (Per Section 4)
- [x] handleMutationError() for all mutations
- [x] logWarning() instead of console.warn
- [x] Context object with operation field

### Security (Per Section 11)
- [x] RLS policies enforce platform_admin for mutations
- [x] Reviewers get read-only access to active questions
- [x] No public access to interview questions

---

## Implementation Order

1. **Database Migration** - Create tables, indexes, RLS, seed competencies
2. **Constants File** - Competency configuration
3. **Hooks File** - All CRUD operations
4. **Question Form** - Create/Edit dialog
5. **Questions Page** - Main table view
6. **Export Utilities** - Template + data export
7. **Import Dialog** - Excel import with validation
8. **Update Main Page** - Navigation and counts
9. **Add Route** - Wire up in App.tsx
10. **Update Exports** - index.ts barrel file
