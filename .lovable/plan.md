
## Quick-mode-only legal override plan

## Decision
Yes, this is doable with limited scope if it is implemented as a **QUICK-mode, challenge-scoped override** and does **not** modify the STRUCTURED or CONTROLLED legal workflow.

The safest version is:
- only for `QUICK`
- only on the Creator side
- only affects the challenge’s effective QUICK CPA source
- does not change Curator or LC modules
- does not inject anything into Pass 1 / Pass 2

## Current feature by mode

### QUICK
Current behavior:
- Creator sees `CreatorLegalPreview` as a read-only preview
- QUICK CPA is described as auto-assembled / auto-accepted
- no Creator upload/replace flow exists
- Pass 3 is not used in QUICK

### STRUCTURED
Current behavior:
- Creator can only provide `creator_legal_instructions`
- Curator handles legal review later
- legal source docs and Pass 3 live in Curator/LC workflow

### CONTROLLED
Current behavior:
- Creator can only provide `creator_legal_instructions`
- LC handles legal source docs and Pass 3
- Curator becomes read-only for legal after Phase 2

## Recommended scope
Implement **QUICK only**:
- add a Creator option to keep default QUICK CPA or replace it for this challenge
- do not touch STRUCTURED
- do not touch CONTROLLED
- do not change Curator/LC legal workspaces

## Critical architecture rule
Do **not** overwrite org templates or platform templates.

“Replace” must mean:
- for this challenge only, use the Creator-uploaded doc as the primary QUICK legal source
- org-level CPA templates remain unchanged

## Best implementation model
Reuse the existing legal-source architecture rather than creating a parallel system.

### Challenge-scoped model
Store Creator’s QUICK replacement as a `challenge_legal_docs` row using:
- `document_type = 'SOURCE_DOC'`
- `source_origin = 'creator'`

Add minimal metadata so the system knows this is a QUICK override, for example:
- `override_mode` or equivalent marker: `QUICK_REPLACE_DEFAULT`
- optional target code such as `replaces_template_code = 'CPA_QUICK'`

This keeps the change additive and isolated.

## Why this has low impact
Because QUICK currently bypasses Curator/LC legal review, the override can be consumed only by the QUICK legal assembly/resolution path.

That means:
- no Curator UI change required
- no LC UI change required
- no Pass 3 change required for STRUCTURED/CONTROLLED
- no Pass 1 / Pass 2 change required

## Impact on Curator module and AI Pass 1 / Pass 2

## Short answer
No functional impact is required on Curator Pass 1 or Pass 2 if implemented correctly.

### Why
Pass 1 / Pass 2 currently operate on curation content, not on QUICK legal source replacement.

`creator_legal_instructions` already appears as a curation-visible section, but this proposed QUICK replacement should not be modeled as another editable curation section. It should remain in the legal pipeline only.

### What to avoid
Do not:
- inject uploaded legal text into challenge content sections
- add new Pass 1 / Pass 2 review logic
- surface the uploaded doc as something Curator must process

If that boundary is preserved, Curator modules remain unchanged.

## Required changes

### 1) Extend data model for QUICK-only override metadata
Add additive metadata to `challenge_legal_docs` for source-doc rows so the app can distinguish:
- ordinary legal source uploads used in reviewed modes
- Creator QUICK replacement docs

Recommended additive fields:
- `override_strategy text null`
- `target_template_code text null`

Allowed values:
- `override_strategy = 'REPLACE_DEFAULT'`
- `target_template_code = 'CPA_QUICK'`

This is enough to keep resolution explicit without redesigning legal tables.

### 2) Add Creator-side QUICK-only upload UI
Update `CreatorLegalPreview.tsx` so that only in `QUICK` mode the Creator sees:
- Keep default document
- Replace default document

When Replace is selected:
- show upload control
- show clear copy that this is for this challenge only
- show allowed formats from existing source-doc pipeline (`.docx`, `.txt`)
- show current selected replacement if already uploaded

Do not show this UI in STRUCTURED or CONTROLLED.

