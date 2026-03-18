

# Solution Request Screens Enhancement Plan

## Current State Analysis

### What exists:
1. **`/requests/new` (NewSolutionRequestPage)** — A functional form with: Business Problem, Expected Outcomes, Budget Range, Timeline, Domain Tags, Urgency, Architect assignment (MP). Lives outside the CogniBlend shell.
2. **`/requests` (SolutionRequestsListPage)** — Table list with status/model/urgency badges, cursor pagination. Lives outside CogniBlend shell.
3. **`/cogni/submit-request` and `/cogni/my-requests`** — Both point to **placeholder** "Coming Soon" pages inside CogniShell.
4. **CogniSidebarNav** — Has "Submit Request" (AM, RQ roles) and "My Requests" (AM, RQ roles) nav items pointing to the placeholders.

### What the reference images show (gaps):

**Dashboard (image-366):**
- Welcome banner with user name, role, tenant, and model badge
- Summary stat cards (My Requests count, Awaiting Response count, Challenges Created count)
- "My Action Items" table with: Request ID (SR-2026-001), Title, Status (Created/Draft/Hold), SLA info, Actions (View/Edit/Resume)
- "+ New Solution Request" button
- "Recent Notifications" section with contextual messages

**New Solution Request form (image-367, image-368):**
- Business Rules banner at top (BR-SR-001, BR-SR-002, BR-SR-008)
- **Request Information section**: Auto-generated Request ID (SR-2026-001), Status badge, Model badge
- **Problem Definition section**: Problem Statement with char counter, Desired Outcomes as numbered list, **Constraints** field (missing from current form)
- **Categorisation section** (entirely missing): Industry Segment dropdown, Sub-Domains dropdown, Specialties as tag chips — leveraging the existing `industry_segments`, `proficiency_areas` taxonomy tables
- **Budget & Timeline**: "Estimated Budget Range" (From/To/Currency), Desired Timeline
- **Attachments section** (entirely missing): File upload with drag-drop, supported formats (PDF, DOC, DOCX, XLS, XLSX, max 10MB)
- Footer: Save as Draft + Submit Request buttons

### Key Gaps to Close:

| # | Gap | Severity |
|---|-----|----------|
| G1 | Cogni routes `/cogni/submit-request` and `/cogni/my-requests` are placeholders — need to wire to real pages inside CogniShell | High |
| G2 | No Request ID generation (SR-YYYY-NNN format) | Medium |
| G3 | No Constraints field in the form | Medium |
| G4 | No Categorisation section (Industry Segment, Sub-Domains, Specialties) using existing taxonomy | Medium |
| G5 | No Attachments/file upload support | Medium |
| G6 | No Business Rules applied banner | Low |
| G7 | Dashboard doesn't show SR-specific welcome banner, stat cards, or action items table matching the reference | Medium |
| G8 | No Request Information header (auto-ID, status, model badges) in form | Low |

---

## Implementation Plan

### Phase 9: Wire Cogni Routes + Form Enhancements (No DB Changes)

**9A — Route Integration (G1)**
- Update `App.tsx`: Replace the two placeholder routes (`/cogni/submit-request`, `/cogni/my-requests`) with lazy imports of the existing `NewSolutionRequestPage` and `SolutionRequestsListPage`, wrapped in CogniShell context.
- Update navigation in both pages: redirect paths from `/requests` to `/cogni/my-requests` and from `/dashboard` to `/cogni/dashboard` so they stay within the Cogni shell.
- Keep the original `/requests` and `/requests/new` routes working (backward compatibility).

**9B — Request Information Header (G8, G2)**
- Add a "Request Information" card at the top of `NewSolutionRequestPage` showing:
  - Auto-generated Request ID: `SR-{YYYY}-{NNN}` format (client-side display only; the real ID is the challenge UUID). Generate from current year + a counter from the org's challenge count.
  - Status badge: "Draft" (for new) or from saved state.
  - Model badge: "Marketplace" or "Aggregator" from `orgContext`.

