

# TechSpec v1.0-5 Audit — Verification Results

## STATUS SUMMARY

| Item | Status | Detail |
|---|---|---|
| **A. R1 File Sizes** | FIXED | EnrollmentDeleteDialog: 180 lines, ManagerApprovalDashboard: 146 lines, AddIndustryDialog: 142 lines. Sub-components created in `deletion/` directory. |
| **B. R2 Layer Separation** | PARTIAL | `ChallengeFeed` and `ManagerApprovalDashboard` — FIXED (use hooks). **`ChallengeDetailPublic` still imports `supabase` directly** (line 13) for auth session check. Needs extraction to a `useAuthSession` hook. |
| **C. Missing Components** | FIXED | `ProviderPublicCard`, `VipCertBadge` created. |
| **D. Missing Hooks** | FIXED | `useVipInvitation`, `usePublicChallenges`, `useProviderExpertise` all created. |
| **E1. vip_invitations schema** | FIXED | All columns present: `tenant_id`, `invitation_token`, `invitee_email`, `invitee_name`, `industry_segment_id`, `personal_message`, `provider_id`. |
| **E2. provider_org_details schema** | FIXED | All columns present: `tenant_id`, `org_type`, `org_website`, `designation`, `manager_phone`, `manager_approval_status`. |
| **E3. community_posts schema** | FIXED | `tenant_id` and `parent_id` both present. |
| **E4. ChallengeCard days remaining** | FIXED | Now uses `closingDate` with `differenceInDays(parseISO(closingDate), new Date())`. Shows "Xd left" or "Closed". Has `role="article"`. |
| **E5. ChallengeDetailPublic Spec 6.6** | PARTIAL | 150-char preview: DONE. Auth-gated sections (problem statement, scope): DONE. **Still missing**: Evaluation criteria section, Q&A thread section, "Submit abstract" CTA, Match score badge for Level 2+. |
| **F. register-provider** | FIXED | Public endpoint, no auth required. Creates auth user + solution_providers row + returns session. |
| **F. pg_cron schedules** | NOT FIXED | No cron jobs configured for `compute-performance-scores`, `expire-stale-invitations`, `send-manager-reminder`, `public-platform-stats`. |
| **G. R12 Accessibility** | FIXED | ChallengeCard now has `role="article"`. |

---

## REMAINING GAPS (3 items)

### 1. R2 Violation: `ChallengeDetailPublic` still imports supabase (line 13)
The auth session check (`supabase.auth.getSession()`) is inline. Extract to a shared `useAuthSession` hook in `src/hooks/queries/`.

### 2. ChallengeDetailPublic missing Spec 6.6 gated sections
Currently shows problem_statement and scope when authenticated, but missing:
- "Evaluation criteria" gated card
- "Q&A thread" gated card (placeholder)
- "Submit abstract / expression of interest" CTA button
- Match score badge for authenticated Level 2+ providers at 65%+

### 3. pg_cron schedules not configured
Four edge functions need cron scheduling. This requires SQL INSERT via the insert tool (not migrations, as it contains project-specific URLs/keys).

---

## IMPLEMENTATION PLAN

### Step 1: Extract auth session to `useAuthSession` hook
Create `src/hooks/queries/useAuthSession.ts` with the `supabase.auth.getSession()` call. Update `ChallengeDetailPublic` to use it, removing the direct supabase import.

### Step 2: Add missing gated sections to `ChallengeDetailPublic`
Add placeholder cards for Evaluation Criteria, Q&A Thread, and a "Submit Expression of Interest" CTA button in the authenticated view. Add match score badge placeholder.

### Step 3: Configure pg_cron schedules
Use the Supabase insert tool to schedule:
- `compute-performance-scores`: daily at 02:00 UTC
- `expire-stale-invitations`: daily at 03:00 UTC
- `send-manager-reminder`: daily at 09:00 UTC
- `public-platform-stats`: every 5 minutes

