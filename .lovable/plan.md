

# Interview Kit Section Display Order Fix

## Problem Summary

The Interview Kit sections are currently displayed in **random order** based on how they're inserted into the Map. The user expects a **specific display order** matching the screenshot:

| Order | Section Name | Section Type |
|-------|--------------|--------------|
| 1 | Domain & Delivery Depth | `domain` |
| 2 | Proof Points Deep-Dive | `proof_point` |
| 3 | Solution Design & Architecture Thinking | `competency` |
| 4 | Execution & Governance | `competency` |
| 5 | Data/Tech Readiness & Tooling Awareness | `competency` |
| 6 | Soft Skills for Solution Provider Success | `competency` |
| 7 | Innovation & Co-creation Ability | `competency` |

Additionally, the header text needs updating to match the screenshot hierarchy breadcrumb.

---

## Root Cause Analysis

The current code groups questions by `section_type::section_name` but **does not sort the Map entries** by display order. The `SECTION_DISPLAY_ORDER` constants exist (domain=100, proof_point=200, competency_base=300) but are only used for individual question ordering, not for section sorting.

---

## Technical Implementation

### File 1: `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx`

#### Change 1.1: Sort sections by display order when rendering

Currently the code iterates over the Map entries unsorted:
```typescript
Array.from(sectionedQuestions.entries()).map(([key, questions]) => { ... })
```

Need to **sort the entries** based on `SECTION_DISPLAY_ORDER`:

```typescript
// Define section sort order
const getSectionSortOrder = (sectionType: string, sectionName: string): number => {
  if (sectionType === SECTION_TYPE.domain) return SECTION_DISPLAY_ORDER.domain;
  if (sectionType === SECTION_TYPE.proof_point) return SECTION_DISPLAY_ORDER.proof_point;
  // For competencies, use the display_order from the first question in the section
  return SECTION_DISPLAY_ORDER.competency_base;
};

// Sort entries before rendering
const sortedSections = useMemo(() => {
  return Array.from(sectionedQuestions.entries()).sort(([keyA, questionsA], [keyB, questionsB]) => {
    const [typeA] = keyA.split('::');
    const [typeB] = keyB.split('::');
    
    // Primary sort by section type order
    const orderA = questionsA[0]?.display_order ?? 0;
    const orderB = questionsB[0]?.display_order ?? 0;
    
    return orderA - orderB;
  });
}, [sectionedQuestions]);
```

#### Change 1.2: Update header text to match screenshot

Current:
```typescript
<p className="text-sm text-muted-foreground">
  Auto-generated from Industry Segment → Expertise Level → Proficiencies
</p>
```

Update to:
```typescript
<p className="text-sm text-muted-foreground">
  Auto-generated from Industry Segment → Expertise Level → Proficiency Areas → Sub-domains → Specialities
</p>
```

---

### File 2: `src/constants/interview-kit-reviewer.constants.ts`

#### Change 2.1: Add competency-specific display order constants

Add a mapping for competency names to their exact display order:

```typescript
export const COMPETENCY_DISPLAY_ORDER: Record<string, number> = {
  'Solution Design & Architecture Thinking': 310,
  'Execution & Governance': 320,
  'Data/Tech Readiness & Tooling Awareness': 330,
  'Soft Skills for Solution Provider Success': 340,
  'Innovation & Co-creation Ability': 350,
} as const;
```

---

### File 3: `src/services/interviewKitGenerationService.ts`

#### Change 3.1: Use consistent display order for competencies

When generating competency questions, ensure `display_order` uses the competency's configured order:

```typescript
selected.forEach((q, idx) => {
  allQuestions.push({
    // ...
    display_order: SECTION_DISPLAY_ORDER.competency_base + (comp.display_order || 0) * 10 + idx,
    // ...
  });
});
```

This is already correct - each competency has a `display_order` from the database that gets incorporated.

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `InterviewKitTabContent.tsx` | Sort sections by first question's `display_order` | Ensures Domain → Proof Points → Competencies order |
| `InterviewKitTabContent.tsx` | Update header breadcrumb text | Match screenshot "...Sub-domains → Specialities" |
| `interview-kit-reviewer.constants.ts` | (Optional) Add `COMPETENCY_DISPLAY_ORDER` mapping | Explicit order fallback if needed |

---

## Expected Result

After implementation, the Interview Kit tab will display sections in this exact order:

1. **Domain & Delivery Depth** (blue, BookOpen icon)
2. **Proof Points Deep-Dive** (purple, Award icon)  
3. **Solution Design & Architecture Thinking** (amber, Lightbulb icon)
4. **Execution & Governance** (amber, Lightbulb icon)
5. **Data/Tech Readiness & Tooling Awareness** (amber, Lightbulb icon)
6. **Soft Skills for Solution Provider Success** (amber, Lightbulb icon)
7. **Innovation & Co-creation Ability** (amber, Lightbulb icon)

The header will show the full breadcrumb:
> "Auto-generated from Industry Segment → Expertise Level → Proficiency Areas → Sub-domains → Specialities"

