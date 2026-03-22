
Goal: Rebuild the Account Manager dashboard into exactly 3 clear sections and stop all wrong-screen navigation.

1) Root cause analysis (why it feels broken now)
- Wrong “View Spec” destination: dashboard sends AM users to `/cogni/challenges/:id/spec` (AI Spec page), which includes CR/CU content (Domain Targeting, solver config) and even triggers auto-save side effects.
- “My Requests” is not truly “my”: current query is org-scoped (`organization_id = orgId`) instead of AM-scoped (`created_by = current user`), so unrelated records can appear.
- Action items are incomplete/misrouted: AM approval rows route to `/cogni/approval` instead of AM review route `/cogni/my-requests/:id/review`.
- Transition visibility is present but too raw: timeline uses audit data, but not surfaced as a dedicated “where is my request now” journey view.

2) Target dashboard (3 sections only)
- Section A: My Requests (only what AM entered)
  - Table columns: Title, Current Status, Current Phase, With Whom, SLA, Last Updated, View.
  - “View” opens AM-only read-only brief page (not spec/manage/editor).
- Section B: My Action Items (Need Attention / Notifications / Approvals Required)
  - Unified queue of:
    - `AM_APPROVAL_PENDING` challenges
    - AM drafts/returned items
    - unread high-priority notifications tied to requests
  - Clear action buttons: Review & Approve / Continue / Revise / Open Notification.
- Section C: Request State Transition Path
  - Dedicated journey panel for selected request.
  - Timeline rows: date-time, action, from phase, to phase, current owner, SLA state.
  - Highlights current state and “who owns it now”.

3) Implementation plan (files + changes)
- `src/pages/cogniblend/CogniDashboardPage.tsx`
  - Replace current mixed layout with only:
    1) MyRequestsSection
    2) MyActionItemsSection
    3) RequestJourneySection
  - Remove extra widgets from this AM dashboard view (no duplicate tables).

- `src/hooks/queries/useMyRequests.ts`
  - Add AM scope mode (`scope: 'mine' | 'org'`) and userId filter.
  - For AM dashboard calls, enforce `created_by = auth user`.
  - Keep org scope for pages that still need org-wide behavior.

- `src/components/cogniblend/dashboard/MyRequestsTracker.tsx`
  - Convert to AM-only “My Requests” table (mine scope).
  - Remove routing to `/spec` and `/cogni/challenges/:id`.
  - Route “View” to new AM read-only page: `/cogni/my-requests/:id/view`.
  - Add SLA column from `sla_timers` active timer.
  - Keep row expansion lightweight or move full timeline to Section C.
  - Fix current `Collapsible` table-row composition warning.

- `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`
  - Correct AM approval route:
    - `AM_APPROVAL_PENDING` -> `/cogni/my-requests/:id/review`
  - Include unread request-linked notifications and SLA urgency sorting.
  - Keep only actionable items (no passive inventory rows).

- `src/components/cogniblend/dashboard/RequestJourneySection.tsx` (new)
  - Selected request lifecycle visualization using `audit_trail` (+ current challenge state + SLA timer).
  - Human labels for actions/phases and “with whom” ownership.

- `src/pages/cogniblend/AMRequestViewPage.tsx` (new)
  - Read-only AM brief screen that mirrors what AM entered in intake:
    - Title
    - Problem Summary
    - Sector/Domain
    - Budget Range
    - Timeline Urgency
    - Commercial Success (optional)
    - Approval-before-publish toggle
  - No CR/CU/ID data blocks, no taxonomy matrix, no solver settings, no curation/approval tabs.

- `src/App.tsx`
  - Add route: `/cogni/my-requests/:id/view` -> `AMRequestViewPage`.

- `src/hooks/cogniblend/useSubmitSolutionRequest.ts`
  - Fix title persistence bug so AM-entered title is actually stored/used.
  - (Current logic derives title from problem text; this must use AM title field).

4) Data rules to enforce (non-negotiable)
- “My Requests” = only records created by current AM (plus existing ownership checks).
- Dashboard “View” must never navigate AM into CR/CU spec tooling.
- AM approval tasks always surface in Action Items and open AM review page.
- Transition history must show both chronology and current owner state.

5) Acceptance criteria
- Clicking “View” from My Requests always shows AM-only read-only brief (screen-like to your provided form), nothing extra.
- No Domain Targeting / Proficiency / Specialities appears in AM “View”.
- AM approval requests from Curator appear in My Action Items and open review/approve page.
- Each request shows an understandable lifecycle path with timestamps, current status, owner, and SLA.
- Dashboard contains only the 3 requested sections and no redundant duplicate lists.
