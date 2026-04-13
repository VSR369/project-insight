

# Gap Analysis: What's Already Done vs. What Remains

## Already Implemented (Chunks 1-10)

| Gap Item | Status |
|----------|--------|
| A1: Add columns to solution_providers (bio_tagline, linkedin_url, etc.) | DONE — migration exists, 8/9 columns added. Missing: `is_vip`, `invitation_code` |
| A2: cert_path on enrollments | DONE differently — separate `provider_certifications` table with cert_path column |
| B1: provider_solution_types junction | DONE — table + RLS + hooks + SolutionTypesSelector UI |
| provider_certifications table | DONE — full table with 3-path support, star_tier, composite_score |
| provider_performance_scores table | DONE — 6 dimensions + composite |
| performance_score_weights table | DONE — admin-configurable weights |
| vw_provider_resolved_cert view | DONE — MAX star tier across paths |
| VIP auto-certification trigger | DONE — fn_auto_certify_vip trigger on solution_providers |
| Edge: compute-performance-scores | DONE — deployed |
| Edge: auto-certify-performance | DONE — deployed |
| Edge: update-profile-strength | DONE — deployed |
| Edge: public-platform-stats | DONE — deployed |
| profileStrengthService.ts | DONE |
| performanceScoreService.ts | DONE |
| PerformanceRadar component | DONE |
| CertificationBadgeBar (sidebar) | DONE — in LeftSidebar |
| ProfileCompletionBar (sidebar) | DONE — in LeftSidebar |
| CertTierBadge | DONE — in ProfileMiniCard |
| AccessGatingSection (challenge wizard) | DONE |
| useSubmissionEligibility hook | DONE |
| ExpertiseLevelCards component | DONE |
| Tab2Expertise component | DONE |
| ProviderDashboard integration | DONE |

## Remaining Gaps (7 items)

### 1. ALTER TABLE: Add `is_vip` + `invitation_code` to solution_providers
The gap analysis calls for these 2 columns. VIP logic already works via `solution_provider_invitations.invitation_type = 'vip_expert'` and the `handle_new_user` trigger, but explicit columns on solution_providers would allow faster queries.

**Action:** 1 migration — `ALTER TABLE solution_providers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE, ADD COLUMN IF NOT EXISTS invitation_code TEXT UNIQUE;`
Update `handle_new_user` trigger to set `is_vip = TRUE` for vip_expert invitations.

### 2. ALTER TABLE: Add `geographies_served[]` + `outcomes_delivered[]` to provider_industry_enrollments
These array columns are missing from the enrollments table. `GeographyTagSelector` component already exists for reuse.

**Action:** 1 migration adding both columns. Wire into Tab2Expertise with GeographyTagSelector (reuse) and a new OutcomesTagSelector (simple tag input, same pattern).

### 3. Outcomes Delivered tag selector UI
No component exists for selecting outcomes. Needs a simple multi-tag input on the expertise tab.

**Action:** Create `OutcomesTagSelector.tsx` (reuse GeographyTagSelector pattern — free-text tag input). Add to Tab2Expertise below Solution Types.

### 4. Geographies Served selector on expertise tab
`GeographyTagSelector` exists but isn't wired into the enrollment/expertise flow — only used in org registration.

**Action:** Import GeographyTagSelector into Tab2Expertise. Wire to new `geographies_served` column via a hook update to read/write the enrollment record.

### 5. DB Views: `v_provider_dashboard`, `v_challenge_match`, `v_cert_leaderboard`
Only `vw_provider_resolved_cert` exists. The 3 spec views are missing.

**Action:** 1 migration creating all 3 views from existing tables (solution_providers + provider_industry_enrollments + provider_certifications + challenges).

### 6. pg_cron scheduling for nightly edge functions
Edge functions exist but no cron schedule is set up to invoke them nightly.

**Action:** Use the insert tool to create 2 cron jobs via `cron.schedule()` calling `compute-performance-scores` and `auto-certify-performance` (e.g., daily at 2:00 AM and 2:30 AM UTC).

### 7. VIP invitation admin page (provider-specific)
Panel reviewer invitations exist (`InvitePanelMembersTab`). A VIP provider invitation admin page is missing. The `solution_provider_invitations` table already supports `invitation_type = 'vip_expert'` and the acceptance flow works via `handle_new_user`.

**Action:** Create `VipProviderInvitationsPage.tsx` reusing `InvitePanelMembersTab` pattern, filtered to `invitation_type = 'vip_expert'`. Add route under admin.

---

## Implementation Order

1. **Migration:** Add `is_vip`, `invitation_code` to solution_providers + `geographies_served[]`, `outcomes_delivered[]` to provider_industry_enrollments
2. **Migration:** Create 3 DB views
3. **UI:** Add GeographyTagSelector + OutcomesTagSelector to Tab2Expertise
4. **pg_cron:** Schedule nightly edge function invocations
5. **Admin:** VIP provider invitations page

**Total:** 2 migrations, 1 new component (OutcomesTagSelector), 2 component edits (Tab2Expertise + hook), 1 new page (VIP invitations), 2 cron jobs via insert tool.

