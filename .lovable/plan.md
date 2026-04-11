
Re-verified the current repo and the live `notification_routing` data.

Actual status right now
- Bug 1 `draftForm` null relay: already fixed in source.
- Bug 2 missing `cogni-my-challenges` invalidation: already fixed in source.
- Bug 3 draft `referenceUrls` loss: already fixed in source.
- Bug 4 `assign_challenge_role` RECORD vs JSONB: fixed in the latest repo migration; I will only re-apply if the live DB is behind.
- Bug 5 `complete_phase` `sla_hours`: already fixed in the latest repo migration.
- Bug 6 `sendRoutedNotification` not called: already fixed in `useChallengeSubmit`; the remaining notification problem is now caused by stale routing data.
- Bug 7 stale `notification_routing` phases: still open and confirmed in the live DB.
- Bug 8 org details missing: still open/partial.
- Bug 9 “My Version” hook fallback: still open.
- Bug 10 phase-2 legal docs empty: partially fixed in creator detail, still open in curator/curation flow.

Root causes to fix
1. `notification_routing` still uses the old phase mapping in the database.
   - Confirmed: phase 2 `ROLE_ASSIGNED` / `PHASE_COMPLETE` still route to `CR`, while `CU` is still on phase 3.

2. Organization details are not implemented as a proper detail section.
   - The page only shows compact header metadata.
   - `usePublicChallenge` also does not expose `organization_id`, which blocks richer org display and AGG legal-template preview.

3. “My Version” still depends too heavily on `creator_snapshot`.
   - `buildMyVersionSections` only reads the snapshot.
   - The current snapshot write path in `useChallengeSubmit` still does not include `hook`.
   - Result: hook can disappear from “My Version”.

4. Legal-doc preview logic is not shared across creator + curator flows.
   - `ChallengeLegalDocsCard` has preview behavior, but curation `legal_docs` rendering still only reads `challenge_legal_docs`.
   - So phase 2 still shows “No legal documents found” in curator review.
   - AGG preview can also fail because `organization_id` is not loaded.

Implementation plan
1. Reconcile live DB state
   - Verify the live `assign_challenge_role` body matches the repo’s JSONB fix.
   - If the DB is behind, apply the pending function migration.
   - Update existing `notification_routing` rows to the 10-phase model so phase 2 routes curator notifications correctly.

2. Fix org details properly
   - Extend `usePublicChallenge` / `PublicChallengeData` with `organization_id` and the org fields needed for display.
   - Add a dedicated read-only organization details section instead of relying on header text only.
   - Keep the header summary, but make org details an explicit section.

3. Fix “My Version” fallback and future snapshot correctness
   - Extract snapshot-building logic from the oversized `useChallengeSubmit.ts` into a typed helper/service.
   - Include `hook` in new `creator_snapshot` writes.
   - Update `buildMyVersionSections` to accept fallback live challenge data for legacy snapshots.
   - Pass that fallback data from `CreatorChallengeDetailView`.

4. Fix phase-2 legal docs in both views
   - Move legal preview fetching out of components into a typed hook/service to align with Lovable layering.
   - Reuse the same preview model in:
     - creator detail legal card
     - curator/curation `legal_docs` renderer
   - Show planned templates during phase 2 when no actual `challenge_legal_docs` rows exist.
   - Keep real `challenge_legal_docs` as the source of truth from phase 3 onward.

5. Regression-check the already-fixed items instead of re-editing them
   - Save Draft first click
   - draft save/resume with reference URLs
   - submit → CU assignment → routed notification after the routing remap

Files/areas to touch
- `src/hooks/cogniblend/usePublicChallenge.ts`
- `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` (likely split to stay under Lovable file limits)
- new organization details component(s)
- `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx`
- `src/hooks/cogniblend/useChallengeSubmit.ts` (with extraction, not further growth)
- new legal preview hook/service
- `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx`
- `src/components/cogniblend/curation/renderers/LegalDocsSectionRenderer.tsx`
- `src/components/cogniblend/curation/renderers/renderOpsSections.tsx`
- DB update for `notification_routing`
- DB function verification for `assign_challenge_role`

Expected result
- Curator notifications route correctly at phase 2
- Org details appear as a real detail section
- “My Version” reliably shows hook for both legacy and new challenges
- Phase 2 legal docs no longer appear empty in creator or curator views
- Already-fixed draft bugs stay fixed
