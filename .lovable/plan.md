

# Plan: Dashboard + Wizard Step 1 Enhancements for Challenge Architect/Creator

## Analysis of Reference Images vs Current State

### Reference Image 369 (Dashboard for Challenge Architect)
The reference shows a rich dashboard with:
- **Welcome banner** with dark gradient background, role "Challenge Architect", organization, model badge
- **"+ Create Challenge" button** below the banner
- **3 stat cards**: Active Challenges, Pending Actions, SLA Alerts
- **"My Action Items" table** with columns: ID (CH-2026-xxx format), Title, Status (multi-line with sub-status like "Draft", "On Hold", "Returned", "Under Review", "Published"), SLA info, and contextual Action buttons ("Create Challenge →", "Continue Editing", "Resume", "Edit Challenge", "View")
- **Recent Notifications** section with contextual alerts

### Reference Images 370-374 (Wizard Step 1 — "Challenge Brief")
Shows a 7-step wizard with:
1. **Page header**: "Creating New Challenge | Draft" + "Draft SLA: 10 days remaining" + "Auto-saved" indicator
2. **Business Rules banner**: BR-CC-001 to BR-CC-009 listed
3. **Hold/Cancel buttons**: "Save Draft", "Put on Hold", "Cancel Challenge" at top
4. **7-step progress**: Challenge Brief → Evaluation Criteria → Rewards & Payment → Timeline & Phase Schedule → Provider Eligibility → Templates → Review & Submit
5. **Source request banner**: "Creating challenge from Solution Request SR-2026-001 by Account Manager Ravi Sharma (Tata Motors)" + "View Original Request" link
6. **Step 1 fields** (many new):
   - Challenge Title (with char counter + "Valid" indicator)
   - Industry Segment (dropdown from master data)
   - Experience Countries (multi-select tag chips)
   - Context & Background (rich text editor)
   - Problem Statement (rich text, min chars + "Minimum requirement met")
   - Detailed Description (rich text)
   - Root Causes (rich text)
   - Scope Definition (text)
   - Deliverables (numbered list with add/remove)
   - Affected Stakeholders (rich text)
   - Current Deficiencies (rich text)
   - Expected Outcomes (rich text)
   - Preferred Approach (rich text)
   - Approaches NOT of Interest (rich text)
   - Submission Guidelines (text)
   - Supporting Documentation (file upload, shows attached files)
7. **Footer**: "Cancel & Return to Dashboard" + "Continue to Evaluation Criteria →"

## Identified Gaps

| # | Gap | Priority |
|---|-----|----------|
| D1 | Dashboard: No welcome banner with dark gradient for CR/CA roles | Medium |
| D2 | Dashboard: ActionItemsWidget only shows for AM/RQ, not CR/CA | High |
| D3 | Dashboard: No CH-format IDs, no multi-line status badges, no contextual actions (Create Challenge, Continue Editing, Resume) | High |
| D4 | Dashboard: No "Recent Notifications" section | Medium |
| W1 | Wizard: 4 steps instead of 7 | High |
| W2 | Wizard: No page header with Draft SLA timer + Auto-saved indicator | Medium |
| W3 | Wizard: No Business Rules banner at top | Low |
| W4 | Wizard: No Hold/Cancel buttons at top of wizard | Medium |
| W5 | Wizard: No source request banner linking to originating SR | High |
| W6 | Wizard: Step 1 missing 9 rich-text fields (Context & Background, Detailed Description, Root Causes, Affected Stakeholders, Current Deficiencies, Expected Outcomes, Preferred Approach, Approaches NOT of Interest) | High |
| W7 | Wizard: Step 1 missing Industry Segment dropdown and Experience Countries | High |
| W8 | Wizard: Step 1 missing Supporting Documentation file upload | Medium |
| W9 | Wizard: Deliverables in Step 1 instead of Step 2 | Medium |

## Implementation Plan

### Phase 12A: Enhanced Dashboard for CR/CA Roles

**File: `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`** — Major rewrite:
- Remove the `if (!isAMorRQ) return null` gate — show for ALL CogniBlend users (AM, RQ, CR, CA, CU, ID, etc.)
- Add dark gradient welcome banner matching reference (navy blue bg, white text)
- Show role name dynamically (e.g., "Challenge Architect", "Account Manager")
- Change stat cards to: Active Challenges, Pending Actions, SLA Alerts (derived from challenge data)
- Rework the action items table:
  - Use `CH-{YYYY}-{NNN}` format for challenge IDs (not SR- prefix for challenges in Phase 2+)
  - Multi-line Status column with primary status badge + sub-status below
  - SLA column with "X days remaining (Draft SLA)" format
  - Contextual Action buttons: "Create Challenge →" for items needing challenge, "Continue Editing" for drafts, "Resume" for on-hold, "Edit Challenge" for returned, "View" for submitted/published
- Data source: merge `useMyRequests` (for SR items) + `useMyChallenges` (for challenge items assigned to the user)

**File: `src/components/cogniblend/dashboard/RecentNotificationsWidget.tsx`** (new):
- Query `cogni_notifications` table for current user, limit 5
- Show notification text with timestamp and left-border color coding (amber for returns, blue for assignments)

**File: `src/pages/cogniblend/CogniDashboardPage.tsx`** — Add `RecentNotificationsWidget` below existing sections.

### Phase 12B: Expand Wizard to 7 Steps + Step 1 Enhancements

