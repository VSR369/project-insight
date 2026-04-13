

# TechSpec v1.0-5 Compliance Audit — Full Results

## Audit Scope
Checked: DB schema (migrations), UI components (file sizes, layer separation), edge functions, hooks, services, triggers, RLS, and workspace rules (R1-R12).

---

## A. FILES EXCEEDING 250-LINE LIMIT (R1 Violation)

**68 files** exceed the 250-line limit. The most critical ones in scope of this spec:

| File | Lines | Action |
|---|---|---|
| `src/components/enrollment/EnrollmentDeleteDialog.tsx` | 430 | Split into sub-components |
| `src/pages/public/ManagerApprovalDashboard.tsx` | 308 | Split into sub-components |
| `src/components/enrollment/AddIndustryDialog.tsx` | 277 | Split form + validation |

Additionally, **65 other files** across the broader codebase exceed 250 lines (admin pages, hooks, services). Full remediation of those is out of scope for this spec but should be tracked separately.

---

## B. LAYER SEPARATION VIOLATIONS (R2)

**Supabase calls found directly in component files** (should be in hooks/services):

1. `src/pages/public/ChallengeDetailPublic.tsx` — `supabase.from('challenges')` inline in component
2. `src/components/public/ChallengeFeed.tsx` — `supabase.from('challenges')` inline in component
3. `src/pages/public/ManagerApprovalDashboard.tsx` — `supabase` calls inline
4. 13 other component files (cogniblend, pulse widgets, registration) have direct supabase calls

---

## C. MISSING COMPONENTS (Spec 10.1)

| Spec Component | Status | Gap |
|---|---|---|
| `ProviderPublicCard` | MISSING | Not found anywhere |
| `ExperienceTrackWizard` | MISSING | Existing 10-step wizard exists but no dedicated wrapper component |
| `VipCertBadge` | MISSING | `CertTierBadge` exists but no VIP-specific variant |
| `ProficiencyAreaSelector` | MISSING | Proficiency taxonomy selector exists in admin but not as spec-named component |

---

## D. MISSING HOOKS (Spec 10.1)

| Spec Hook | Status | Gap |
|---|---|---|
| `useVipInvitation` | MISSING | VIP invitation CRUD hook not found |
| `usePublicChallenges` | MISSING | Challenge feed uses inline query instead of dedicated hook |
| `useProviderExpertise` | MISSING | `useEnrollmentExpertise` exists but no `useProviderExpertise` per spec |

---

## E. DB SCHEMA GAPS

### E1. `vip_invitations` — Missing spec columns
Current migration created the table but is missing vs Spec 2.7:
- `tenant_id` (NOT NULL) — MISSING
- `invitation_token` (unique, hex-encoded) — uses `gen_random_uuid()::text` instead of `encode(gen_random_bytes(32),'hex')`
- `industry_segment_id` FK — MISSING
- `personal_message` — MISSING
- `provider_id` FK (set on acceptance) — MISSING (has `accepted_by` instead)

### E2. `provider_org_details` — Missing spec columns
- `tenant_id` — MISSING
- `org_type` — MISSING (has only `org_name`, `org_role`)
- `org_website` — MISSING
- `designation` — MISSING
- `manager_phone` — MISSING
- `manager_approval_status` CHECK constraint — uses `manager_approved BOOLEAN` instead of spec's text status field

### E3. `community_posts` — Missing spec columns
- `tenant_id` — MISSING (critical for multi-tenancy)
- `parent_id` FK (self-referencing for threads) — MISSING

### E4. `ChallengeCard` shows "days ago" not "days remaining"
Spec 6.4 requires `closing_date - NOW()` (days remaining), but current implementation shows `differenceInDays(new Date(), publishedAt)` (days since published). Also `closing_date` is not fetched at all.

### E5. `ChallengeDetailPublic` — Spec 6.6 partial compliance
- Missing: first 150 chars of problem overview (currently shows full description to all)
- Missing: separate "Full brief + context" gated section
- Missing: "Evaluation criteria" gated section
- Missing: "Q&A thread" gated section
- Missing: "Submit abstract / expression of interest" gated CTA
- Missing: Match score badge for Level 2 at 65%+
- Gating logic only checks `access_type !== 'open_all'` instead of checking auth state

---

## F. EDGE FUNCTION GAPS

| Function | Status | Issue |
|---|---|---|
| `register-provider` | Deployed | Spec says "Auth required: None (public)" but implementation requires auth header. Spec says it should create auth user + provider_profiles row + return session |
| `compute-performance-scores` | Deployed | No pg_cron schedule configured |
| `expire-stale-invitations` | Deployed | No pg_cron schedule configured |
| `send-manager-reminder` | Deployed | No pg_cron schedule configured |
| `public-platform-stats` | Deployed | No 5-min cache cron configured |

---

## G. WORKSPACE RULE COMPLIANCE SUMMARY

| Rule | Status | Issues |
|---|---|---|
| R1: 250 lines | FAIL | 68 files over limit (3 in spec scope) |
| R2: Layer separation | FAIL | 16 component files have direct supabase calls |
| R3: Zero `any` | PASS | No `any` found in enrollment/public/services |
| R4: State management | PARTIAL | ChallengeFeed/ChallengeDetailPublic use inline queries not dedicated hooks |
| R5: Hook order | PASS | No violations found in audited files |
| R6: Four states | PARTIAL | ChallengeDetailPublic missing empty state |
| R7: Forms Zod+RHF | N/A | No new forms in scope |
| R8: Responsive | PASS | Uses `lg:` breakpoint |
| R9: Error handling | PASS | No console.log in spec-scope files |
| R10: Naming | PASS | Follows conventions |
| R11: Performance | PASS | Lazy loading, staleTime configured |
| R12: Accessibility | PARTIAL | ChallengeCard uses `aria-hidden` on icons but cards lack `role="article"` |

---

## IMPLEMENTATION PLAN

### Phase 1: Fix R1 violations (file size > 250 lines)
- Split `EnrollmentDeleteDialog.tsx` (430 lines) into BlockersList, StakeholderNotifications, and main dialog
- Split `ManagerApprovalDashboard.tsx` (308 lines) into ApprovalCard, ApprovalList, and page
- Split `AddIndustryDialog.tsx` (277 lines) into form and validation sub-components

### Phase 2: Fix R2 violations (layer separation) for spec-scope files
- Extract `ChallengeDetailPublic` supabase query into `usePublicChallengeDetail` hook
- Extract `ChallengeFeed` supabase query into `usePublicChallenges` hook
- Extract `ManagerApprovalDashboard` supabase calls into dedicated hook

### Phase 3: DB schema alignment
- ALTER `vip_invitations`: add `tenant_id`, `invitation_token`, `industry_segment_id`, `personal_message`, `provider_id`
- ALTER `provider_org_details`: add `tenant_id`, `org_type`, `org_website`, `designation`, `manager_phone`, replace `manager_approved` with `manager_approval_status` text field
- ALTER `community_posts`: add `tenant_id`, `parent_id` self-referencing FK

### Phase 4: Fix ChallengeCard to show "days remaining" using `closing_date`
- Update `ChallengeFeed` query to fetch `closing_date`
- Update `ChallengeCard` to compute and display days remaining instead of days ago

### Phase 5: Fix ChallengeDetailPublic per Spec 6.6
- Show only first 150 chars publicly, gate full brief/eval criteria/Q&A/submit behind auth check
- Add Match score badge section for authenticated Level 2+ providers

### Phase 6: Create missing components
- `useVipInvitation` hook for VIP invitation CRUD
- `useProviderExpertise` hook for provider expertise CRUD
- `usePublicChallenges` hook (extracted from ChallengeFeed)
- `ProviderPublicCard` component
- `VipCertBadge` component

### Phase 7: Fix `register-provider` edge function
- Make it publicly accessible (no auth required) per spec — it should create the auth user AND the provider_profiles row

### Estimated scope: 3 migrations + 6 new files + 6 file splits + 3 refactors

