

## Final Testing Plan: 140 Seeker Platform Test Cases

### Complete Test Case Inventory (from Excel)

| Sheet | TC Range | Count | Critical | High | Medium | Low |
|-------|----------|-------|----------|------|--------|-----|
| M1: Registration & Profile | TC-M1-001 to TC-M1-062 | 62 | 14 | 28 | 16 | 4 |
| M2: Engagement & Challenges | TC-M2-001 to TC-M2-019 | 19 | 8 | 9 | 2 | 0 |
| M3-M5: Solver, Eval, Legal | TC-M3-001 to TC-M5-010 | 10 | 3 | 4 | 3 | 0 |
| M6: Billing & Payments | TC-M6-001 to TC-M6-022 | 22 | 6 | 14 | 2 | 0 |
| M7-M8: Analytics, Admin | TC-M7-001 to TC-M8-006 | 10 | 2 | 5 | 3 | 0 |
| NFR & Cross-Cutting | TC-NFR-001 to TC-NFR-017 | 17 | 2 | 8 | 6 | 1 |
| **TOTAL** | | **140** | **35** | **68** | **32** | **5** |

---

### Three Deliverables

#### Deliverable 1: Vitest Unit Tests (~18 tests)

File: `src/test/seeker-platform-validation.test.ts`

These run offline with `npx vitest` — no Supabase needed.

| TC ID | Test | Method |
|-------|------|--------|
| TC-M1-001 | Legal Entity Name min length (1 char rejects) | `organizationIdentitySchema.safeParse()` |
| TC-M1-002 | Legal Entity Name special chars (`Test@Corp#Ltd` rejects) | `organizationIdentitySchema.safeParse()` |
| TC-M1-003 | Legal Entity Name valid with `&`, `-`, `.` (accepts) | `organizationIdentitySchema.safeParse()` |
| TC-M1-004 | Trade/Brand Name optional (blank accepts) | `organizationIdentitySchema.safeParse()` |
| TC-M1-015 | Year Founded boundaries (1799 rejects, 2027 rejects, 2000 accepts) | `organizationIdentitySchema.safeParse()` |
| TC-M1-017 | All required fields blank rejects | `organizationIdentitySchema.safeParse()` |
| TC-M1-018 | Email format validation | `primaryContactSchema.safeParse()` |
| TC-M1-019 | `.edu` / `.ac.*` / `.gov.*` institutional domain bypass | `isInstitutionalDomain()` |
| TC-M1-024 | Phone number digits-only validation | `primaryContactSchema.safeParse()` |
| TC-M1-028 | DUNS 9-digit validation | Pure regex test |
| TC-M1-018b | Password complexity (8+ chars, mixed case, number, special) | `primaryContactSchema.safeParse()` |
| TC-M1-018c | Password mismatch (`confirm_password`) | `primaryContactSchema.refine()` |
| — | `extractDomain()` correctness | Direct function call |
| — | `isStartupEligible()` — eligible (founded 2 years ago, 1-10 employees) | Direct function call |
| — | `isStartupEligible()` — ineligible (founded 20 years ago) | Direct function call |
| — | `isStartupEligible()` — ineligible (5001+ employees) | Direct function call |
| TC-NFR-011 | Fee multiplier Simple = 1.0x | Pure calculation |
| TC-NFR-012 | Fee multiplier Moderate = 1.5x / 1.25x | Pure calculation |
| TC-NFR-013 | Fee multiplier Complex = 2.0x / 1.5x | Pure calculation |

#### Deliverable 2: Regression Test Kit Integration Tests (~45 tests)

File: `src/services/regressionTestKit/seekerPlatformTests.ts`

Registered in the existing Regression Test Kit UI at `/admin/regression-test-kit`. These query live Supabase data.

| TC ID(s) | Test | DB Query |
|----------|------|----------|
| TC-M1-005 | Org types dropdown values match spec | `md_org_types` SELECT |
| TC-M1-007 | Company sizes match spec (1-10, 11-50, ..., 5000+) | `md_company_sizes` SELECT |
| TC-M1-008 | India → INR currency auto-population | `md_countries` WHERE name=India |
| TC-M1-014 | Sanctioned countries excluded (is_active=false) | `md_countries` WHERE is_active=false |
| TC-M1-016 | Indian states exist in subdivisions | `md_country_subdivisions` |
| TC-M1-018 | gmail.com in blocked domains | `md_blocked_email_domains` |
| TC-M1-026 | Tax format = PAN for India | `md_tax_formats` |
| TC-M1-027 | Tax format = EIN for USA | `md_tax_formats` |
| TC-M1-029 | ITAR in export controls | `md_export_control_statuses` |
| TC-M1-035 | Tier pricing exists for India | `md_tier_country_pricing` |
| TC-M1-036 | Tier pricing exists for USA | `md_tier_country_pricing` |
| TC-M1-044 | Quarterly discount = 8% | `md_billing_cycles` |
| TC-M1-045 | Annual discount = 17% | `md_billing_cycles` |
| TC-M1-046 | Payment methods filtered by country | `md_payment_methods_availability` |
| TC-M2-001 | Basic tier engagement access rules | `md_tier_engagement_access` |
| TC-M2-005 | Standard tier per-challenge model | `md_tier_engagement_access` |
| TC-M2-007 | Engagement models is_active filter | `md_engagement_models` |
| TC-M2-010 | Basic tier challenge limit = 10 | `md_tier_features` |
| TC-M2-011 | Standard tier challenge limit = 20 | `md_tier_features` |
| TC-M2-012 | Premium tier unlimited (-1) | `md_tier_features` |
| TC-M2-013 | Fixed charge per challenge by tier/country | `md_tier_country_pricing` |
| TC-M2-017 | MAX_SOLUTIONS Basic = 1 | `md_tier_features` |
| TC-M2-018 | MAX_SOLUTIONS Standard = 2 | `md_tier_features` |
| TC-M2-019 | MAX_SOLUTIONS Premium = 3 | `md_tier_features` |
| TC-M6-001 | Quarterly 8% discount calculation | `md_billing_cycles` + arithmetic |
| TC-M6-002 | Annual 17% discount calculation | `md_billing_cycles` + arithmetic |
| TC-M6-003 | Basic overage fee from pricing | `md_tier_country_pricing` |
| TC-M6-004 | Standard overage fee from pricing | `md_tier_country_pricing` |
| TC-M6-007 | Country without pricing blocks registration | `md_tier_country_pricing` count=0 |
| TC-M6-008 | Membership table structure exists | `information_schema.columns` |
| TC-M6-015 | Shadow pricing exists per tier | `md_shadow_pricing` |
| TC-M6-017 | Shadow amounts: Basic=₹100, Standard=₹75, Premium=₹0 | `md_shadow_pricing` |
| TC-M6-021 | SaaS agreements table structure | `information_schema.columns` |
| TC-M8-001 | Tier features editable (row exists) | `md_tier_features` update check |
| TC-M8-005 | RLS tenant isolation | Cross-tenant query returns 0 rows |
| TC-M1-059 | Basic user limit = 1 | `md_tier_features` |
| TC-M1-060 | Standard user limit check | `md_tier_features` |
| TC-NFR-001 | Currency symbol from country master | `md_countries` currency fields |
| TC-NFR-005 | Page load timing < 3s | `performance.now()` measurement |
| TC-NFR-014 | Basic workflow template count = 1 | `md_tier_features` |
| TC-NFR-015 | Standard workflow template count ≤ 3 | `md_tier_features` |