**File: `src/components/cogniblend/challenge-wizard/ChallengeProgressBar.tsx`**:
- Expand STEPS from 4 to 7: Challenge Brief, Evaluation Criteria, Rewards & Payment, Timeline & Phase Schedule, Provider Eligibility, Templates, Review & Submit

**File: `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts`**:
- Add new fields to schema: `context_background`, `detailed_description`, `root_causes`, `affected_stakeholders`, `current_deficiencies`, `expected_outcomes`, `preferred_approach`, `approaches_not_of_interest`, `experience_countries`, `industry_segment_id`, `supporting_docs`
- All new rich-text fields: `z.string().max(5000).optional().or(z.literal(''))`
- `experience_countries`: `z.array(z.string()).default([])`
- `industry_segment_id`: `z.string().optional()`

**File: `src/components/cogniblend/challenge-wizard/StepProblem.tsx`** — Major expansion:
- Rename to "Challenge Brief" conceptually
- Add Industry Segment dropdown (using `useIndustrySegmentOptions` from existing `useTaxonomySelectors`)
- Add Experience Countries multi-select with tag chips (text input + Add button)
- Add Context & Background rich text editor
- Move Problem Statement (already exists, keep as-is)
- Add Detailed Description rich text
- Add Root Causes rich text
- Add Scope Definition (already exists, make always visible not collapsed)
- Move Deliverables list from Step 2 into Step 1
- Add Affected Stakeholders rich text
- Add Current Deficiencies rich text
- Add Expected Outcomes rich text
- Add Preferred Approach rich text
- Add Approaches NOT of Interest rich text
- Add Submission Guidelines (move from Step 2)
- Add Supporting Documentation using existing `FileUploadZone`

**File: `src/components/cogniblend/challenge-wizard/StepRequirements.tsx`**:
- Remove Deliverables (moved to Step 1)
- Remove Submission Guidelines (moved to Step 1)
- Keep: Permitted Artifact Types, Solver Eligibility, IP Model
- Rename conceptually to support new step numbering

**File: `src/pages/cogniblend/ChallengeWizardPage.tsx`**:
- Update `TOTAL_STEPS = 7`
- Add page header section: "Creating New Challenge | Draft" + SLA timer badge + Auto-saved indicator
- Add Business Rules collapsible banner (BR-CC-001 to BR-CC-009)
- Add Hold/Cancel/Save Draft buttons at top (integrate `HoldResumeActions` for edit mode)
- Add source request banner: if challenge was created from a Solution Request, show "Creating challenge from Solution Request SR-xxx by [AM name] ([Org]))" + "View Original Request" link
- Remap `getStepFields()` for 7 steps
- Add new step components for steps 5 (Provider Eligibility), 6 (Templates), 7 (Review & Submit) — these can be lightweight placeholders initially with existing data
- Wire `buildFieldsFromForm` to include all new fields, storing them in appropriate challenge columns (new rich-text fields in existing JSONB columns like `deliverables` or challenge text columns)

**New file: `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx`**:
- Targeting filters (already exist in Step 4, moved here)
- Challenge visibility, enrollment, submission options (already exist)

**New file: `src/components/cogniblend/challenge-wizard/StepTemplates.tsx`**:
- Submission template upload (moved from StepRequirements)
- Legal document template selection preview

**New file: `src/components/cogniblend/challenge-wizard/StepReviewSubmit.tsx`**:
- Read-only summary of all fields across steps 1-6
- Final validation status
- Submit button with confirmation

### Data Persistence Strategy (No DB Migration)

New rich-text fields will be stored in the existing challenges table JSONB columns:
- `deliverables` JSON expanded: `{ items: [...], context_background, detailed_description, root_causes, affected_stakeholders, current_deficiencies, expected_outcomes, preferred_approach, approaches_not_of_interest, supporting_docs: [...] }`
- `eligibility` JSON expanded: `{ ..., industry_segment_id, experience_countries: [] }`
- This avoids any schema migration

### Source Request Linkage

The `initialize_challenge` RPC creates the challenge; the challenge's `created_by` matches the AM/RQ user. To show "Created from SR-xxx":
- Store a `source_request_context` in the challenge's `phase_schedule` or `deliverables` JSON during the `useSubmitSolutionRequest` flow (add `source_sr_title`, `source_sr_creator_name`, `source_sr_org_name`)
- In the wizard, if this context exists, render the source request banner

### Safety Measures

- All existing form fields, validation, and submission logic preserved
- Step 2 (now Step 2: Evaluation Criteria) and Step 3 (Rewards & Payment) keep existing components
- Step 4 (Timeline & Phase Schedule) keeps existing component
- New steps 5-7 use existing data that was previously in Step 4
- Original 4-step field mapping still works — just redistributed across 7 steps
- No database schema changes
- `HoldResumeActions` reused as-is (already battle-tested)
- `FileUploadZone` reused as-is

### Execution Order

| Sub-phase | Scope | Files |
|-----------|-------|-------|
| 12A | Dashboard enhancements | 3 files (1 rewrite + 1 new + 1 edit) |
| 12B-Schema | Form schema expansion | 1 file |
| 12B-Step1 | StepProblem expansion | 1 file (major) |
| 12B-Steps | Wizard restructure to 7 steps | 5 files (progress bar + 3 new steps + wizard page) |
| 12B-Source | Source request banner + data linkage | 2 files |