### 3) Reuse existing source-doc upload hook pattern
Implement a Creator-specific hook/service layer that writes a `SOURCE_DOC` row with:
- `source_origin = 'creator'`
- `override_strategy = 'REPLACE_DEFAULT'`
- `target_template_code = 'CPA_QUICK'`

This should follow the same storage + parsing pattern as `useSourceDocs`, but scoped to Creator QUICK use.

### 4) Resolve QUICK legal preview correctly
Update the QUICK preview/query path so:
- if no challenge-scoped QUICK replacement exists, show org default CPA_QUICK template
- if a Creator replacement exists, show that replacement as the effective challenge document

Preview copy should clearly indicate:
- “Default template in use” or
- “Challenge-specific replacement in use”

### 5) Ensure downstream QUICK assembly/acceptance uses the replacement
Update the QUICK legal resolution path so the replacement becomes the effective source for that challenge’s legal agreement instead of the org default template.

This must be challenge-scoped only.

### 6) Preserve STRUCTURED and CONTROLLED exactly as-is
No change to:
- `creator_legal_instructions`
- Curator legal review
- LC source-doc upload
- Pass 3 generation
- UNIFIED_SPA workflow
- legal stale behavior for reviewed modes

## Main risks and constraints

### 1) Product semantics change in QUICK
Today QUICK promises “auto-applied standard template.”
After this change it becomes:
- “auto-applied, but the Creator may replace the challenge’s default legal source before submission.”

That is acceptable if the UI explains it clearly.

### 2) File type limitation
Current source-doc parser supports:
- `.docx`
- `.txt`

PDF is not ready in the current source-doc pipeline. QUICK replacement should follow that same restriction for now.

### 3) No reviewed-mode carryover
If the challenge later changes from QUICK to STRUCTURED/CONTROLLED, the system must define what happens to the QUICK replacement row:
- safest rule: preserve it as a Creator source doc, but do not auto-apply it as a reviewed-mode replacement
- reviewed modes should continue using existing legal workflow

### 4) Avoid org-template confusion
UI must explicitly say:
- this does not replace your organization template
- this only applies to this one challenge

## Files likely to change

### Database
```text
supabase/migrations/<new_migration>.sql
```

### Creator UI
```text
src/components/cogniblend/creator/CreatorLegalPreview.tsx
src/components/cogniblend/creator/creatorFormSchema.ts
src/components/cogniblend/creator/ChallengeCreatorForm.tsx
```

### Legal hooks/services
```text
src/hooks/queries/useSourceDocs.ts
src/services/legal/sourceDocService.ts
src/hooks/queries/useLegalDocTemplates.ts
```

### QUICK legal resolution path
Likely one or more of:
```text
src/hooks/queries/useOrgCpaTemplates.ts
src/hooks/queries/usePlatformSpaTemplate.ts
src/lib/cogniblend/challengePayloads.ts
supabase/migrations/* related to legal resolution / assemble_cpa / challenge legal seeding
```

## Explicit non-changes
Do not modify:
- Curator legal workspace
- LC legal workspace
- Pass 3 review flow
- STRUCTURED creator legal flow
- CONTROLLED creator legal flow
- `creator_legal_instructions` behavior

## Expected outcome
After this change:
- QUICK Creator can replace the default challenge legal document with a challenge-specific one
- STRUCTURED and CONTROLLED stay unchanged
- Curator Pass 1 / Pass 2 behavior stays unchanged
- Curator/LC modules do not need workflow changes
- org templates remain untouched
- the override applies only to the specific QUICK challenge

## Recommended implementation sequence
1. Add additive metadata for QUICK override rows on `challenge_legal_docs`
2. Add QUICK-only replace UI in `CreatorLegalPreview`
3. Reuse source-doc upload flow for Creator QUICK replacement
4. Update QUICK preview/effective-document resolution
5. Verify no UI or query changes are required in STRUCTURED/CONTROLLED modules

## Recommendation
Proceed with this as a **QUICK-only feature**. It is feasible and the impact is contained, as long as it is implemented as a challenge-scoped legal override and not as a template-editing feature.
