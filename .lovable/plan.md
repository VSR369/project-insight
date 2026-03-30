

# Refined Implementation Plan: Challenge Curator AI Pipeline — 15 Fixes

All 12 bugs from the external audit + 3 additional bugs from Lovable's audit, with **3 refinements** applied as requested.

---

## File 1: `src/components/cogniblend/shared/AIReviewInline.tsx`

### Fix 1 (BUG 1 + C8): Re-review passes full context
**Refinement applied:** Widen `challengeContext` type from `{ title?; maturity_level?; domain_tags? }` to `Record<string, any>` in `AIReviewInlineProps` (line 89-93). The parent (`CurationReviewPage.tsx` line 3353) already passes a richer object — the narrow type was silently discarding fields.

At line 89-93, replace the type:
```typescript
challengeContext: Record<string, any>;
```

At line 454-456, update the invoke body:
```typescript
body: {
  challenge_id: challengeId,
  section_key: sectionKey,
  role_context: roleContext,
  wave_action: currentContent?.trim()?.length > 30 ? 'review' : 'generate',
  current_content: currentContent,
  context: challengeContext ? {
    ...challengeContext,
    maturityLevel: challengeContext.maturity_level,
    todaysDate: new Date().toISOString().split('T')[0],
  } : undefined,
},
```

### Fix 2 (C10): Preserve comment metadata on edit
At line 399-404, update `handleCommentChange` to preserve structured comment objects:
```typescript
const handleCommentChange = useCallback((index: number, value: string) => {
  setEditedComments((prev) => {
    const updated = [...prev];
    const original = prev[index] ?? (review?.comments?.[index]);
    updated[index] = (original && typeof original === 'object')
      ? { ...original, text: value }
      : value;
    return updated;
  });
}, [review?.comments]);
```

---

## File 2: `src/hooks/useWaveExecutor.ts`

### Fix 3 (BUG 3): Conditional write for generated content
After line 116, add:
```typescript
// For GENERATED sections (empty → AI created content), write to section data
// so downstream waves can reference it. Safe: no human content to corrupt.
if ((normalized as any).status === 'generated' && parsedSuggestion != null) {
  store.getState().setSectionData(sectionKey, parsedSuggestion);
}
```

### Fix 4 (BUG 12): Wave error status
Line 223: change to `? 'error' : 'completed'`.

---

## File 3: `supabase/functions/review-challenge-sections/index.ts`

### Fix 5 (BUG 2): Per-batch model selection
**Refinement applied:** Keep a `defaultModel` variable for the complexity call, then compute per-batch model inside the loop.

At line 1073, rename to:
```typescript
const defaultModel = globalConfig?.default_model || 'google/gemini-3-flash-preview';
```

At line 1077, use `defaultModel` (or inline `getModelForRequest(['complexity'], globalConfig)`):
```typescript
? callComplexityAI(LOVABLE_API_KEY, getModelForRequest(['complexity'], globalConfig), challengeData, adminClient, clientContext)
```

Inside the batch loop (line 1095), before `callAIBatchTwoPass`:
```typescript
const batchKeys = batch.map(b => b.key);
const modelToUse = getModelForRequest(batchKeys, globalConfig);
```

---

## File 4: `src/pages/cogniblend/CurationReviewPage.tsx`

### Fix 6 (BUG 4): Robust JSON extraction before accept
Before the `jsonMatch` regex (~line 1958), add pre-processing:
- Strip leading prose before first `[` or `{`
- Strip trailing prose after last `]` or `}`
- Attempt repair (trailing commas)
- Double try-catch with repaired version

### Fix 7 (BUG 5): Evaluation criteria — add missing aliases
At the normalizer (~line 2003), add: `c.parameter`, `c.weight_percent`, `c.scoring_type`, `c.evaluator_role` as alias sources. Add `scoring_method` and `evaluator_role` output fields.

