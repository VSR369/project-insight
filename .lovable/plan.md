

# Fix Missing Edit Button on Solver Expertise Requirements Section

## Problem

The Solver Expertise Requirements section in the curation page doesn't show an Edit button consistent with other sections. Two issues:

1. **No external Edit button**: Unlike other sections (problem_statement, deliverables, etc.) which add `{canEdit && !isEditing && <Button>Edit</Button>}` after their renderer, the `solver_expertise` case only renders `SolverExpertiseSection` without an external Edit button.

2. **Null industry segment blocks all editing**: If `challenge.eligibility` doesn't contain `industry_segment_id`, the component returns early with "No industry segment configured" and provides zero editing capability.

## Fix

### File: `src/pages/cogniblend/CurationReviewPage.tsx`

**Add an external Edit button** after the `SolverExpertiseSection`, matching the pattern used by other sections. Wire it to the page-level `editingSection` state, and pass `isEditing` into the component so it opens in edit mode when triggered from the panel.

In the `solver_expertise` case (~line 2762), change:
```tsx
case "solver_expertise": {
  const targeting = parseJson<any>(challenge.eligibility);
  const industrySegId = targeting?.industry_segment_id ?? null;
  return (
    <>
      <SolverExpertiseSection
        data={challenge.solver_expertise_requirements}
        industrySegmentId={industrySegId}
        readOnly={isReadOnly}
        editing={isEditing}
        onSave={(expertiseData) => {
          setSavingSection(true);
          saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: expertiseData });
          setEditingSection(null);
        }}
        saving={savingSection}
        onCancel={cancelEdit}
      />
      {canEdit && !isEditing && industrySegId && (
        <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
          <Pencil className="h-3 w-3 mr-1" />Edit
        </Button>
      )}
    </>
  );
}
```

### File: `src/components/cogniblend/curation/SolverExpertiseSection.tsx`

**Add `editing` and `onCancel` props** to allow the parent page to control edit state (matching the pattern of other renderers). The component should respect external `editing` prop alongside its internal state:

- Add `editing?: boolean` and `onCancel?: () => void` to `SolverExpertiseSectionProps`
- Use `editing` prop to enter edit mode when the parent triggers it
- Call `onCancel` when cancel is clicked (alongside internal state reset)
- Remove the internal "Edit Expertise Requirements" ghost button (edit is now triggered from the parent)

## Result

- Edit button appears below the section content, consistent with all other sections
- Clicking Edit opens the taxonomy tree editor
- Save/Cancel work through the parent page state as expected

