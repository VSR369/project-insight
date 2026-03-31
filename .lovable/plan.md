

# Creator Role End-to-End Fix — Implementation Plan

## Summary

12 problems identified across navigation, CRUD, data flow, and UX for the Challenge Creator role. The core issues: "My Challenges" is a placeholder, Save Draft creates duplicates, the detail page shows solver components, and Browse Challenges has no filters.

## Implementation Phases

### Phase 1: Build MyChallengesPage (P1, P9)

**New file: `src/pages/cogniblend/MyChallengesPage.tsx`**

- Uses existing `useMyChallenges` hook (already works, just has no page)
- Displays Creator's challenges as status cards grouped by master_status
- Role filter tabs (reuses pattern from `MyChallengesSection` dashboard widget)
- Actions per status:
  - **Draft (phase 1):** "Resume Editing" → `/cogni/challenges/create?draft=<id>`, "Delete Draft" → soft-delete
  - **In Curation (phase 2-3):** "View" → `/cogni/challenges/:id/view`
  - **Active/Published:** "View" → read-only detail
  - **Cancelled/Completed:** "View" → read-only detail
- "+ New Challenge" button in header
- Empty state with CTA to create first challenge

**Route update in `App.tsx`:** Replace `CogniPlaceholderPage` at `/cogni/my-challenges` with new `MyChallengesPage`.

---

### Phase 2: Fix Save Draft Duplicate Creation (P2)

**Modified: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

- Add `draftChallengeId` state + URL query param detection (`?draft=<id>`)
- On first save: create via `initialize_challenge`, store returned ID in state
- On subsequent saves: UPDATE existing challenge instead of creating new
- When opened with `?draft=<id>`: fetch challenge data and pre-populate form via `reset()`

**Modified: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**

- Add `useUpdateDraft` mutation that updates an existing challenge by ID instead of calling `initialize_challenge`

---

### Phase 3: Redesign Challenge Detail Page for Creator (P3, P5, P12)

**Modified: `src/pages/cogniblend/PublicChallengeDetailPage.tsx`**

Rather than creating a separate page, add role detection to the existing page:
- Use `useUserChallengeRoles` to check if viewer has CR role for this challenge
- **If Creator:** Hide solver components (SolverEnrollmentCTA, WithdrawalBanner, LegalReAcceptModal), keep ChallengeQASection (relevant for all roles per business rules), replace "Awards + CTA" hero with a clean metadata card showing status timeline, replace "Browse Challenges" back button with "My Challenges"
- **If not Creator:** Show existing solver view (unchanged)
- Add `extended_brief` fields to `usePublicChallenge` hook SELECT query so all Creator-submitted context data renders
- Add null guards for all JSONB sections — show "Not yet defined" instead of blank cards
- Display extended_brief subsections: Context & Background, Root Causes, Affected Stakeholders, Current Deficiencies, Preferred Approach, Approaches Not of Interest
- Add `governance_profile`, `hook`, `domain_tags`, `expected_outcomes` to the query and display

---

### Phase 4: Filter Browse Challenges (P4)

**Modified: `src/hooks/cogniblend/useBrowseChallenges.ts`**

- Add `.eq('master_status', 'ACTIVE')` and `.not('published_at', 'is', null)` filters
- Only show published, active challenges in Browse — drafts and in-preparation excluded

---

### Phase 5: Draft Delete & Dashboard Drafts (P8, P11)

**MyChallengesPage** (already built in Phase 1):
- "Delete Draft" action for phase-1 challenges → soft-delete via `is_deleted = true`
- Confirmation dialog before delete

**Modified: `src/pages/cogniblend/CogniDashboardPage.tsx`**
- Remove the `master_status !== 'DRAFT'` filter in `RequestJourneySection` data so drafts appear on dashboard

---

### Phase 6: Submit Confirmation Polish (P10)

**Modified: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- Add descriptive toast after submit: `Challenge "${title}" submitted to Curator. Track progress in My Challenges.`

---

### Not in Scope (Already Working or Verified)

- **P6 (My Portfolio):** Sidebar already hides it for seeking-org-only users. Route guard is belt-and-suspenders.
- **P7 (Edit capability):** Covered by P2 (resume editing from draft)
- **Database cleanup:** Will not run destructive queries. User can soft-delete via the new MyChallengesPage UI.

## Files Changed

| File | Action |
|------|--------|
| `src/pages/cogniblend/MyChallengesPage.tsx` | **New** — Full My Challenges page with status cards and actions |
| `src/App.tsx` | **Modified** — Replace placeholder route, add lazy import |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | **Modified** — Draft ID tracking, resume editing, better toast |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | **Modified** — Add `useUpdateDraft` mutation |
| `src/pages/cogniblend/PublicChallengeDetailPage.tsx` | **Modified** — Role-aware view, extended_brief display, null guards |
| `src/hooks/cogniblend/usePublicChallenge.ts` | **Modified** — Add extended_brief + context fields to SELECT |
| `src/hooks/cogniblend/useBrowseChallenges.ts` | **Modified** — Filter to published/active only |
| `src/pages/cogniblend/CogniDashboardPage.tsx` | **Modified** — Include drafts in journey section |

