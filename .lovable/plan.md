
# Gap Analysis: Tech Specs vs. Current Implementation

This document identifies what is implemented, partially implemented, and missing across both spec documents.

---

## Summary

| Category | Fully Implemented | Partially Implemented | Not Implemented |
|----------|------------------|-----------------------|-----------------|
| Database Tables & Migrations | 18 | 3 | 2 |
| Business Rules (38 total) | ~20 | ~10 | ~8 |
| UI Components | 14 | 5 | 6 |
| Service Layer Logic | 6 | 3 | 3 |

---

## DOCUMENT 1: REG-001 Organization Identity (Tech Specs v3.0)

### REG-001 -- Organization Identity (Step 1)

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| 14 form fields with Zod validation | PARTIAL | Zod schema exists but is missing `regex` validation on `legal_entity_name` (spec requires `/^[a-zA-Z0-9\s.,&'-]+$/`) and `logo_file`, `profile_document`, `verification_documents` fields in schema |
| Organization Logo upload (FileUploadZone) | MISSING | FileUploadZone component exists, but the OrganizationIdentityForm does NOT include logo or profile document upload fields -- only verification docs are rendered |
| Organization Profile Document upload | MISSING | Same as above -- no profile document upload zone in the form |
| BR-REG-001: Country auto-populates locale | DONE | CountryLocale hook populates currency, phone code, date/number format |
| BR-REG-002: Org Type drives workflows | DONE | OrgTypeInfoBanner + orgTypeFlags context |
| BR-REG-004: Sanctioned countries excluded | DONE | Countries filtered by `is_active = true` |
| BR-REG-007: Duplicate org detection | DONE | DuplicateOrgModal with pre-insert check |
| BR-CTY-001: Locale formatting | PARTIAL | Locale data captured but no `LocaleContext` provider for global formatting across all screens |
| BR-SUB-001: Subsidized pricing | PARTIAL | Discount percentage captured but no `verification_expiry_date` set (spec requires 1-year annual re-verification) |
| BR-SUB-002: Annual re-verification | MISSING | No background job or expiry date logic |
| BR-TCP-001: Country pricing support check | MISSING | No pre-insert validation checking if `MD_TIER_COUNTRY_PRICING` has rows for selected country |
| Shell-first rendering | DONE | Layout wraps content correctly |
| Hook ordering | DONE | Follows correct section pattern |
| Data Privacy Notice banner | MISSING | Spec requires persistent info banner at bottom of form |
| "Already have an account? Sign in" link | MISSING | Not visible in OrganizationIdentityPage |
| Accessibility (WCAG 2.1 AA) | PARTIAL | Labels present, but no `aria-describedby`, `aria-live` regions, skip links, or focus management on error |

