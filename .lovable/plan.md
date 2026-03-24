

# Move Extended Brief to Its Own Group Adjacent to Publication

## Current State
The `GROUPS` array in `CurationReviewPage.tsx` has 4 groups: Content, Evaluation, Legal & Finance, Publication. `extended_brief` is currently buried inside the "Content" group alongside problem_statement, scope, deliverables, etc.

## Change

**File: `src/pages/cogniblend/CurationReviewPage.tsx` (lines 703-736)**

1. Remove `"extended_brief"` from the `content` group's `sectionKeys`
2. Insert a new group **"Extended Brief"** between Content and Evaluation (or right before Publication — user said "adjacent to Publication", so place it just before Publication):

```typescript
const GROUPS: GroupDef[] = [
  {
    id: "content",
    label: "Content",
    colorDone: "bg-emerald-100 text-emerald-800 border-emerald-300",
    colorActive: "bg-emerald-50 border-emerald-400",
    colorBorder: "border-emerald-200",
    sectionKeys: ["problem_statement", "scope", "deliverables", "expected_outcomes", "submission_guidelines", "maturity_level", "hook"],
  },
  {
    id: "extended_brief",
    label: "Extended Brief",
    colorDone: "bg-violet-100 text-violet-800 border-violet-300",
    colorActive: "bg-violet-50 border-violet-400",
    colorBorder: "border-violet-200",
    sectionKeys: ["extended_brief"],
  },
  {
    id: "evaluation",
    label: "Evaluation",
    ...existing...
  },
  {
    id: "legal_finance",
    label: "Legal & Finance",
    ...existing...
  },
  {
    id: "publication",
    label: "Publication",
    ...existing...
  },
];
```

This makes Extended Brief a top-level group menu item. When clicked, it expands to show all 7 subsections (context_and_background, root_causes, etc.) via the existing `ExtendedBriefDisplay` component which already renders nested `CuratorSectionPanel` children.

No other files need changes — the rendering logic already handles Extended Brief as a special case with its nested subsections.

