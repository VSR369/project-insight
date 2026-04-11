

## Add 4 Missing Sections to AI Review Waves

### Problem
The wave executor covers 27 sections but the curation UI defines 32. Four reviewable sections are missing from the AI pipeline: `creator_references`, `reference_urls`, `solver_audience`, and `evaluation_config`. The fifth (`creator_legal_instructions`) is correctly excluded as a read-only human directive.

### Root Cause
These 4 section keys do not exist in `SECTION_FORMAT_CONFIG` (the source of truth for `SectionKey` type). Adding them to `waveConfig.ts` without first registering them in the format config would cause a TypeScript compile error.

### Changes

**1. Register 4 new sections in `SECTION_FORMAT_CONFIG`**

File: `src/lib/cogniblend/curationSectionFormats.ts`

Add entries for each new section with appropriate AI review settings:

```text
creator_references  → format: 'custom', aiCanDraft: false, aiReviewEnabled: true, curatorCanEdit: true
reference_urls      → format: 'custom', aiCanDraft: false, aiReviewEnabled: true, curatorCanEdit: true
solver_audience     → format: 'radio',  aiCanDraft: false, aiReviewEnabled: true, curatorCanEdit: true
evaluation_config   → format: 'structured_fields', aiCanDraft: false, aiReviewEnabled: true, curatorCanEdit: true
```

All four have `aiCanDraft: false` (AI should review but not generate these from scratch — they are Creator-authored inputs).

**2. Add sections to Wave 6 in `waveConfig.ts`**

File: `src/lib/cogniblend/waveConfig.ts`

Expand Wave 6 `sectionIds` from 5 to 9:
```ts
sectionIds: [
  'hook', 'visibility', 'domain_tags',
  'creator_references', 'reference_urls',
  'evaluation_config', 'solver_audience',
  'legal_docs', 'escrow_funding',
],
```

Update the comment from "26 curation sections" to "31 curation sections".

**3. Add section descriptions to edge function**

File: `supabase/functions/review-challenge-sections/index.ts`

Add 4 entries to `CURATION_SECTIONS` array under Wave 6:
- `creator_references`: "Reference documents provided by the challenge creator — verify relevance to scope and accessibility for solvers"
- `reference_urls`: "Reference URLs provided by the creator — verify they are active, relevant, and appropriately scoped"
- `evaluation_config`: "Evaluation method (single vs Delphi panel) and blind review setting — must match complexity level and eligibility"
- `solver_audience`: "Solver audience targeting (internal/external/all) — verify consistency with operating model and expertise requirements"

**4. Add wave context entries**

File: `supabase/functions/review-challenge-sections/contextIntelligence.ts`

Add `SECTION_WAVE_CONTEXT` entries for the 4 new sections:
- `creator_references` — Wave 6, strategic role: verify Creator-provided materials are relevant and don't contradict the refined specification
- `reference_urls` — Wave 6, verify URLs are active and domain-relevant
- `solver_audience` — Wave 6, verify AGG/MP consistency with operating model
- `evaluation_config` — Wave 6, verify Delphi panel size matches complexity, blind review matches governance mode

**5. Handle `creator_references` in `determineSectionAction`**

File: `src/lib/cogniblend/waveConfig.ts`

`creator_references` has no `dbField` and uses attachments. The current `determineSectionAction` checks content from the store, which may be null for attachment-based sections. Add `creator_references` to the `LOCKED_SECTIONS`-like handling: if content is null, action should be `'review'` (not `'generate'`), since the AI should still check whether attachments exist and are relevant. This requires a small tweak to treat attachment-based sections as always-review.

### Files changed

| File | Action |
|------|--------|
| `src/lib/cogniblend/curationSectionFormats.ts` | Add 4 section format configs |
| `src/lib/cogniblend/waveConfig.ts` | Add 4 sections to Wave 6, update comment, handle attachment sections |
| `supabase/functions/review-challenge-sections/index.ts` | Add 4 section descriptions to `CURATION_SECTIONS` |
| `supabase/functions/review-challenge-sections/contextIntelligence.ts` | Add 4 `SECTION_WAVE_CONTEXT` entries |

