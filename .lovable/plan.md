

# TechSpec v1.0-4 Gap Analysis: What's Done vs What's Missing

## Summary

The spec (31 pages, 18 sections) covers DB schema, edge functions, components, UX flows, RLS, and background jobs. Most infrastructure is in place, but several critical DB-level and UI-level gaps remain.

---

## IMPLEMENTED (No Action Needed)

| Spec Section | Requirement | Status |
|---|---|---|
| 2.5 | `provider_certifications` table | Done |
| 2.9 | `performance_score_weights` with 6 spec dimensions | Done (verified in DB) |
| 2.3 | `provider_proficiency_areas` table | Done |
| 2.4 | `provider_solution_types` table | Done |
| 3.1 | `challenges` — `access_type`, `min_star_tier`, `complexity_level`, `reward_amount` | Done |
| 3.5 | `vw_provider_resolved_cert` view | Done |
| — | `solution_providers.is_vip`, `invitation_code`, `profile_strength` | Done |
| — | `fn_auto_certify_vip` function + trigger | Done |
| — | `background_jobs` table | Done |
| 10.2 | `profileStrengthService.ts` | Done |
| 10.1 | `matchScoreService.ts` | Done |
| 10.1 | `performanceScoreService.ts` | Done |
| 10.1 | `certificationService.ts` | Done |
| 10.1 | `CertificationPathSelector` component | Done |
| 10.1 | `PerformanceTrackDashboard` component | Done |
| 10.1 | `MatchScoreBadge` component | Done |
| 10.1 | `VipWelcomeScreen` component | Done |
| 10.1 | `Tab1Profile`, `Tab2Expertise` components | Done |
| 10.1 | `ExpertiseLevelCards`, `SolutionTypesSelector` | Done |
| 6.1 | `HomePage` with `HeroSection` + `LiveChallengeSidebar` | Done |
| 6.2 | `DevEnvironmentModal` (rendered on homepage) | Done |
| 11 | Edge functions: `compute-performance-scores`, `public-platform-stats`, `update-profile-strength`, `accept-vip-invitation`, `send-vip-invitation`, `grant-certification`, `expire-stale-invitations` | Done |
| Hooks | `useProviderCertifications`, `useProviderPerformanceScore`, `usePlatformStats`, `useProviderProfile` | Done |

---

## GAPS — Grouped by Priority

### P1: Missing DB Tables (Spec requires, DB does not have)

1. **`provider_profiles` table (Spec 2.1)** — Does NOT exist. The codebase uses `solution_providers` instead. The spec defines a dedicated `provider_profiles` table with `id REFERENCES auth.users(id)`, `provider_level`, `profile_strength`, `bio_tagline`, `avatar_url`, `linkedin_url`, `portfolio_url`, `availability`, `enrollment_source`. Either create this table or confirm `solution_providers` covers all columns.

2. **`provider_expertise` table (Spec 2.2)** — Does NOT exist. Spec requires a single-row-per-provider table storing `expertise_level_id`, `industry_segment_id`, `geographies_served[]`, `outcomes_delivered[]`. Currently this data lives on `provider_industry_enrollments` — needs reconciliation.

3. **`vip_invitations` table (Spec 2.7)** — Does NOT exist. The `send-vip-invitation` and `accept-vip-invitation` edge functions reference it but the table was never created.

4. **`provider_org_details` table (Spec 2.8)** — Does NOT exist. Required for Path 1 Experience Track participation mode (independent/org_representative/self_accountable) + org details + manager approval.

5. **`community_posts` table (Spec 3.3)** — Does NOT exist in public schema. The `post_type` and `helpful_votes` columns were attempted in a migration but the table itself is missing, so Path 2 scoring has no data source.

### P2: Missing DB Columns on Existing Tables

6. **`provider_performance_scores` — still has OLD generic columns** (quality_score, consistency_score, engagement_score, responsiveness_score, expertise_depth_score, community_impact_score). The spec-aligned columns (`score_community_engagement`, `score_date`, `community_posts_count`, `wins_platinum`, etc.) were defined in hooks/services but the migration to add them appears to have failed or not run. The DB still has the old schema.

7. **`submissions` table — missing `submission_type`, `award_tier`, `complexity_level_at_submission`** (Spec 3.2). These columns do not exist yet.

