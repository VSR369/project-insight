

# Add Template Selector to AM (Marketplace) Intake + Persist to DB

## Current State
- **RQ (Aggregator)**: Has TemplateSelector — required field, shown in create mode
- **AM (Marketplace)**: No TemplateSelector — goes straight to title + problem summary
- **Persistence bug**: `templateId` is in the submit payload but never saved to the DB (`extended_brief` or elsewhere)
- **CA/CR view**: ConversationalIntakeContent shows TemplateSelector in create/edit but has no way to read a pre-selected template from the challenge record

## Changes

### File 1: `src/components/cogniblend/SimpleIntakeForm.tsx`
- **Add TemplateSelector to the MP (AM) render section** (line ~653, after the header, before "The Problem" card) — same pattern as the AGG section
- Show it only in create mode (`!isEditMode`), optional for AM (not a required field — AM already provides title)
- In edit/view mode, if a template was stored, show a read-only badge with the template name
- Wire `handleTemplateSelect` (already exists and works for both models)
- Pre-fill `domain_tags` from template into the payload (already happens via `selectedTemplate?.prefill?.domain_tags`)

### File 2: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`
- **Persist `templateId`** into `extended_brief.challenge_template_id` during challenge creation (both `useSubmitSolutionRequest` and `useSaveDraft`)
- Add `templateId` to both `SubmitPayload` and `DraftPayload` interfaces (already in SubmitPayload but unused)

### File 3: `src/pages/cogniblend/ConversationalIntakePage.tsx`
- In edit mode, read `extended_brief.challenge_template_id` from the existing challenge data
- Initialize `selectedTemplate` from it by looking up `CHALLENGE_TEMPLATES`
- Show a read-only template badge in view mode (instead of hiding entirely)

### File 4: `src/components/cogniblend/SimpleIntakeForm.tsx` (edit/view mode)
- In edit/view mode for both MP and AGG, read `extended_brief.challenge_template_id` from the existing challenge
- Show a read-only badge (template emoji + name) instead of the full selector grid

## What stays the same
- TemplateSelector component — reused as-is, no changes
- Template data structure (`CHALLENGE_TEMPLATES`) — unchanged
- RQ flow — unchanged (template remains required)
- For AM, template is optional (MP schema already has `selected_template: z.string().optional()`)

## Technical Details
- Storage: `extended_brief.challenge_template_id` (JSONB field, no migration needed)
- The template selection flows from AM → CA just like all other `extended_brief` fields via the dynamic brief rendering system
- CA/CR can see the AM's template choice and change it (editable in edit mode)