#### Deliverable 3: SKIP Placeholders for Category C (~77 tests)

Same file, registered as tests that immediately return `SKIP` with a reason. Visible in the regression kit dashboard for tracking.

| TC Range | Count | Skip Reason |
|----------|-------|-------------|
| TC-M1-006, 009, 010, 011, 012, 013 | 6 | Requires UI interaction (dropdown, flag trigger) |
| TC-M1-020 to TC-M1-023 | 4 | Requires E2E: OTP edge function with email delivery |
| TC-M1-025 | 1 | Requires browser timezone detection |
| TC-M1-030, 031 | 2 | Requires T&C acceptance with IP/hash capture |
| TC-M1-032, 033, 034 | 3 | Requires NDA radio selection UI |
| TC-M1-037 to TC-M1-042 | 6 | Requires tier selection wizard UI |
| TC-M1-043 | 1 | Requires billing skip for internal dept |
| TC-M1-047 to TC-M1-049 | 3 | Requires billing form UI |
| TC-M1-050 to TC-M1-058 | 9 | Feature not yet implemented (profile management) |
| TC-M1-061, 062 | 2 | Feature not yet implemented (custom RBAC) |
| TC-M2-002, 003, 004 | 3 | Requires challenge lifecycle + model switching UI |
| TC-M2-006, 008, 009 | 3 | Requires challenge creation UI |
| TC-M2-014, 015, 016 | 3 | Requires challenge wizard UI |
| TC-M3-001 to TC-M5-010 | 10 | Feature not yet implemented (solver/eval/legal) |
| TC-M6-005, 006 | 2 | Feature not yet implemented (invoice generation) |
| TC-M6-009 to TC-M6-014 | 6 | Feature not yet implemented (membership discounts) |
| TC-M6-016, 018, 019, 020, 022 | 5 | Feature not yet implemented (shadow billing UI, SaaS admin) |
| TC-M7-001 to TC-M7-004 | 4 | Feature not yet implemented (analytics tier gating) |
| TC-M8-002, 003, 004, 006 | 4 | Requires admin console + audit trail UI |
| TC-NFR-002, 003, 004 | 3 | Requires i18n date/address format rendering |
| TC-NFR-006 | 1 | Requires mobile responsive E2E (Playwright) |
| TC-NFR-007 | 1 | Requires click-count audit |
| TC-NFR-008 | 1 | Requires API documentation audit |
| TC-NFR-009, 010 | 2 | Requires security/GDPR audit |
| TC-NFR-016, 017 | 2 | Feature not yet implemented (premium workflows) |

---

### Coverage Summary

| Category | Tests | Type | Tool |
|----------|-------|------|------|
| Vitest Unit Tests | 18 | Offline, pure logic | `npx vitest` |
| Regression Kit (PASS/FAIL) | 45 | Live DB queries | `/admin/regression-test-kit` |
| Regression Kit (SKIP) | 77 | Placeholder backlog | `/admin/regression-test-kit` |
| **TOTAL** | **140** | | |

### Files to Create

| File | Purpose |
|------|---------|
| `src/test/seeker-platform-validation.test.ts` | 18 Vitest unit tests |
| `src/services/regressionTestKit/seekerPlatformTests.ts` | 45 integration + 77 SKIP tests |
| `src/services/regressionTestKit/index.ts` | Register new seeker module (edit only imports + arrays) |

### Execution Plan

1. Create both test files simultaneously
2. Run Vitest unit tests — report pass/fail results
3. Navigate to `/admin/regression-test-kit` and run the integration suite — report results
4. Deliver full 140-TC coverage matrix with status

### What Will NOT Change

No modifications to any existing code, UX, navigation, rules, APIs, components, or database schema. Only new test files and a minor import addition to the regression kit index.

