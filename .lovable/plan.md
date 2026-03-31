

# Fix: Creator Data Flow to Curator — Complete Diagnosis and Resolution

## Problems Found

### Problem 1: `useSubmitSolutionRequest` Overwrites `extended_brief`
**File:** `src/hooks/cogniblend/useSubmitSolutionRequest.ts` (lines 100-103)

When a challenge is created, `useSubmitSolutionRequest` writes:
```js
extended_brief: {
  ...(payload.beneficiariesMapping ? { beneficiaries_mapping: ... } : {}),
  ...(payload.templateId ? { challenge_template_id: ... } : {}),
}
```
This is a plain object with NO Creator context fields (context_background, root_causes, etc.).

Then in `ConversationalIntakePage`, a SECOND save via `saveStep.mutateAsync()` writes the actual `extended_brief` with context fields. However, this second write completely **replaces** (not merges) the first write's data — so `beneficiaries_mapping` and `challenge_template_id` are lost.

More critically, the `beneficiariesMapping` field IS passed in the SubmitPayload but the context fields are NOT. The Creator's context_background, root_causes, etc. are only saved via the separate `saveStep` call — creating a fragile two-step write where the second step's `extended_brief` spread is conditional.

### Problem 2: `useSubmitSolutionRequest` Missing Key Creator Fields
The `SubmitPayload` interface doesn't include:
- `context_background`
- `root_causes`
- `affected_stakeholders`
- `scope_definition`
- `preferred_approach`
- `approaches_not_of_interest`

These are passed to `saveStep` separately, but the `saveStep` mutation strips `governance_profile` and `operating_model` (IMMUTABLE_AFTER_CREATION list), so those fields from the ConversationalIntakePage's saveStep call are silently dropped.

### Problem 3: Store Hydration Doesn't Decompose `extended_brief`
**File:** `src/hooks/useCurationStoreHydration.ts`

The `CHALLENGE_FIELD_TO_SECTION` mapping maps `extended_brief` → `'extended_brief'` as a single blob. But the Curation UI treats subsections (`context_and_background`, `root_causes`, etc.) as individual store entries. The hydration never decomposes the JSONB blob into individual subsection entries in the Zustand store.

This means even when `extended_brief.context_background` exists in the DB, it won't appear as editable content in the curation store sections.

### Problem 4: `useCurationStoreSync` Can't Save Subsections Back
**File:** `src/hooks/useCurationStoreSync.ts`

The `SECTION_DB_FIELD_MAP` has `extended_brief: 'extended_brief'` but no entries for `context_and_background`, `root_causes`, etc. When a curator edits these subsections, changes to individual subsection store entries won't be persisted back to the `extended_brief` JSONB column.

## Fix Plan

### Step 1: Consolidate Creator Data Saving in `useSubmitSolutionRequest`
**File:** `src/hooks/cogniblend/useSubmitSolutionRequest.ts`

- Add extended brief fields to `SubmitPayload` interface: `contextBackground`, `rootCauses`, `affectedStakeholders`, `scopeDefinition`, `preferredApproach`, `approachesNotOfInterest`
- Merge these into the `extended_brief` JSONB alongside `beneficiaries_mapping` and `challenge_template_id`
- Same fix for `useSaveDraft`

### Step 2: Pass Creator Context Fields from ConversationalIntakePage
**File:** `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Pass the `context_background`, `root_causes`, etc. directly in the `createChallenge.mutateAsync()` call instead of relying on a separate `saveStep` call
- Keep the `saveStep` call for AI-generated fields (title, scope, deliverables, etc.) but remove `extended_brief` from it to prevent overwrite

### Step 3: Fix Store Hydration to Decompose `extended_brief`
**File:** `src/hooks/useCurationStoreHydration.ts`

- After hydrating direct column fields, parse `extended_brief` and hydrate each subsection individually using `EXTENDED_BRIEF_FIELD_MAP`
- Map `context_background` → store key `context_and_background`, etc.

### Step 4: Fix Store Sync to Save Subsections Back
**File:** `src/hooks/useCurationStoreSync.ts`

- For subsection keys (`context_and_background`, `root_causes`, etc.), merge changes into the `extended_brief` JSONB column using read-modify-write pattern
- Fetch current `extended_brief`, update the relevant subfield, write back

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | **Modified** — Add context fields to payload, merge into extended_brief |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | **Modified** — Pass context fields in create call, remove extended_brief from saveStep |
| `src/hooks/useCurationStoreHydration.ts` | **Modified** — Decompose extended_brief into individual subsection store entries |
| `src/hooks/useCurationStoreSync.ts` | **Modified** — Handle subsection keys by merging into extended_brief JSONB |

## Impact
- All Creator "Additional Information" fields (Context & Background, Root Causes, etc.) will reliably persist and appear in the Curator's workspace
- Curator edits to these subsections will persist correctly
- No more data loss from overwrite race conditions
- Organization details already flow correctly (separate table, not affected)

