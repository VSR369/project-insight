

## Fix: 6 Confirmed Bugs in Curation AI Review Accept Flow

### Bug 1 — `table_fallback` blocks Accept button

**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx` (line 185)

The Accept button is disabled when `suggestedFormat === "table_fallback"`. This means if `parseTableRows()` fails on valid-but-slightly-malformed JSON, the curator is locked out.

**Fix:** Remove the `table_fallback` disable condition. When format is `table_fallback`, the raw `suggested_version` string is still available and can be accepted as rich text fallback. Change the disabled condition to only check `isRefining`.

### Bug 2 — `reference_urls` overwrites entire `extended_brief`

**File:** `src/components/cogniblend/curation/SectionPanelItem.tsx` (line 195) and `src/lib/cogniblend/curationSectionFormats.ts`

`reference_urls` has `dbField: 'extended_brief'` in section defs but is NOT in `EXTENDED_BRIEF_FIELD_MAP`. So `SectionPanelItem` routes it to `handleAcceptRefinement` instead of `handleAcceptExtendedBriefRefinement`, which then saves raw content directly to the `extended_brief` column — wiping all other subsections.

**Fix:** Add `reference_urls: 'reference_urls'` to `EXTENDED_BRIEF_FIELD_MAP` in `curationSectionFormats.ts`. Also add a `reference_urls` case in `getSectionContent` in `curationParsers.ts`.

### Bug 3 — `solver_audience` and `evaluation_config` missing from `getSectionContent`

**File:** `src/lib/cogniblend/curationParsers.ts`

These sections exist in `SECTION_FORMAT_CONFIG` but have no case in `getSectionContent`, so the AI review receives `null` content and treats them as empty.

**Fix:** Add cases:
- `solver_audience`: return `ch.solver_audience`
- `evaluation_config`: return a JSON string of `{ evaluation_method, evaluator_count, is_blind_review }` from `ChallengeData`

### Bug 4 — `success_metrics_kpis` and `data_resources_provided` already handled

Looking at lines 116-117 of `curationParsers.ts`, these ARE already in `getSectionContent`. **This bug is already fixed.** No change needed.

### Bug 5 — `isStructuredSection` only checks `line_items`

**File:** `src/components/cogniblend/shared/aiReviewInlineHelpers.ts` (line 27)

`isStructuredSection` returns `true` only for `line_items`, missing `table` and `schedule_table`. This means checkbox selection and "Accept N items" count don't work for table sections.

**Fix:** Expand the check: `return ['line_items', 'table', 'schedule_table'].includes(fmt.format)`

### Bug 6 — `normalizeDomainTags` doesn't unwrap `{tags: [...]}`

**File:** `src/lib/cogniblend/normalizeAIContent.ts` (line 115-122)

If AI returns `{"tags": ["a","b"]}`, `parseJsonSafe` produces an object. `normalizeDomainTags` checks `!Array.isArray(value)` and returns the object unchanged — saving wrong shape to DB.

**Fix:** Before the array check, unwrap common wrapper keys: if `value` is an object with a `tags`, `items`, or `domain_tags` array property, extract that array.

---

### Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `AIReviewResultPanel.tsx` | Remove `table_fallback` disable on Accept |
| 2 | `curationSectionFormats.ts` | Add `reference_urls` to `EXTENDED_BRIEF_FIELD_MAP` |
| 3 | `curationParsers.ts` | Add `solver_audience`, `evaluation_config`, `reference_urls` to `getSectionContent` |
| 4 | — | Already fixed, no change |
| 5 | `aiReviewInlineHelpers.ts` | Expand `isStructuredSection` to include `table`/`schedule_table` |
| 6 | `normalizeAIContent.ts` | Unwrap `{tags:[...]}` wrapper in `normalizeDomainTags` |

