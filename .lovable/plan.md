

# Organization Context in Challenge Creator + Registration Enrichment

## Overview

Add a collapsible "Organization Context" card to the Challenge Creator page (above the form tabs) showing auto-populated org profile data, with editable fields for gaps. Also add 3 new fields to Registration Step 1 (organization_description, website_url as required; linkedin_url as recommended).

## Current State

- **Registration Step 1** already captures: legal name, trade brand, website_url (optional), org type, industries, size, revenue, year founded, HQ country/state/city, operating geographies
- **Registration schema** (`organizationIdentity.ts`) has `website_url` as optional, no `organization_description` or `linkedin_url`
- **Registration form** (`OrganizationIdentityForm.tsx`) renders website_url but as optional; no description or LinkedIn fields
- **Creator form** (`ChallengeCreatorForm.tsx`) has no org context display
- **AI edge function** (`review-challenge-sections/promptTemplate.ts`) already uses `orgDescription`, `websiteUrl`, `linkedinUrl` in `buildContextIntelligence()` — but these fields are often NULL
- **OrgContextPanel** (Curator side) already fetches and edits these fields on `seeker_organizations`

## Changes

### Phase 1: Creator Org Context Card (New Component)

**New file: `src/components/cogniblend/creator/CreatorOrgContextCard.tsx`**

- Collapsible card using `Collapsible` from radix
- Fetches org data from `seeker_organizations` (name, trade_brand, description, website, linkedin, twitter, tagline, hq_country_id, hq_city, annual_revenue_range, employee_count_range, founding_year, organization_type_id, functional_areas)
- Fetches org type name via join or separate query
- Fetches industries from `seeker_org_industries` + `industry_segments`
- Fetches country name from `countries`
- **Read-only display**: org name, type, industries, HQ location, employee range, revenue range, founding year
- **Editable fields** (only shown if NULL or always editable): description (textarea, min 200 chars recommended), website_url, linkedin_url, twitter_url, tagline
- Auto-save editable fields to `seeker_organizations` with 800ms debounce (same pattern as OrgContextPanel)
- Governance-aware: collapsed by default for QUICK, expanded for STRUCTURED/CONTROLLED
- CONTROLLED mode: warning banner if description or website_url is NULL
- Info text: "This context helps AI generate better challenge specs. Edits update your org profile for all challenges."

**Modified file: `src/pages/cogniblend/ChallengeCreatePage.tsx`**

- Import and render `CreatorOrgContextCard` between `GovernanceEngagementSelector` and `ChallengeCreatorForm`
- Pass `organizationId` from `currentOrg` and `governanceMode`

### Phase 2: Registration Step 1 Enrichment

**Modified file: `src/lib/validations/organizationIdentity.ts`**

Add 3 new fields to the Zod schema:
- `organization_description`: required, min 200 chars, max 2000 chars
- `website_url`: change from optional to required (valid URL)
- `linkedin_url`: optional URL field (recommended, not required)

**Modified file: `src/components/registration/OrganizationIdentityForm.tsx`**

Add form fields:
1. `organization_description` — Textarea with label "About Your Organization *", placeholder guiding 2-3 sentences, placed after trade_brand_name/website
2. `linkedin_url` — URL input with label "LinkedIn Company Page (recommended)", placed after website_url
3. Update `website_url` label to show required asterisk

Update `handleSubmit` payload to include `organization_description` and `linkedin_url` in the create/update call.

**Modified file: `src/types/registration.ts`**

Add `organization_description`, `linkedin_url` to `OrganizationIdentityData` interface.

**Modified file: `src/contexts/RegistrationContext.tsx`**

No changes needed — step1 data already flows through the existing type.

### Phase 3: Submission Payload Mapping

In `OrganizationIdentityForm.tsx` `handleSubmit`, ensure:
- `organization_description` maps to `seeker_organizations.organization_description`
- `linkedin_url` maps to `seeker_organizations.linkedin_url`

The `useCreateOrganization` and `useUpdateOrganization` hooks need to accept and pass through these new fields. Check and update `src/hooks/queries/useRegistrationData.ts` if needed.

## Files Changed

| File | Action |
|------|--------|
| `src/components/cogniblend/creator/CreatorOrgContextCard.tsx` | **New** — Collapsible org context card |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | **Modified** — Add card between selectors and form |
| `src/lib/validations/organizationIdentity.ts` | **Modified** — Add description (required), make website required, add linkedin |
| `src/components/registration/OrganizationIdentityForm.tsx` | **Modified** — Add 2 new form fields, update website label, update submit payload |
| `src/types/registration.ts` | **Modified** — Add new fields to OrganizationIdentityData |
| `src/hooks/queries/useRegistrationData.ts` | **Modified** — Pass new fields in create/update mutations |

## No Database Changes Needed

`seeker_organizations` already has `organization_description`, `website_url`, `linkedin_url`, `twitter_url`, `tagline`, `functional_areas` columns. The AI edge function already reads them. This is purely a frontend data capture improvement.