### REG-002 -- Primary Contact & Access (Step 2)

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| Form fields (9 fields + OTP) | PARTIAL | `department_functional_area_id` field is missing from the form (spec requires dropdown from `MD_FUNCTIONAL_AREAS`). `full_name` is split into `first_name`/`last_name` (acceptable deviation). Spec requires `is_email_verified` as `z.literal(true)` in Zod -- not in current schema |
| BR-REG-005: Blocked email domains | DONE | EmailDomainBlocker component + blockedDomains query |
| BR-REG-006: OTP verification | DONE | OtpVerification component with send/verify |
| BR-CTY-001: Phone code auto-populated | DONE | From locale context |
| BR-TZ-001: Timezone auto-detected | DONE | Uses `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| BR-LANG-001: Preferred language | DONE | Language dropdown from `MD_LANGUAGES` |
| OTP rate limiting (5/hour) | PARTIAL | Client sends request; server-side enforcement depends on edge function (not verified) |
| OTP lockout (5 failures, 24h) | PARTIAL | Same -- depends on server-side implementation |
| Zod schema: `is_email_verified: z.literal(true)` | MISSING | Not in `primaryContactSchema` -- verification enforced in handler only |

---

## DOCUMENT 2: Addendum -- Gap-Filling Supplement

### Patch 1: MD_SHADOW_PRICING (A1)

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `md_shadow_pricing` table created | DONE | Table exists with seed data |
| `useShadowPricing(tierId)` hook | DONE | In `usePlanSelectionData.ts` |
| RLS policy for shadow pricing | DONE | Anyone can read active |
| Index `idx_shadow_pricing_tier` | DONE | Created |
| Cost calculator integration | PARTIAL | Hook exists but shadow cost display in plan selection cost calculator not verified |

### Patch 2: Shadow Billing Integration (A2)

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `shadow_charge_per_challenge` on SEEKER_SUBSCRIPTIONS | DONE | Column added via migration |
| `shadow_currency_code` on SEEKER_SUBSCRIPTIONS | NEEDS VERIFICATION | May be present in migration |
| BR-ZFE-001 amended: Use shadow amounts from MD_SHADOW_PRICING | PARTIAL | `calculateShadowFee` in service exists but registration completion flow not verified |

### ORG-001: Organization Settings & Profile Management

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| ProfileTab with editable/locked fields | DONE | Component exists |
| SubscriptionTab with upgrade/downgrade | DONE | Component exists |
| EngagementModelTab with BR-MSL-001 | DONE | Component exists |
| AuditTrailTable | DONE | Component exists |
| `seeker_organization_audit` table | DONE | Created |
| `md_challenge_active_statuses` table | DONE | Created with seed data |
| FieldChangeModal (cascading changes) | MISSING | Spec requires confirmation modal for country/org-type changes |
| TierComparisonModal | MISSING | Spec requires side-by-side tier comparison for upgrade/downgrade |
| ActiveChallengesBlocker | MISSING | Spec requires list of active challenges preventing model switch |
| Country change cascading recalculation | PARTIAL | Service has field-locking but no confirmation modal or cascading currency/pricing recalculation |
| Downgrade: pending_downgrade_tier_id / date | DONE | Columns added to `seeker_subscriptions` |
| Prorated upgrade charge calculation | MISSING | No proration logic in service or UI |

### CHG-001: Challenge Creation & Pricing

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `md_challenge_complexity` table | DONE | 3-level complexity with multipliers |
| `md_challenge_base_fees` table | DONE | Country+tier base fees |
| Pricing calculation formula | DONE | `calculateChallengeFees` in service |
| `challenges` table (full schema per spec) | PARTIAL | Table exists as stub; columns added (engagement_model_id, complexity_id, fees) but spec-defined columns like `shadow_fee_amount`, `payment_status`, `max_solutions`, `solutions_awarded`, `visibility` need verification |
| Engagement model lock trigger | DONE | DB trigger `enforce_engagement_model_lock` exists |
| BR-MSL-002: Model locked after Draft | DONE | Trigger enforced at DB level |
| BR-EMF-002/003: Marketplace vs Aggregator runtime | MISSING | No runtime enforcement UI (messaging disabled/enabled, provider contact visibility) |
| BR-TFR-004: Max solutions enforcement | PARTIAL | `getMaxSolutions` in service, but no award-time enforcement UI |
| BR-TFR-002: Challenge limit enforcement | DONE | `validateChallengeLimit` in service + UI blocker |
| Internal dept zero-fee flow (BR-ZFE-001) | PARTIAL | Service logic exists but no UI path for internal depts to skip payment |
| `seeker_challenge_topups` table | DONE | Created with RLS |
| Challenge creation form uses Zod | MISSING | ChallengeCreatePage uses `useState` instead of React Hook Form + Zod (violates architecture standard) |

### MEM-001: Membership Management

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `seeker_memberships` table | DONE | Created |
| `md_membership_tiers` table | DONE | Pre-existing with seed data |
| BR-MEM-001: Membership lifecycle | DONE | Service + hooks exist |
| BR-MEM-002: Fee + commission discounts | DONE | `calculateMembershipDiscount` in service |
| BR-MEM-003: Discount exclusions | PARTIAL | Service mentions discountable items but no full exclusion list implementation |
| BR-MEM-004: Internal dept bypass | DONE | In service |
| Auto-renewal + pg_cron job | MISSING | No pg_cron scheduled job for membership expiry/renewal |
| Renewal notification 30 days before expiry | MISSING | No notification trigger |

### SAS-001: Parent Org & SaaS Administration

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `saas_agreements` table (full schema) | PARTIAL | Table created but missing several spec columns: `base_platform_fee`, `per_department_fee`, `support_tier_fee`, `custom_fee_1/2_label/amount`, `msa_reference_number`, `msa_document_url`, `billing_frequency` |
| Parent org dashboard (6 widgets) | DONE | ParentDashboardPage exists |
| RLS: Platform Admin full access | PARTIAL | RLS exists but uses `seeker_contacts` join rather than `is_platform_admin()` function |
| SaaS agreement CRUD form (admin) | DONE | SaasAgreementPage exists |
| `get_visible_org_ids` function | MISSING | Spec requires this DB function for subsidiary data visibility |

### TEM-001: Team & User Management

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `org_roles` table with system + custom | DONE | Created with RLS |
| `org_users` enhancements | DONE | subsidiary_org_id, org_role_id, invitation fields |
| BR-REG-017: Tier-based user limits | DONE | `validateUserInvite` in service |
| Custom role builder (Premium) | MISSING | No UI for creating custom roles with granular permissions |
| Subsidiary hierarchy support | PARTIAL | Column exists but no `get_visible_org_ids` DB function and no UI for subsidiary assignment |

### BIL-001: Billing & Subscription Lifecycle

| Spec Item | Status | Gap Description |
|-----------|--------|-----------------|
| `seeker_invoices` table | DONE | Created |
| `seeker_invoice_line_items` table | DONE | Created |
| Challenge counter display | DONE | OrgBillingPage shows usage |
| Counter reset pg_cron job | MISSING | No pg_cron job for monthly reset |
| Top-up purchase flow | DONE | UI + hook exists |
| Invoice generation logic | PARTIAL | Schema exists but no automated invoice generation on subscription/topup |
| Internal dept billing gate (BR-SAAS-003) | MISSING | No `InternalBillingNotice` component or gate in billing page |
| Shadow usage summary for internal depts | MISSING | Not implemented on billing page |

---

## Critical Gaps Summary (Priority Order)

### HIGH Priority (Core Functionality Missing)

1. **Logo + Profile Document uploads** on REG-001 form
2. **BR-TCP-001**: Country pricing support validation (blocks registration if country unsupported)
3. **ChallengeCreatePage**: Should use React Hook Form + Zod (currently raw useState)
4. **BR-SAAS-003**: Internal department billing gate not implemented
5. **Challenges table**: Missing several spec columns (`shadow_fee_amount`, `payment_status`, `visibility`, etc.)
6. **`get_visible_org_ids` DB function** for subsidiary data scoping

### MEDIUM Priority (Business Logic Gaps)

7. **FieldChangeModal**: Confirmation dialog for cascading country/org-type changes on ORG-001
8. **TierComparisonModal**: Side-by-side comparison for upgrade/downgrade
9. **ActiveChallengesBlocker**: Show blocking challenges list
10. **pg_cron jobs**: Counter reset (BIL-001) and membership expiry (MEM-001)
11. **Prorated upgrade charge** calculation
12. **Custom Role Builder UI** (Premium tier)
13. **BR-EMF-002/003**: Marketplace vs Aggregator runtime rules (messaging/contact visibility)
14. **SaaS agreement** schema completeness (missing fee breakdown columns)
15. **`is_email_verified: z.literal(true)`** in Zod schema for REG-002

### LOW Priority (Polish / Enhancement)

16. **LocaleContext provider** for global currency/date formatting
17. **Data Privacy Notice** banner on REG-001
18. **"Sign in" link** on registration pages
19. **Accessibility**: aria-describedby, aria-live, skip links, focus management
20. **BR-SUB-002**: Annual re-verification of subsidized pricing
21. **Department Functional Area** dropdown on REG-002
22. **Invoice auto-generation** on billing events
23. **Shadow usage summary** component for internal depts
24. **Notification/email triggers** for membership renewal reminders

---

## Recommendation

Approximately **60-65%** of the combined specs are implemented. The core database schema, service layer logic, and primary UI components are in place. The main gaps fall into three categories:

1. **Missing UI sub-components** (modals, blockers, upload zones, internal dept gates)
2. **Missing background jobs** (pg_cron for counter reset, membership expiry)
3. **Incomplete business rule enforcement** at runtime (marketplace/aggregator rules, subsidiary visibility, prorated charges)

To reach full spec coverage, I recommend tackling the HIGH priority items first, followed by MEDIUM items in a subsequent phase.
