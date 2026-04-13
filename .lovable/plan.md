

## Revised Plan: Solution Provider Enrollment Revamp — Leverage Existing, Add Only What's New

---

### EXISTING ASSETS MAP (DO NOT RECREATE)

| Spec Proposes | Already Exists | Action |
|---|---|---|
| `provider_profiles` table | `solution_providers` (23 cols, 38+ file refs) | **Extend** with ~8 additive columns |
| `provider_expertise` table | `provider_industry_enrollments` (multi-industry, expertise_level_id, participation_mode_id, org JSON) | **Reuse** — no new table needed |
| `provider_proficiency_areas` → speciality_id | `provider_specialities` (provider_id, speciality_id, enrollment_id) | **Reuse** as-is |
| 3-level hierarchy | `proficiency_areas` → `sub_domains` → `specialities` | **Exists** — no change |
| `provider_solution_types` | `proficiency_area_solution_type_map` + `md_solution_types` (code, label, group) | **Needs new junction**: `provider_solution_types` |
| `provider_org_details` | `provider_industry_enrollments.organization` (JSONB) + `org_approval_status` | **Reuse** — no new table |
| VIP invitations | `solution_provider_invitations` (email, token, invitation_type, industry_segment_id) | **Extend** with personal_message, status columns |
| `community_posts` | `pulse_cards` + `pulse_content` (full social system) | **No new table** — map spec queries to pulse tables |
| `submissions` | `challenge_submissions` (different name) | **Extend** with additive columns |
| Expertise levels | `expertise_levels` (already renamed: Explorer/Catalyst/Maestro/Pioneer) | **No change** |
| Cert tiers | proven/acclaimed/eminent (already renamed) | Spec says basic/competent/expert — **use our names** |
| `PersonalizedFeedHeader` | Already exists in `src/components/pulse/gamification/` | **Enhance** with live DB placeholders |
| `ProfileStrengthMeter` | Already in `src/components/proof-points/` | **Adapt** into left sidebar bar |
| Enrollment wizard (10 steps) | All 17 files in `src/pages/enroll/` | **Wire as Path 1** — zero changes to wizard |

### WHAT'S TRULY NEW (must create from scratch)

| Item | Type |
|---|---|
| `provider_certifications` table | DB — multi-path cert (experience/performance/vip) |
| `provider_performance_scores` table | DB — nightly scoring dimensions |
| `performance_score_weights` table | DB — admin-configurable weights |
| `provider_solution_types` junction | DB — provider ↔ md_solution_types |
| `background_jobs` table | DB — job queue |
| `platform_stats_cache` table | DB — cached homepage stats |
| `vw_provider_resolved_cert` view | DB — MAX stars across paths |
| Additive columns on `solution_providers` | DB — bio_tagline, linkedin_url, portfolio_url, avatar_url, availability, provider_level, profile_strength, phone |
| Additive columns on `challenges` | DB — access_type, min_star_tier, reward_amount, reward_currency |
| Additive columns on `challenge_submissions` | DB — submission_type, award_tier, complexity_level_at_submission |
| `ProfileCompletionBar` component | Frontend — left sidebar |
| `CertificationBar` component | Frontend — separate bar at 100% |
| `Tab1Profile` component | Frontend — profile form (photo, bio, phone, LinkedIn, portfolio, availability) |
| `Tab2Expertise` component | Frontend — expertise declarations |
| `ExpertiseLevelCards` component | Frontend — radio card selector |
| `SolutionTypesSelector` component | Frontend — grouped multi-select |
| `CertificationPathSelector` component | Frontend — 3 path cards |
| `PerformanceTrackDashboard` component | Frontend — 6 dimension gauges |
| `VipCertBadge` component | Frontend |
| `MatchScoreBadge` component | Frontend |
| `DevEnvironmentModal` component | Frontend — feature-flagged |
| `VipWelcomeScreen` component | Frontend |
| `profileStrengthService` | Service — milestone computation |
| `certificationService` | Service — multi-path resolution |
| `performanceScoreService` | Service — dimension aggregation |
| `compute-performance-scores` edge function | Backend — nightly job |
| `public-platform-stats` edge function | Backend — cached stats |
| `update-profile-strength` edge function | Backend — recompute on save |

### TERMINOLOGY RECONCILIATION

The spec uses old names (basic/competent/expert). Our DB already has proven/acclaimed/eminent. All new code will use:
- **proven** (1 star), **acclaimed** (2 stars), **eminent** (3 stars)
- The spec's `cert_label` CHECK constraint will be `('proven','acclaimed','eminent')` not `('basic','competent','expert')`
- `vw_provider_resolved_cert` CASE will map 1→proven, 2→acclaimed, 3→eminent

The spec's `provider_profiles.id = auth.users.id` pattern is incompatible — our `solution_providers.id` is a separate UUID with FK `user_id → auth.users.id`. All new tables will FK to `solution_providers.id`, not `auth.users.id`.

---

### PHASED IMPLEMENTATION (10 chunks)

#### Chunk 1: Database Foundation — Extend Existing Tables
- ALTER `solution_providers` ADD: `bio_tagline`, `linkedin_url`, `portfolio_url`, `avatar_url`, `availability`, `provider_level`, `profile_strength`, `phone`
- ALTER `challenges` ADD: `access_type`, `min_star_tier`, `reward_amount`, `reward_currency`
- ALTER `challenge_submissions` ADD: `submission_type`, `award_tier`, `complexity_level_at_submission`
- ALTER `solution_provider_invitations` ADD: `personal_message`, `status`
- All nullable or with safe defaults