**9C — Constraints Field (G3)**
- Add a `constraints` textarea field to `NewSolutionRequestPage` between Expected Outcomes and Categorisation.
- Schema: `z.string().max(2000).optional()`.
- Persist in the challenge's `eligibility` JSON alongside existing fields.

**9D — Categorisation Section (G4)**
- Add a "Categorisation" card section with three fields:
  - **Industry Segment**: Single-select dropdown, fetched from `industry_segments` table.
  - **Sub-Domains**: Multi-select from `proficiency_areas` filtered by selected industry segment.
  - **Specialties**: Auto-suggested tag chips (from the existing `useTaxonomySuggestions` hook + manual entry).
- Store in `eligibility` JSON: `{ industry_segment_id, sub_domain_ids: [], specialty_tags: [] }`.
- Create a small hook `useTaxonomySelectors()` that fetches `industry_segments` and `proficiency_areas`.

**9E — Business Rules Banner (G6)**
- Add an info banner below the page title showing applied business rules: "BR-SR-001 (Min 100 chars problem statement), BR-SR-002 (Duplicate detection), BR-SR-008 (Categorization required)".
- Simple static UI component, no logic changes.

### Phase 10: Attachments + Dashboard Enhancements

**10A — Attachments Section (G5)**
- Add an "Attachments" section at the bottom of the form with:
  - Drag-and-drop file upload zone using existing patterns (the project already has Supabase Storage integration and `sanitizeFileName`).
  - Supported formats: PDF, DOC, DOCX, XLS, XLSX (max 10MB per file).
  - Upload to Supabase Storage bucket `challenge-attachments/{challengeId}/{sanitizedFileName}`.
  - Store file metadata in challenge's `eligibility` or a new JSON field.
- Since we can't upload before challenge creation, use a two-step flow: show files in local state, upload after `initialize_challenge` returns the ID, then update challenge metadata.
- Create a reusable `FileUploadZone` component.

**10B — Dashboard Action Items Widget (G7)**
- Enhance `CogniDashboardPage` with a dedicated "My Action Items" section for AM/RQ roles:
  - Welcome banner: "Welcome, {name}" with role, tenant, model.
  - Stat cards: My Requests count, Awaiting Response, Challenges Created.
  - Action Items table: Request ID (display format), Title, Status badge, SLA info, Action button (View/Edit/Resume based on status).
- Data source: reuse `useMyRequests` hook from `SolutionRequestsListPage` (extract to shared hook).
- Keep existing dashboard sections (NeedsAction, WaitingFor, MyChallenges) intact — add the new widget above them, conditionally shown when user has AM or RQ role.

---

## Files to Create/Modify

### Phase 9:
| File | Action |
|------|--------|
| `src/App.tsx` | Modify: Replace placeholder routes for `/cogni/submit-request` and `/cogni/my-requests` |
| `src/pages/requests/NewSolutionRequestPage.tsx` | Modify: Add Request Info header, Constraints field, Categorisation section, Business Rules banner |
| `src/pages/requests/SolutionRequestsListPage.tsx` | Modify: Update navigation targets for Cogni shell context |
| `src/hooks/queries/useTaxonomySelectors.ts` | Create: Hook to fetch industry segments + proficiency areas for dropdowns |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Modify: Include constraints + categorisation in payload |

### Phase 10:
| File | Action |
|------|--------|
| `src/components/requests/FileUploadZone.tsx` | Create: Reusable drag-drop file upload component |
| `src/pages/requests/NewSolutionRequestPage.tsx` | Modify: Add Attachments section |
| `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` | Create: SR-specific dashboard widget |
| `src/pages/cogniblend/CogniDashboardPage.tsx` | Modify: Add ActionItemsWidget conditionally |
| `src/hooks/queries/useMyRequests.ts` | Create: Extract shared hook from SolutionRequestsListPage |

### Safety Measures:
- No database schema changes required — all new data stored in existing JSONB columns (`eligibility`).
- Original `/requests` routes preserved alongside new `/cogni/` routes.
- All existing form fields, validation, and submission logic untouched.
- Existing dashboard sections remain; new widget is additive.

