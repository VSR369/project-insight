

# Add Template, Import, Export Buttons to Interview KIT Main Page

## Overview
Add Template download, Import, and Export buttons to the Interview KIT main dashboard page (`/admin/interview/kit`) to allow admins to manage questions directly from this screen without navigating to the Questions sub-page.

## Current State
- **Main page** (`InterviewKitPage.tsx`): Shows competency cards with question counts. Only has "Manage All Questions" button.
- **Questions page** (`InterviewKitQuestionsPage.tsx`): Has Template, Import, Export, and Add Question buttons.
- **Existing utilities**: `InterviewKitExcelExport.ts` and `InterviewKitImportDialog.tsx` already exist and can be reused.

## Design Reference (from screenshot)
The user wants the buttons in the header area alongside "Manage All Questions":
- Download Template
- Import
- Export

## Implementation

### File: `src/pages/admin/interview-kit/InterviewKitPage.tsx`

**Changes:**

1. **Add required imports:**
   - `Download`, `FileUp` icons from lucide-react
   - `useState` hook for import dialog state
   - `useInterviewKitQuestions` hook to fetch all questions for export
   - `downloadInterviewKitTemplate`, `exportInterviewKitQuestions` from `./InterviewKitExcelExport`
   - `InterviewKitImportDialog` component

2. **Add state for import dialog:**
   ```tsx
   const [importOpen, setImportOpen] = useState(false);
   ```

3. **Add data hook for all questions (needed for export):**
   ```tsx
   const { data: allQuestions = [] } = useInterviewKitQuestions({ includeInactive: true });
   ```

4. **Add export handler:**
   ```tsx
   const handleExport = () => {
     exportInterviewKitQuestions(allQuestions, competencies);
   };
   ```

5. **Update header buttons section:**
   ```tsx
   <div className="flex items-center gap-2">
     <Button variant="outline" size="sm" onClick={downloadInterviewKitTemplate}>
       <Download className="mr-2 h-4 w-4" />
       Template
     </Button>
     <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
       <FileUp className="mr-2 h-4 w-4" />
       Import
     </Button>
     <Button variant="outline" size="sm" onClick={handleExport} disabled={allQuestions.length === 0}>
       <Download className="mr-2 h-4 w-4" />
       Export
     </Button>
     <Button asChild>
       <Link to="/admin/interview/kit/questions">
         <Settings className="mr-2 h-4 w-4" />
         Manage All Questions
       </Link>
     </Button>
   </div>
   ```

6. **Add Import Dialog at the end of the component (before closing AdminLayout):**
   ```tsx
   <InterviewKitImportDialog
     open={importOpen}
     onOpenChange={setImportOpen}
   />
   ```

## Visual Layout After Change

```
┌──────────────────────────────────────────────────────────────────────┐
│ Interview KIT                                                         │
│ Universal competencies assessed...                                    │
│                                                                       │
│         [Template] [Import] [Export] [⚙ Manage All Questions]        │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ 💡 Solution Design & Architecture Thinking        1 question > │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ ⚙ Execution & Governance                         0 questions > │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ ...                                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

## Files to Change

| File | Change |
|------|--------|
| `src/pages/admin/interview-kit/InterviewKitPage.tsx` | Add imports, state, data hook, handlers, buttons, and Import dialog |

## Technical Notes

- **Reuses existing utilities**: No duplication of import/export logic
- **Hook already exists**: `useInterviewKitQuestions` with pagination is already implemented
- **Import dialog is self-contained**: Already handles all phases (upload, validate, preview, import, complete)
- **Export includes inactive**: Setting `includeInactive: true` ensures full export for backup purposes

## Testing Checklist

- [ ] Template button downloads `interview_kit_template_YYYY-MM-DD.xlsx`
- [ ] Import button opens the import dialog
- [ ] Import dialog allows file selection and import flow works
- [ ] Export button downloads `interview_kit_questions_YYYY-MM-DD.xlsx`
- [ ] Export button is disabled when there are no questions
- [ ] All buttons are styled consistently with "Manage All Questions"
- [ ] Page still shows loading skeletons while data loads
- [ ] Competency cards still link to filtered questions view

