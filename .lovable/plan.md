

# Curator AI — Final 8 Items Implementation Plan

## Summary
Implement 8 remaining items: fix wave/dependency alignment, add seeker voice directive, expand org context fetch, upgrade context intelligence, add DB migration for attachments + social fields, create attachment extraction edge function, and inject attachments into AI review prompts. Also fix a duplicate CHALLENGE CONTEXT block in Pass 2.

## Files Modified
1. `src/lib/cogniblend/waveConfig.ts` — Item 1: Fix EXECUTION_WAVES
2. `supabase/functions/review-challenge-sections/index.ts` — Items 2, 3, 5, 8b
3. `src/lib/cogniblend/sectionDependencies.ts` — Item 2: Align DIRECT_DEPENDENCIES
4. `supabase/functions/review-challenge-sections/promptTemplate.ts` — Items 4, 6, fix duplicate CHALLENGE CONTEXT
5. `supabase/functions/extract-attachment-text/index.ts` — Item 8a: New edge function
6. DB Migration — Item 7: Social fields + challenge_attachments table

---

## Item 1: Fix EXECUTION_WAVES (waveConfig.ts)

Replace the 6-wave `EXECUTION_WAVES` array (lines 47-84). Key moves:
- `success_metrics_kpis` from Wave 1 → Wave 3
- `solution_type` from Wave 2 → Wave 3
- `submission_guidelines` and `phase_schedule` from Wave 4 → Wave 5
- Rename waves: Foundation → "Foundation — Problem & Context", etc.
- Update prerequisiteSections to match new wave structure

## Item 2: Fix SECTION_DEPENDENCIES (index.ts + sectionDependencies.ts)

**index.ts** (lines 89-114): Replace `SECTION_DEPENDENCIES` with corrected acyclic map:
- Remove circular refs: `preferred_approach→deliverables`, `data_resources_provided→solver_expertise`, `solution_type→deliverables`, `phase_schedule→evaluation_criteria`, `evaluation_criteria→submission_guidelines`
- Add missing: `solution_type` depends on `['problem_statement', 'scope']` only (no deliverables — it's in the same wave)

**sectionDependencies.ts** (lines 14-42): Update `DIRECT_DEPENDENCIES` to match. Key changes:
- Remove `solution_type` from `scope`'s downstream (circular with Wave 3)
- Remove `deliverables` from `current_deficiencies`'s downstream
- Remove `deliverables` from `preferred_approach`'s upstream
- Remove `evaluation_criteria` from `phase_schedule`'s downstream
- Remove `submission_guidelines` from `solution_type`'s downstream
- Invalidate upstream cache by setting `_upstreamCache = null` (already done on module load)

## Item 3: CURATION_SECTIONS Seeker Voice + Corrected Order (index.ts)

Replace `CURATION_SECTIONS` (lines 203-237) with first-person descriptions matching the new wave order. Example: `"Our core business challenge — clear, specific, quantified..."` instead of `"Clarity, specificity, context..."`. Move `legal_docs` and `escrow_funding` to Wave 5 (before Wave 6 Presentation sections).

## Item 4: Seeker Voice Directive (promptTemplate.ts)

Append to `INTELLIGENCE_DIRECTIVE` (before closing backtick at line 492):
- Voice rule: all AI-generated content uses first-person plural ("we", "our") from the seeker's perspective
- Exceptions: `evaluation_criteria` and `submission_guidelines` use neutral procedural voice
- BAD/GOOD examples

Also append a VOICE RULE line to `buildPass2SystemPrompt` after the REWRITE RULES block (line ~1267).

**Fix duplicate CHALLENGE CONTEXT**: Remove the duplicate block at lines 1291-1296.

## Item 5: Rich Organization Context Fetch (index.ts)

Replace the minimal org fetch (lines 1332-1352) with expanded version querying:
- `organization_name, trade_brand_name, organization_description, website_url, hq_country_id, hq_city, annual_revenue_range, employee_count_range, founding_year, is_enterprise, organization_type_id`
- Country name from `countries` table
- Organization type from `organization_types` table
- Industry segments from `seeker_org_industries` + `industry_segments` tables

Expand `orgContext` type to include all new fields. Wrapped in try/catch for graceful fallback.

## Item 6: Upgrade buildContextIntelligence (promptTemplate.ts)

Replace the existing function (lines 679-761) with the enhanced version that:
- Uses rich org data (description, website, HQ, revenue, employees, industries)
- Derives geography from `hqCountry` first, currency fallback
- Adds "YOU KNOW THIS ORGANIZATION" section when website/name available
- Maturity-specific guidance (Blueprint/POC/Pilot calibration)
- Seeker-voice framing ("We are...")

Update function signature from `orgContext?: { orgType?: string; orgName?: string }` to `orgContext?: any`.

## Item 7: DB Migration

Single migration with 3 parts:
- **Part A**: Add `linkedin_url`, `twitter_url`, `social_links`, `tagline`, `functional_areas` to `seeker_organizations`
- **Part B**: Add `industry_segment_id`, `functional_area`, `target_geography` to `challenges`
- **Part C**: Create `challenge_attachments` table with RLS policy and index

## Item 8a: extract-attachment-text Edge Function

New file `supabase/functions/extract-attachment-text/index.ts`:
- Accepts `attachment_id` in request body
- Downloads file from `challenge-attachments` storage bucket
- Extracts text based on mime_type (PDF → text decode, images → Claude Vision API)
- Updates `challenge_attachments` with extracted text and status
- CORS headers, error handling, status tracking

## Item 8b: Inject Attachments into AI Review (index.ts)

After org fetch and before batch loop:
- Query `challenge_attachments` for completed extractions
- Build `attachmentsBySection` map
- Append `ATTACHED DOCUMENTS` block to Pass 1 user prompt
- Add section-specific attachments to Pass 2 per-section prompt

---

## Implementation Order

**Phase 1** (Critical Fixes):
1. Item 1: waveConfig.ts
2. Item 2: index.ts SECTION_DEPENDENCIES + sectionDependencies.ts DIRECT_DEPENDENCIES
3. Item 3: index.ts CURATION_SECTIONS
4. Item 4: promptTemplate.ts seeker voice + fix duplicate CHALLENGE CONTEXT

**Phase 2** (Intelligence Upgrade):
5. Item 5: index.ts rich org fetch
6. Item 6: promptTemplate.ts buildContextIntelligence upgrade

**Phase 3** (Document Reading):
7. Item 7: DB migration
8. Item 8a: extract-attachment-text edge function
9. Item 8b: index.ts attachment injection

Then redeploy edge functions.

## Risk Notes
- DIRECT_DEPENDENCIES change will reset the upstream cache — safe since it's module-level
- Org fetch expansion is wrapped in try/catch — graceful fallback if tables don't exist yet
- Attachment injection is additive — empty attachmentsBySection = no change to prompts
- Migration uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency

