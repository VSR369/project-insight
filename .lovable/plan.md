

# Plan: Remove Duplicate Industry Domain Field + Add Read-Only Legal Doc Viewer

## Analysis

**Industry Segment vs Domain Tags — Duplicate Data**

The config panel (`ChallengeConfigurationPanel`) has "Industry Segment" (single select from `industry_segments` table). Inside the form, `EssentialFieldRenderers` has "Industry Domain" (multi-select chips from the SAME `industry_segments` table). Both store IDs from the same table. The `industrySegmentId` from the config panel goes to `challenges.industry_segment_id`, while `domain_tags` goes to `challenges.domain_tags` as an array of IDs from the same table.

**Resolution:** Remove the `domain_tags` field from the form. Use `industrySegmentId` from the config panel as the single source of truth. The `domain_tags` column in the DB will be populated automatically from `industrySegmentId` (as a single-element array) during submit/save.

**Legal Docs — View-Only Display from DB**

The current `QuickLegalDocsSummary` uses hardcoded lists. The user wants DB-driven, read-only display of legal templates from `legal_document_templates` (and optionally `org_legal_document_templates` for AGG). This should show for ALL governance modes, not just QUICK.

---

## Changes

### 1. Remove `domain_tags` from form schema and UI

**`src/components/cogniblend/creator/creatorFormSchema.ts`**
- Remove `domain_tags` from the Zod schema object
- Remove `domain_tags` from the `CreatorFormValues` type

**`src/components/cogniblend/creator/EssentialFieldRenderers.tsx`**
- Remove the "Industry Domain" chip selector section (lines 78-98)

**`src/components/cogniblend/creator/EssentialDetailsTab.tsx`**
- Remove `industrySegments` prop (no longer needed since domain tags removed)

**`src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- Remove `industrySegments` from `EssentialDetailsTab` props
- Remove `useIndustrySegmentOptions` import (if no longer used elsewhere in this file — check: it's still used in `handleFillTestData` for seed, so keep it but stop passing to tab)
- Update `defaultValues` to remove `domain_tags`
- In `buildPayload`: derive `domainTags` from `industrySegmentId` as `[industrySegmentId]` instead of `data.domain_tags`
- In `handleFillTestData`: remove `domainIds` derivation, remove `domain_tags` from seed

### 2. Update submit/save hooks to auto-derive domain_tags

**`src/hooks/cogniblend/useSubmitSolutionRequest.ts`**
- `domainTags` in the payload will now be `[industrySegmentId]` (already derived from buildPayload)

**`src/hooks/cogniblend/useCreatorDraftSave.ts`**
- Same: derive `domainTags` from `industrySegmentId` as `[industrySegmentId]`

**`src/hooks/cogniblend/useCreatorDraftLoader.ts`**
- Remove `domain_tags` from form reset (no longer a form field)

### 3. Update seed content

**`src/components/cogniblend/creator/creatorSeedContent.ts`**
- Remove `domain_tags` references from seed objects (or keep but ignore)

### 4. Replace hardcoded QuickLegalDocsSummary with DB-driven read-only legal docs

**`src/components/cogniblend/creator/QuickLegalDocsSummary.tsx`** → Rename/rewrite to `CreatorLegalDocsPreview.tsx`
- Fetch from `legal_document_templates` table: `document_code, document_name, description, summary, content, applies_to_mode, applies_to_model, is_active, is_mandatory`
- Filter by: `is_active = true`, `applies_to_mode` matches governance mode (or 'ALL'), `applies_to_model` matches engagement model (or 'ALL')
- For AGG: also fetch from `org_legal_document_templates` for the current org
- Display as read-only cards with document name, description/summary
- Add expandable/dialog view using `LegalDocumentViewer` to show full `content` HTML when clicked
- Show for ALL governance modes (not just QUICK)

**`src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- Replace `QuickLegalDocsSummary` with `CreatorLegalDocsPreview` for all modes
- Move it out of the `isQuick` conditional block

### 5. Update AI Review and Fill Test Data

- AI Review drawer already receives `industrySegmentId` — no change needed
- Fill Test Data: remove `domain_tags` population, the `industry_segment_id` from config panel is sufficient

---

## Files Changed

| # | File | Action |
|---|------|--------|
| 1 | `creatorFormSchema.ts` | Remove `domain_tags` from schema + type |
| 2 | `EssentialFieldRenderers.tsx` | Remove Industry Domain chips section |
| 3 | `EssentialDetailsTab.tsx` | Remove `industrySegments` prop |
| 4 | `ChallengeCreatorForm.tsx` | Derive domainTags from industrySegmentId, swap legal component |
| 5 | `creatorSeedContent.ts` | Clean up domain_tags references |
| 6 | `useCreatorDraftSave.ts` | Derive domainTags from industrySegmentId |
| 7 | `useCreatorDraftLoader.ts` | Remove domain_tags from form reset |
| 8 | `QuickLegalDocsSummary.tsx` → `CreatorLegalDocsPreview.tsx` | New DB-driven read-only legal docs viewer for all modes |

