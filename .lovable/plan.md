## Goal
When a Seeker selects an **Organization Type** during registration, the **Industry Segment** picker should only show the industries relevant to that org type. Today both lists are independent — every org sees every industry.

## Current State (verified in DB)

**Organization Types present:**
- Academic Institution, School, College (×2 duplicates), University
- Government Entity
- NGO/Non-Profit
- Large Enterprise, Medium Enterprise, Small Enterprise, Micro Enterprise, MSME, Start-up
- Internal Department

**Industry Segments present (12):** Consulting, Education, Electronics & High-Tech, Energy, Finance, FMCG, Healthcare, Manufacturing (Auto Components), Retail, Technology, Technology (India IT Services), Travel/Hospitality.

Most of the industries you listed (e.g. Pre-Primary Education, Curriculum Development, ECCE, Aerospace & Defense, Pharmaceuticals, etc.) **do not exist yet** and must be created.

`industry_segments` and `organization_types` are not currently linked by any join table.

---

## Plan

### 1. Schema — new join table
Create `org_type_industry_segments` (additive, follows project standards):
```text
id              uuid PK
org_type_id     uuid FK → organization_types(id)
industry_id     uuid FK → industry_segments(id)
display_order   int
is_active       bool default true
created_at/by, updated_at/by
UNIQUE (org_type_id, industry_id)
```
RLS: read-open to authenticated; write-restricted to platform admin (mirrors other md_ tables).

### 2. Seed Industry Segments (insert only what's missing; keep existing ones)

**Academic Institution** → Pre-Primary Education · Primary & Middle Education · Secondary & Higher Secondary Education · Undergraduate (UG) Institutions · Postgraduate (PG) & Research Institutions
*(also map School → Pre-Primary, Primary, Secondary; College → UG; University → UG + PG)*

**Government Entity** → Public Education Administration · Educational Policy & Governance · Curriculum Development & Assessment Boards · Higher Education Regulation & Accreditation · Public Health & School Nutrition · Teacher Certification & Institutional Training · Public Educational Infrastructure Development · Academic Research & Public Grant Funding

**NGO/Non-Profit** → ECCE · Child Rights & Educational Advocacy · SEN & Inclusive Education · Digital Literacy & EdTech Accessibility · Girl Child & Marginalized Community Education · Skill Development & Vocational Training · Educational Funding/Endowments/Scholarships · Teacher Capacity Building · Community-Based Learning & Literacy Programs

**Enterprise / Startup family** (Large, Medium, Small, Micro, MSME, Start-up — all six get the same set) →
Manufacturing (Auto Components) *(keep)* · Automotive & Auto Components · Aerospace & Defense · Pharmaceuticals & Life Sciences · Healthcare & Hospitals · Biotechnology · Chemicals & Petrochemicals · Oil & Gas / Energy · Power & Utilities (Renewable / Conventional) · Construction & Infrastructure · Real Estate · Technology *(keep)* · Technology (India IT Services) *(keep)*

### 3. Backend hook
Update `useIndustries()` in `src/hooks/queries/useRegistrationData.ts` to accept an optional `orgTypeId`. When provided, join through `org_type_industry_segments` and return only mapped active industries. When absent, fall back to the full list (preserves existing callers).

### 4. UI wiring
- `IndustryTagSelector` gets an optional `orgTypeId` prop.
- `OrganizationIdentityForm`: pass the currently selected `organization_type_id` into the selector. Clear `industry_ids` whenever org type changes (via RHF watcher) so stale selections don't persist.
- Empty-state message in the popover when an org type has no mapped industries yet ("No industries configured for this organization type").

### 5. Admin (light touch, optional in this pass)
The existing Industry Segments admin page stays as-is. Mapping management can be added later; for now seed via migration is sufficient.

---

## Open Questions (please confirm before I build)
1. **College duplicates** — there are two `College` rows (codes `COL` and `COLLEGE`). Should I deactivate one? If yes, which?
2. **Enterprise mapping** — confirm the same business-industry list applies to all six (Large/Medium/Small/Micro Enterprise + MSME + Start-up). I'll assume yes unless told otherwise.
3. **School / College / University** — your prompt grouped everything under "Academic Institution". Should School/College/University get the more specific subsets I proposed (School → school-level industries, etc.), or should all four academic org types share the full academic list?

I'll proceed with my proposed defaults if you just approve.