### Fix 8 (A2): `data_resources_provided` field normalization
After the KPI normalizer, add canonical mapping:
```typescript
if (dbField === 'data_resources_provided' && Array.isArray(rawArr)) {
  valueToSave = rawArr.map((row: any) => ({
    resource: row.resource ?? row.name ?? row.resource_name ?? "",
    type: row.type ?? row.data_type ?? row.resource_type ?? "",
    format: row.format ?? "",
    size: row.size ?? "",
    access_method: row.access_method ?? row.access ?? "",
    restrictions: row.restrictions ?? row.restriction ?? "",
  }));
}
```

### Fix 9 (BUG 8): Extended brief — direct parse before regex
In `handleAcceptExtendedBriefRefinement` (~line 2124), try `JSON.parse(cleaned)` directly before the regex extraction fallback.

### Fix 10 (BUG 9): Reward structure — robust tier extraction
Handle `tier`/`prize_tier`/`tier_name` keys and string amounts like `"$75,000"` via `Number(rawAmount.replace(/[$,]/g, ''))`.

### Fix 11 (BUG 10): Solver expertise — array handling
If AI returns an array, wrap in `{ expertise_areas: [...] }`.

### Fix 12 (BUG 11): Domain tags — basic validation
Filter to strings-only, reject empty arrays with toast.

### Fix 13 (B6): Derive HTML_TEXT_FIELDS from config
Replace hardcoded `['problem_statement', 'scope', 'hook']` with:
```typescript
const HTML_TEXT_FIELDS = Object.entries(SECTION_FORMAT_CONFIG)
  .filter(([, cfg]) => cfg.format === 'rich_text')
  .map(([key]) => key);
```

---

## File 5: `supabase/functions/review-challenge-sections/promptTemplate.ts`

### Fix 14 (D1): Per-section format instructions in Pass 2
**Refinement applied:** Exact code specified. After the per-section enrichment block (after line 622, before the TABLE FORMAT RULE), inject per-section format instruction using the existing `getSuggestionFormatInstruction` helper:

```typescript
// Per-section format instruction (ensures Pass 2 knows exact output shape)
const formatRule = getSuggestionFormatInstruction(config.section_key);
if (formatRule) {
  prompt += `\nOUTPUT FORMAT: ${formatRule}\n`;
}
```

This ensures:
- `root_causes` → "JSON array of short phrase strings, max 8 items"
- `affected_stakeholders` → "JSON array of row objects with keys stakeholder_name, role, impact_description, adoption_challenge"
- `evaluation_criteria` → "JSON array of row objects using exact column keys"
- All other sections get their generic format instruction from `FORMAT_INSTRUCTIONS`

---

## File 6: `src/lib/cogniblend/curationSectionFormats.ts`

### Fix 15 (BUG 5 alignment): Evaluation criteria columns
Update columns to match canonical schema:
```typescript
columns: ['criterion_name', 'weight_percentage', 'description', 'scoring_method', 'evaluator_role'],
```

---

## Post-Implementation

- Redeploy edge function `review-challenge-sections`
- Run verification matrix (12 tests from plan)

---

## Verification Matrix

| Test | Validates |
|---|---|
| Re-review on empty section → generates content | Fix 1, 3 |
| Re-review on filled section → reviews with full context | Fix 1 |
| Global review → critical sections use premium model | Fix 5 |
| Accept evaluation_criteria → canonical fields saved | Fix 7, 15 |
| Accept data_resources_provided → canonical fields saved | Fix 8 |
| Accept affected_stakeholders → canonical fields saved | Already done |
| Accept reward_structure with "$75,000" string amounts | Fix 10 |
| Accept solver_expertise when AI returns array | Fix 11 |
| Accept domain_tags → only valid strings saved | Fix 12 |
| Wave with errors shows amber/error status | Fix 4 |
| Empty challenge → Wave 2 sees Wave 1 generated content | Fix 3 |
| Table section re-review → correct format in Pass 2 | Fix 14 |

