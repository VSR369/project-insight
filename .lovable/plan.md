## Phase 10f — Finalisation

Claude's audit is accurate. Five of six critical gaps are fully closed. Three small items remain — all low-risk, no-infrastructure, ~1 cycle of work. This plan addresses each.

---

### Findings — relevance triage

| # | Claude's finding | Verified? | Action |
|---|---|---|---|
| 1 | Override consumers wired in `TeamPage` + `OrgBillingPage` | ✅ confirmed | None |
| 2 | `feature_gates` validation trigger live | ✅ confirmed | None |
| 3 | OTP flag + cutover runbook | ✅ confirmed | None |
| 4 | Activation authority `COMMENT ON FUNCTION` | ✅ confirmed | None |
| 5a | `business_registration_number` not in admin profile | ✅ confirmed — captured at registration (`organizationIdentity.ts:47`), absent from `profileFormSchema.ts` and `useOrgSettings.ts` SELECT | **FIX** |
| 5b | Logo upload, `hq_state_province_id` Select, timezone Select | ✅ confirmed deferred — TODO comments at `ProfileExtraFieldsSection.tsx:104-108` | **DOCUMENT** as deferred-with-rationale |
| 6a | `isFieldEditable` table-driven test missing | ✅ confirmed — function exists at `orgSettingsService.ts:35`, no test | **ADD TEST** |
| 6b | `validatePinCode` regex test missing | ✅ confirmed — function exists at `registration.ts:77`, no test | **ADD TEST** |
| 6c | `enterprise_agreements` RLS test | Needs integration harness | Defer (matches Claude's recommendation) |

---

### Scope of work

**1. Surface `business_registration_number` in admin profile editor**

- Add column to `useOrgSettings.ts` SELECT list
- Add `business_registration_number: z.string().max(100).optional().or(z.literal(''))` to `profileFormSchema.ts` + defaults
- Add a Text Input field to `ProfileExtraFieldsSection.tsx` (single text input, no dropdown, no master data dependency)
- Wire into the existing update mutation (already uses `withUpdatedBy()`)
- Add `'business_registration_number'` to `EDITABLE_FIELDS` set in `orgSettingsService.ts`

**2. Add `isFieldEditable` table-driven test**

- New file: `src/services/__tests__/orgSettingsService.test.ts`
- Imports the actual SELECT column list from `useOrgSettings.ts` (or hardcodes the canonical list)
- For every column name → assert it appears in either `LOCKED_FIELDS` or `EDITABLE_FIELDS`
- Adding a future column without a lock/edit decision will fail the test → regression contract

**3. Add `validatePinCode` regex test**

- New file: `src/lib/validations/__tests__/registration.test.ts`
- Test cases per country: `IN` (6-digit), `US` (5-digit + ZIP+4), `UK` (alphanumeric), `DE` (5-digit), `DEFAULT` fallback
- Cover: valid input, invalid input, empty input, unknown country code → falls back to DEFAULT

**4. Document deferred items in spec**

- Update `.lovable/plan.md` Phase 10b section with explicit "Deferred to post-MVP" subsection listing:
  - **Logo upload** — needs storage bucket `org-logos` + RLS policies + image processing
  - **`hq_state_province_id` Select** — needs `md_states_provinces` master table populated and FK-filtered by `hq_country_id`
  - **Timezone Select** — needs timezone master table or IANA tz library integration
  - **`operating_geography_ids[]` badges** — needs multi-select pattern + master geography taxonomy

Each deferral carries the infrastructure dependency that justifies post-MVP framing.

---

### Files affected

**Edited (4):**
- `src/hooks/queries/useOrgSettings.ts` — add column to SELECT
- `src/components/org-settings/profileFormSchema.ts` — add field + default
- `src/components/org-settings/ProfileExtraFieldsSection.tsx` — add input + remove the corresponding TODO line if any
- `src/services/orgSettingsService.ts` — add to `EDITABLE_FIELDS`
- `.lovable/plan.md` — document deferrals

**Created (2):**
- `src/services/__tests__/orgSettingsService.test.ts`
- `src/lib/validations/__tests__/registration.test.ts`

---

### Out of scope (intentional)

- Logo upload, state/province Select, timezone Select — infrastructure-blocked, deferred
- `operating_geography_ids[]` UI — needs multi-select + taxonomy
- `enterprise_agreements` RLS integration test — needs a harness; defer per Claude's recommendation
- Refactoring `PrimaryContactForm.tsx` (789 LOC) and `CreateDelegatedAdminPage.tsx` (317 LOC) — known LOC debt, separate refactor cycle

---

### Verification

After implementation:
- New tests: `bunx vitest run src/services/__tests__/orgSettingsService.test.ts src/lib/validations/__tests__/registration.test.ts`
- Existing 179 tests remain green
- Manually verify on `/org/settings?tab=profile`: `business_registration_number` field renders, saves, persists on reload