#### Chunk 2: Database Foundation — New Tables
- CREATE `provider_certifications` (FK to solution_providers.id, cert_path, star_tier, cert_label using proven/acclaimed/eminent)
- CREATE `provider_performance_scores` (6 dimensions + composite)
- CREATE `performance_score_weights` (with seed data)
- CREATE `provider_solution_types` (provider_id FK, solution_type_id FK)
- CREATE `background_jobs`
- CREATE `platform_stats_cache`
- CREATE VIEW `vw_provider_resolved_cert`
- CREATE trigger `fn_auto_certify_vip` on solution_providers
- RLS policies on all new tables
- Indexes

#### Chunk 3: Services Layer
- `src/services/enrollment/profileStrengthService.ts` — pure function, milestone computation (20/60/70/85/100%)
- `src/services/enrollment/certificationService.ts` — MAX rule resolver across paths
- `src/services/enrollment/performanceScoreService.ts` — dimension aggregation + weight application
- `src/constants/enrollment.constants.ts` — milestones, availability options, outcome tags

#### Chunk 4: Hooks Layer
- `src/hooks/queries/useProviderProfile.ts` — extended hook for new solution_providers columns
- `src/hooks/queries/useProviderCertifications.ts` — query/mutation for provider_certifications
- `src/hooks/queries/useProviderPerformanceScore.ts` — read own scores
- `src/hooks/queries/useProviderSolutionTypes.ts` — CRUD for provider ↔ solution types
- `src/hooks/queries/usePlatformStats.ts` — public stats from cache

#### Chunk 5: Profile UI — Tab 1 & Tab 2
- `src/components/enrollment/Tab1Profile.tsx` — photo, bio, phone, LinkedIn, portfolio, availability (RHF + Zod)
- `src/components/enrollment/Tab2Expertise.tsx` — expertise level, industry, proficiency areas, solution types, outcomes
- `src/components/enrollment/ExpertiseLevelCards.tsx` — radio card component from expertise_levels table
- `src/components/enrollment/SolutionTypesSelector.tsx` — grouped multi-select from md_solution_types
- All under 250 lines each

#### Chunk 6: Sidebar Bars — Profile + Certification
- `src/components/provider/ProfileCompletionBar.tsx` — milestone progress bar for Pulse left sidebar
- `src/components/provider/CertificationBar.tsx` — separate bar shown only at 100% profile, with live DB motivation messages
- Modify `src/components/pulse/layout/LeftSidebar.tsx` — add both bars
- `src/components/provider/MatchScoreBadge.tsx` — per-challenge match indicator

#### Chunk 7: Certification Paths UI
- `src/components/certification/CertificationPathSelector.tsx` — 3 path cards (Experience wires to existing wizard, Performance shows dashboard, VIP shows badge)
- `src/components/certification/PerformanceTrackDashboard.tsx` — 6 dimension gauges + composite
- `src/components/certification/VipCertBadge.tsx` — crown badge display
- Modify existing `src/pages/enroll/Certification.tsx` — integrate path selector

#### Chunk 8: Auth Enhancements
- `src/components/auth/DevEnvironmentModal.tsx` — role quick-logins, screen navigator, DB controls (feature-flagged `VITE_SHOW_DEV_ENV`)
- `src/components/auth/VipWelcomeScreen.tsx` — crown welcome, token acceptance
- Enhance `PersonalizedFeedHeader` with live DB placeholder queries

#### Chunk 9: Edge Functions
- `supabase/functions/compute-performance-scores/index.ts` — nightly aggregation
- `supabase/functions/public-platform-stats/index.ts` — cached stats endpoint
- `supabase/functions/update-profile-strength/index.ts` — recompute on save

#### Chunk 10: Integration & Polish
- Wire challenge access gating (RLS on challenge_submissions based on cert tier)
- Add access_type + reward_amount fields to existing challenge admin forms
- Add submission_type to existing submission flow
- Wire `vw_provider_resolved_cert` into provider directory card rendering

### FILES MODIFIED (existing)
- `src/components/pulse/layout/LeftSidebar.tsx` — add ProfileCompletionBar + CertificationBar
- `src/pages/enroll/Certification.tsx` — add CertificationPathSelector
- `src/components/pulse/gamification/PersonalizedFeedHeader.tsx` — enhance with live DB placeholders
- Challenge admin form (add access_type, reward_amount fields)
- Submission flow (add submission_type field)

### FILES UNTOUCHED
- All 17 enrollment wizard pages (wired as Path 1 with zero changes)
- All existing Pulse social feed components
- All existing auth flow, guards, RBAC
- All existing RLS policies
- All 38+ files referencing solution_providers
- All existing React Query hooks

### TOTAL SCOPE
- ~6 new DB tables, ~4 table ALTERs, 1 view, 1 trigger
- ~20 new frontend files (all under 250 lines)
- 3 new edge functions
- ~5 existing files modified (additive only)
- Zero breaking changes

### RECOMMENDED START
Chunk 1 (extend existing tables) — safest, all additive, unblocks everything.

