
Goal: Permanently fix the AM → Challenge Architect → Curator handoff so:
1) all MP AM-created requests appear in CA inbox,
2) opening a request shows AM brief data prefilled in CA spec screen,
3) CA-updated data reliably flows into Curator screens.

Root-cause analysis (confirmed from current code + network traces)
1. Dashboard is AM-centric, not CA-centric  
   - `CogniDashboardPage` always renders AM-style sections.  
   - `MyRequestsTracker` uses `useMyRequests(..., 'mine')` (filters by `created_by = current user`), so CA won’t see AM-created requests.  
   - `MyActionItemsSection` only treats `DRAFT | RETURNED | AM_APPROVAL_PENDING` as actionable, so Phase 2 active spec work is omitted.

2. Backend phase-role mapping is still CR-only for Phase 2  
   - `get_phase_required_role(2)` returns `CR` globally (no MP/AGG split).  
   - `get_user_dashboard_data`, `complete_phase`, `get_valid_transitions` depend on that role mapping.  
   - If MP uses `CA`, workflow checks still behave as if `CR` is required.

3. AM intake does not reliably assign the intended architect  
   - `SimpleIntakeForm` imports architect hook but does not persist `architect_id` into submission payload.  
   - `useSubmitSolutionRequest` ignores explicit architect assignment and only tries pool auto-assign fallback.  
   - `useAutoAssignChallengeRoles` has CA phase classification gap (`assignment_phase` ternary handles CR/CU/else only).

4. Curator return-notification query has an active-row bug  
   - `CurationActions` creator lookup uses `.eq("status","ACTIVE")` on `user_challenge_roles`; table uses `is_active`.  
   - This can break CA/CR notification handoff on returns.

5. Demo data drift/mixing adds confusion  
   - Existing seeded records still show `CR` for Chris on MP challenge.  
   - `setup-test-scenario` currently assigns every user’s roles to both demo challenges, which pollutes role realism and inbox expectations.

Implementation plan
Phase A — Fix canonical workflow ownership in DB (permanent)
1. Add a migration to make phase ownership model-aware for MP vs AGG.
   - Introduce a model-aware role resolver (for Phase 1 and 2 in particular):  
     - MP: Phase 1 = AM, Phase 2 = CA  
     - AGG: Phase 1 = RQ (or bypassed), Phase 2 = CR
2. Update workflow functions to use model-aware required role logic:
   - `get_user_dashboard_data` (needs_action/waiting_for)
   - `complete_phase` (permission checks and next-actor handoff)
   - `get_valid_transitions` (action availability + waiting_for)
3. Keep backward compatibility where needed so old CR-assigned MP rows don’t break during rollout, then migrate data.

Phase B — Data correction / backfill
4. Add migration backfill for existing MP challenge assignments:
   - Convert MP challenge role assignments from `CR` to `CA` where appropriate.
   - Avoid duplicates via safe upsert/deactivate pattern.
5. Ensure AM-created MP challenges have exactly one active CA assignment for spec ownership.

Phase C — Frontend inbox routing to the right screen
6. Make dashboard role-adaptive:
   - AM/RQ view: keep current “My Requests” behavior.
   - CA/CR view: show “Incoming Requests” from assigned Phase 2 challenges (not created_by filter).
7. Update action routing:
   - For CA/CR Phase 2 items, action must open `/cogni/challenges/:id/spec`.
   - Keep AM approval rows routed to AM review page.
8. Expand actionable criteria:
   - Include Phase 2 `ACTIVE` for CA/CR in `MyActionItemsSection`.

Phase D — Ensure AM brief prefill in CA screen
9. Ensure AM intake payload always writes canonical challenge fields used by CA spec view:
   - `problem_statement`, `scope`, `reward_structure`, `phase_schedule`, `extended_brief`.
10. Keep/verify AM brief reference panel in `AISpecReviewPage` bound to those same fields (already present; verify wiring after inbox fix).

Phase E — Ensure CA → Curator data streaming
11. Fix `CurationActions` creator lookup (`is_active` filter) so returns/notifications target CA/CR correctly.
12. Verify Phase 2 completion pushes same `challenges` record into Phase 3, and `CurationReviewPage` reads that record fields directly (single-source-of-truth continuity).

Phase F — Demo consistency hardening
13. Update `setup-test-scenario` to:
   - Seed MP challenge with AM→CA ownership only (not role-spam on both challenges),
   - Seed AGG challenge with RQ→CR ownership only.
14. Re-seed `new_horizon_demo` after deployment so Chris login consistently resolves as CA with MP request visibility.

Target files (expected)
- `supabase/migrations/*` (new migration for model-aware role checks + backfill)
- `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`
- `src/components/cogniblend/dashboard/MyRequestsTracker.tsx` (or split CA inbox component)
- `src/pages/cogniblend/CogniDashboardPage.tsx`
- `src/components/cogniblend/SimpleIntakeForm.tsx`
- `src/hooks/cogniblend/useSubmitSolutionRequest.ts`
- `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`
- `src/components/cogniblend/curation/CurationActions.tsx`
- `supabase/functions/setup-test-scenario/index.ts`

Validation checklist (must pass)
1. AM (MP) submits brief → challenge has active `CA` assignment.
2. Chris login shows active role “Challenge Architect”, and inbox lists AM-created MP request.
3. Clicking item opens CA spec page with AM content visible in reference panel + mapped fields.
4. CA edits/submits to next phase → Curator queue sees updated fields (same challenge record).
5. Curator return flow notifies CA correctly.
6. AGG path remains intact (RQ→CR, no MP regressions).

Notes
- The refresh-token console error is unrelated to this handoff bug.
- This plan intentionally fixes both logic and data, so behavior stays correct for new and existing records.
