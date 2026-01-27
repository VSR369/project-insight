

# Modified Interview Kit Functionality Removal Plan

## Scope Summary

This plan removes **Interview Kit functionality from the reviewer's perspective** while preserving:
- ✅ **Admin sidebar** "Interview KIT" menu item
- ✅ **Admin Interview Kit pages** (question bank management)
- ✅ **`interview_kit_questions`** table and data (master question bank)
- ✅ **`interview_kit_competencies`** table and data
- ✅ Existing tabs structure (keep Expertise, Proof Points, Assessment, Slots tabs)
- ✅ Other reviewer functionality
- ✅ Interview scheduling/booking functionality

---

## Files to DELETE (Reviewer Functionality Only)

### 1. Reviewer Interview Kit Components (10 files)
```
src/components/reviewer/interview-kit/
├── AddQuestionDialog.tsx        ← DELETE
├── DeleteQuestionConfirm.tsx    ← DELETE
├── EditQuestionDialog.tsx       ← DELETE
├── InterviewKitScoreHeader.tsx  ← DELETE
├── InterviewKitScoringLogic.tsx ← DELETE
├── InterviewKitSection.tsx      ← DELETE
├── InterviewKitSubmitFooter.tsx ← DELETE
├── InterviewKitTabContent.tsx   ← DELETE
├── InterviewQuestionCard.tsx    ← DELETE
└── index.ts                     ← DELETE
```

### 2. Interview Kit Generation Service
```
src/services/interviewKitGenerationService.ts  ← DELETE
```

### 3. Interview Kit Reviewer Hooks
```
src/hooks/queries/useInterviewKit.ts           ← DELETE
```

### 4. Interview Kit Reviewer Constants
```
src/constants/interview-kit-reviewer.constants.ts ← DELETE
```

---

## Files to KEEP (Admin Functionality)

### Admin Pages (KEEP ALL)
```
src/pages/admin/interview-kit/
├── InterviewKitExcelExport.ts      ← KEEP
├── InterviewKitImportDialog.tsx    ← KEEP
├── InterviewKitPage.tsx            ← KEEP
├── InterviewKitQuestionForm.tsx    ← KEEP
├── InterviewKitQuestionsPage.tsx   ← KEEP
└── index.ts                        ← KEEP
```

### Admin Hooks (KEEP)
```
src/hooks/queries/useInterviewKitQuestions.ts  ← KEEP (used by admin pages)
```

### Admin Constants (KEEP)
```
src/constants/interview-kit.constants.ts       ← KEEP (used by admin pages)
```

### Admin Sidebar (NO CHANGE)
```
src/components/admin/AdminSidebar.tsx          ← NO CHANGE (keep Interview KIT menu item)
```

### App Routes (NO CHANGE to admin routes)
```
src/App.tsx                                    ← KEEP admin routes for /admin/interview/kit
```

---

## Files to MODIFY

### 1. `src/pages/reviewer/CandidateDetailPage.tsx`
**Remove:**
- Import: `import { InterviewKitTabContent } from "@/components/reviewer/interview-kit";`
- Tab content: The `<TabsContent value="interview-kit">` block with `InterviewKitTabContent`

**Replace with:** Placeholder tab content showing "Interview Kit - Coming Soon"

### 2. `src/constants/index.ts`
**Remove only:**
- `export * from './interview-kit-reviewer.constants';`

**KEEP:**
- `export * from './interview-kit.constants';` (used by admin pages)

---

## Database Cleanup (SQL Commands)

Execute these SQL commands to clear corrupted reviewer-side data only:

```sql
-- 1. Delete all interview question responses (reviewer-generated, corrupted)
DELETE FROM interview_question_responses;

-- 2. Delete all interview evaluations (reviewer-generated, corrupted)
DELETE FROM interview_evaluations;

-- 3. KEEP interview_kit_questions table (admin master question bank)
-- 4. KEEP interview_kit_competencies table (admin competency definitions)
-- 5. KEEP all admin interview kit data intact
```

---

## Summary of Changes

| Category | Files Deleted | Files Modified | Files Kept |
|----------|---------------|----------------|------------|
| Reviewer Components | 10 | 0 | 0 |
| Admin Pages | 0 | 0 | 6 |
| Services | 1 | 0 | 0 |
| Reviewer Hooks | 1 | 0 | 0 |
| Admin Hooks | 0 | 0 | 1 |
| Reviewer Constants | 1 | 0 | 0 |
| Admin Constants | 0 | 0 | 1 |
| Tabs | 0 | 1 | 0 |
| Constants Index | 0 | 1 | 0 |
| Admin Sidebar | 0 | 0 | 1 |
| App Routes | 0 | 0 | 1 |
| **TOTAL** | **13 files** | **2 files** | **10 files** |

---

## What Will Remain

After deletion:

### Admin Portal
1. **Interview KIT menu item** → Still visible in Admin sidebar ✅
2. **Interview KIT pages** → Fully functional (question bank CRUD, import/export) ✅
3. **`interview_kit_questions` data** → All 100+ questions preserved ✅
4. **`interview_kit_competencies` data** → All 5 competencies preserved ✅

### Reviewer Portal
1. **Interview Kit tab** → Shows "Coming Soon" placeholder
2. **All other tabs** → Unchanged (Provider Details, Expertise, Proof Points, Assessment, Slots)

---

## Post-Deletion State

### Admin Sidebar (UNCHANGED)
- Dashboard
- Master Data (Countries, Industry Segments, etc.)
- Taxonomy Management
- **Interview Setup**
  - **Interview KIT** ✅ (kept)
  - Quorum Requirements
  - Reviewer Availability
  - Reviewer Approvals
- Other (Question Bank, Capability Tags, etc.)

### Reviewer Candidate Detail Page
- Provider Details ✅
- Expertise ✅
- Proof Points ✅
- Assessment ✅
- Slots ✅
- Interview Kit → "Coming Soon" placeholder
- Review Progress → Disabled (as before)

You can then rebuild the Reviewer Interview Kit from scratch with your specifications, using the existing admin question bank as the data source.

