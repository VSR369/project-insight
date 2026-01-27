
# Interview KIT Page Navigation Enhancement

## Current Status

The Interview KIT Question Bank is **fully implemented** with complete CRUD operations:

| Component | Status | Location |
|-----------|--------|----------|
| Database Tables | ✅ Done | `interview_kit_competencies`, `interview_kit_questions` |
| CRUD Hooks | ✅ Done | `src/hooks/queries/useInterviewKitQuestions.ts` |
| Question Form | ✅ Done | `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx` |
| Questions Page | ✅ Done | `src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx` |
| Import/Export | ✅ Done | `InterviewKitImportDialog.tsx`, `InterviewKitExcelExport.ts` |
| Routing | ✅ Done | `/admin/interview/kit/questions` in `App.tsx` |
| **Main Page Navigation** | ❌ Missing | `src/pages/admin/interview-kit/InterviewKitPage.tsx` |

---

## What's Missing

The main Interview KIT page (`/admin/interview/kit`) shows static competency cards but **doesn't link to the questions page**. Users cannot navigate from the overview to manage questions for each competency.

---

## Implementation Plan

### File to Update
`src/pages/admin/interview-kit/InterviewKitPage.tsx`

### Changes Required

1. **Add "Manage All Questions" Button**
   - Add button in header that navigates to `/admin/interview/kit/questions`
   - Consistent with other admin pages

2. **Make Competency Cards Clickable**
   - Wrap each card with `Link` from react-router-dom
   - Navigate to `/admin/interview/kit/questions?competency={code}`
   - Add hover effect to indicate clickability

3. **Show Question Counts per Competency**
   - Use the existing `useInterviewKitQuestionCounts()` hook
   - Display badge on each card showing the count
   - Map competency codes from database to display cards

4. **Update Competency Data Source**
   - Instead of hardcoded `universalCompetencies` array
   - Fetch from database using `useInterviewKitCompetencies()` 
   - Fallback to static data if loading/error
   - Use `COMPETENCY_CONFIG` constants for icons/colors

### Code Changes Summary

```tsx
// Before: Static cards, no links
const universalCompetencies = [/* hardcoded array */];

export default function InterviewKitPage() {
  return (
    <Card>
      {/* Static display only */}
    </Card>
  );
}

// After: Dynamic data, clickable cards with counts
import { Link } from "react-router-dom";
import { useInterviewKitCompetencies, useInterviewKitQuestionCounts } from "@/hooks/queries/useInterviewKitQuestions";
import { COMPETENCY_CONFIG } from "@/constants";

export default function InterviewKitPage() {
  const { data: competencies = [] } = useInterviewKitCompetencies();
  const { data: questionCounts = {} } = useInterviewKitQuestionCounts();

  return (
    <>
      {/* Header with "Manage All Questions" button */}
      <Button asChild>
        <Link to="/admin/interview/kit/questions">
          Manage All Questions
        </Link>
      </Button>

      {/* Clickable competency cards */}
      {competencies.map((comp) => (
        <Link 
          key={comp.id} 
          to={`/admin/interview/kit/questions?competency=${comp.code}`}
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <Icon className={config.color} />
              <CardTitle>{comp.name}</CardTitle>
              <Badge>{questionCounts[comp.code] || 0} questions</Badge>
            </CardHeader>
            <CardContent>
              <p>{comp.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}
```

### UI Enhancements

| Element | Before | After |
|---------|--------|-------|
| Header | Title only | Title + "Manage All Questions" button |
| Cards | Static display | Clickable with hover effect |
| Count | None | Badge showing question count |
| Data Source | Hardcoded array | Database via hooks |
| Icons/Colors | Hardcoded | From `COMPETENCY_CONFIG` constants |

---

## Standards Compliance

| Standard | Implementation |
|----------|----------------|
| Hooks at top level | ✅ All hooks before conditional returns |
| Error states | ✅ Loading skeleton, empty state handled |
| Navigation | ✅ react-router-dom Link component |
| Constants | ✅ Uses COMPETENCY_CONFIG from constants |
| Cache | ✅ Uses existing cached hooks |

---

## Files Changed

| File | Action |
|------|--------|
| `src/pages/admin/interview-kit/InterviewKitPage.tsx` | UPDATE - Add navigation, hooks, clickable cards |

---

## Testing Checklist

After implementation:
- [ ] "Manage All Questions" button navigates to questions page
- [ ] Each competency card is clickable
- [ ] Clicking a card pre-filters questions by that competency
- [ ] Question counts display correctly on each card
- [ ] Loading state shows skeleton while fetching
- [ ] Cards have hover effect indicating clickability