8. **`challenges` table — missing `reward_currency`** (Spec 3.1). `reward_amount` exists but `reward_currency` does not.

### P3: Missing UI Components (Spec 10.1)

9. **`ProfileCompletionBar`** — exists in `src/components/enrollment/` but needs verification it's wired into the Pulse left sidebar per Spec 8.1.

10. **`CertificationBar`** — Spec 8.2 requires a SEPARATE certification progress bar (distinct from profile completion) shown only at 100% profile. Not found as a standalone component.

11. **`PersonalizedFeedHeader`** — Spec 8.2 requires motivational messages with live DB placeholders in the Pulse feed header. Not found.

12. **`ChallengeFeed` + `ChallengeCard`** — Spec 6.4 requires public challenge cards showing title, domain, reward, complexity badge, access badge, days remaining. `BrowseChallengesPage` exists but no public-specific `ChallengeFeed`/`ChallengeCard`.

13. **`ChallengeDetailPublic`** — exists at `src/pages/public/ChallengeDetailPublic.tsx` but needs verification of gated sections per Spec 6.6.

14. **`PlatformStatsBar`** — exists at `src/components/public/PlatformStatsBar.tsx` but not rendered on homepage.

15. **`AuthModal`** — Spec 6.1 requires sign-in/register tabs in a modal. Currently buttons link to `/login`. No modal.

### P4: Missing Background Jobs / Triggers

16. **Profile strength sync trigger (Spec 15)** — `trg_profile_strength_update()` that recomputes `profile_strength` after profile/expertise/solution type changes. `update-profile-strength` edge function exists but no DB trigger to call it automatically.

17. **Manager approval reminder cron (Spec 15)** — `remind_pending_manager_approvals()` every 48hrs. `send-manager-reminder` edge function exists but no cron schedule.

18. **Platform stats cache cron (Spec 15)** — `cache_platform_stats()` every 5 min. `public-platform-stats` edge function exists but no cron to pre-cache.

### P5: Registration Flow Gap

19. **`register-provider` edge function (Spec 11)** — No dedicated edge function for provider registration that creates `provider_profiles` row + sets `provider_level=1`. Currently registration uses standard Supabase Auth without the profile row creation.

---

## Implementation Plan

### Phase 1: DB Schema (3 migrations)
- Create `provider_profiles`, `provider_expertise`, `vip_invitations`, `provider_org_details`, `community_posts` tables with RLS
- ALTER `provider_performance_scores` to add spec-aligned columns (score_community_engagement, score_date, raw count columns) alongside existing generic columns
- ALTER `submissions` to add `submission_type`, `award_tier`, `complexity_level_at_submission`
- ALTER `challenges` to add `reward_currency`

### Phase 2: Missing Components (5 files)
- `CertificationBar` — separate progress bar for cert track, shown at 100% profile
- `PersonalizedFeedHeader` — motivational messages with live DB placeholders
- `ChallengeFeed` + `ChallengeCard` — public challenge cards per Spec 6.4
- Wire `PlatformStatsBar` into `HomePage`
- `AuthModal` — sign-in/register tabs modal (or keep current link approach)

### Phase 3: Edge Function + Cron
- `register-provider` edge function
- Cron schedules for manager-reminder (48hr) and platform-stats-cache (5min)
- Profile strength sync trigger

### Phase 4: Wire existing components
- Wire `ProfileCompletionBar` + `CertificationBar` into Pulse left sidebar
- Wire `PersonalizedFeedHeader` into Pulse feed
- Verify `ChallengeDetailPublic` gated sections match Spec 6.6

---

## Technical Details

**Why `provider_performance_scores` migration likely failed:** The previous migration attempted to add columns but the DB still shows the old generic schema (quality_score, consistency_score, etc.). The hooks and services reference the new columns — this means runtime errors when the performance dashboard is loaded.

**`provider_profiles` vs `solution_providers`:** The spec defines `provider_profiles` but the codebase uses `solution_providers`. The VIP trigger references `solution_providers`. A decision is needed: rename or alias. Recommendation: keep `solution_providers` but ensure all spec-required columns exist on it.

**Estimated effort:** 3 migrations + 1 edge function + 5 components + 3 cron schedules

