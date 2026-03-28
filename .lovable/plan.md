

# Render Solver Expertise AI Suggestion as Structured Tree

## Problem

The AI suggestion for `solver_expertise` returns a JSON object with `proficiency_areas`, `sub_domains`, and `specialities` arrays. Since the section format is `custom`, it falls through to the default `rich_text` renderer (line 1048), which dumps the raw JSON into a RichTextEditor — completely unreadable (as shown in the screenshot).

After acceptance, the view mode already renders nicely with badges. The fix is to add a custom renderer in the AI suggestion panel.

## Changes

### 1. Add solver expertise tree renderer in `AIReviewResultPanel.tsx`

**Between the `rewardData` check (line 949) and the `hasDeliverableCards` check (line 991)**, add a new branch that detects `sectionKey === "solver_expertise"` and parses the `result.suggested_version` JSON.

Parse the suggested version to extract:
- `expertise_levels?: {id, name}[]`
- `proficiency_areas?: {id, name}[]`
- `sub_domains?: {id, name}[]`
- `specialities?: {id, name}[]`

Render as a **read-only collapsible tree** matching the manual selection view format:
- Each level gets a labeled row with badges
- Empty arrays show "All [Level Name]" badge (matching view mode)
- Tree hierarchy uses indentation and icons consistent with `SolverExpertiseSection` view mode

Add a `useMemo` block (near lines 532-559 where other format-specific parsers live) to detect and parse solver expertise data:

```typescript
const solverExpertiseData = useMemo(() => {
  if (sectionKey !== "solver_expertise" || !result.suggested_version) return null;
  const cleaned = result.suggested_version.trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as {
        expertise_levels?: {id: string; name: string}[];
        proficiency_areas?: {id: string; name: string}[];
        sub_domains?: {id: string; name: string}[];
        specialities?: {id: string; name: string}[];
      };
    }
  } catch {}
  return null;
}, [sectionKey, result.suggested_version]);
```

**Rendering block** — structured card with four labeled rows:

```
Expertise Levels:    [Badge] [Badge] ...  (or "All Levels" badge)
Proficiency Areas:   [Badge] [Badge] ...  (or "All Areas" badge)
Sub-domains:         [Badge] [Badge] ...  (or "All Sub-domains" badge)
Specialities:        [Badge] [Badge] ...  (or "All Specialities" badge)
```

Each row uses the same styling as `SolverExpertiseSection` view mode (lines 324-378): `text-xs font-medium text-muted-foreground` labels, `Badge variant="outline"` for items.

### 2. Update `hasSuggestedVersion` to include solver expertise

Add `solverExpertiseData` to the check at line 575-584 so the suggestion panel renders.

### 3. Update `suggestedFormat` detection

Add a check before the `rich_text` fallback: if `solverExpertiseData` exists, return `"solver_expertise"` format.

### 4. Seed the `onSuggestedVersionChange` for solver expertise

Add a `useEffect` (near lines 602-641) that emits the parsed JSON string to the parent when solver expertise data is detected, so acceptance works correctly with the existing handler.

### 5. No changes to acceptance logic

The existing acceptance handler at line 1594-1608 in `CurationReviewPage.tsx` already correctly parses JSON and saves as structured data. After acceptance, the `SolverExpertiseSection` view mode (lines 309-382) already renders the tree with badges.

## Result

- AI suggestion shows a clean, labeled badge layout matching the manual selection format
- "All [Level]" badges shown when a category is empty
- Accept button saves the structured data identically to manual selection
- View mode after acceptance displays the same tree format as manual editing

