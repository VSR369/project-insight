

# IP Model — AI Review, Suggested Selection & Display Fix

## Problems Identified

1. **View mode shows raw abbreviation** (e.g. "IP-EA") instead of full label ("Exclusive Assignment — All intellectual property transfers to the challenge seeker")
2. **Acceptance saves only the code** — the full label is lost on persistence, so the display reverts to abbreviation
3. **AI suggested selection is generic** — does not analyze challenge context (deliverables, maturity, IP sensitivity) to pick the most relevant IP model
4. **AI review comments lack selection guidelines** — should explain *why* a particular IP model is appropriate for this challenge

## Fix Plan

### 1. Display full IP Model label in view mode

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (lines 380-390)

Currently the section's `render` callback shows `ch.ip_model.replace(/_/g, " ")`. Change to look up the full label + description from master data options:

```tsx
render: (ch) => {
  if (!ch.ip_model) return <p className="text-sm text-muted-foreground">Not set.</p>;
  const opt = IP_MODEL_OPTIONS.find(o => o.value === ch.ip_model);
  return (
    <div className="space-y-1">
      <Badge variant="secondary">{opt?.label ?? ch.ip_model}</Badge>
      {opt?.description && <p className="text-xs text-muted-foreground">{opt.description}</p>}
    </div>
  );
}
```

Also pass `getLabel` and `getDescription` to the `CheckboxSingleSectionRenderer` at line 2564 so edit mode shows full labels in the dropdown and view mode resolves correctly.

### 2. Save full label on acceptance (not just code)

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (lines 1657-1683)

The `handleAcceptRefinement` for single-code sections saves `matched.value` (the abbreviation code). This is correct for DB storage (the column stores codes like "IP-EA"). The fix is in the **display** layer (step 1), not the storage layer — codes are the canonical DB format. No change needed here.

### 3. Enrich AI review prompts for IP Model

**File:** `src/lib/cogniblend/curationSectionFormats.ts` (line 100-107)

Update the `aiUsesContext` array to include additional challenge signals that inform IP model selection:

```ts
ip_model: {
  format: 'checkbox_single',
  masterDataTable: 'ip_models',
  aiCanDraft: true,
  aiReviewEnabled: true,
  curatorCanEdit: true,
  aiUsesContext: ['spec.ip_model', 'spec.deliverables', 'maturity_level', 'reward_structure', 'scope', 'evaluation_criteria'],
}
```

**File:** Edge function `review-challenge-sections` — update the IP model section system prompt to:
- Provide explicit guidelines for selecting each IP model type
- Analyze challenge deliverables, maturity level, and reward structure
- Recommend the most contextually appropriate IP model with justification
- Frame comments as actionable selection guidance (e.g., "Given that deliverables include proprietary algorithms and the challenge uses IP-EA maturity, Exclusive Assignment is recommended because...")

### 4. AI suggested selection must pick most relevant IP Model

**File:** Edge function `refine-challenge-section` — when `section_key === 'ip_model'`:
- Inject the full master data options (code + label + description) into the system prompt
- Include challenge context: deliverables, maturity level, scope, current IP model
- Instruct the LLM to analyze the challenge and return the single most appropriate IP model **code** (for DB compatibility)
- The response code is then resolved to full label in the UI via master data lookup

**File:** `src/components/cogniblend/shared/AIReviewInline.tsx` — the master-data rendering for `checkbox_single` sections already shows options with labels from `masterDataOptions`. Verify that when the AI returns a code, it renders the matching label + description (not the raw code) in the "AI Suggested Selection" panel.

## Files to Change

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Fix view-mode render to show full label + description; pass `getLabel`/`getDescription` to `CheckboxSingleSectionRenderer` |
| `src/lib/cogniblend/curationSectionFormats.ts` | Expand `aiUsesContext` for ip_model |
| `supabase/functions/review-challenge-sections` | Add IP model selection guidelines to system prompt |
| `supabase/functions/refine-challenge-section` | Inject master data options + challenge context for ip_model refinement |

## Result

- IP Model always displays full label + description (e.g. "Exclusive License — Solver grants exclusive license to seeker")
- AI review comments provide reasoning guidelines specific to the challenge
- AI suggested selection analyzes challenge context and picks the most relevant IP model
- Acceptance flow preserves canonical code in DB while UI resolves to full display

