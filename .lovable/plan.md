

# Implement All 10 Admin Requirements

## Overview
10 items spanning database schema changes, new admin pages, org settings tabs, and checklist fixes. All components stay under 200 lines per project standards.

---

## Database Migration (single migration file)

### Item 1: Escrow Deposit Percentage
- `ALTER TABLE md_governance_mode_config ADD COLUMN escrow_deposit_pct NUMERIC(5,2) DEFAULT 100.00`
- UPDATE: QUICK=0, STRUCTURED=80, CONTROLLED=100

### Item 2: Legal Review Thresholds
- New table `md_legal_review_thresholds` with columns: `id`, `country_id` (UUID FK to `countries(id)`), `currency_code`, `threshold_amount`, `governance_mode` (CHECK STRUCTURED/CONTROLLED), `is_active`, audit fields
- Note: Document uses `countries(code)` but `countries.id` is UUID — fix FK to `countries(id)`
- Seed defaults: US=$50K, GB=40K GBP, IN=4M INR, DE=45K EUR (lookup country UUIDs dynamically)
- RLS: SELECT for all authenticated, ALL for supervisors

### Item 5: Org Legal Document Templates
- New table `org_legal_document_templates` per spec (organization_id, tenant_id, document_name, document_code, content, version, version_status, applies_to_mode, is_mandatory, etc.)
- RLS: org members SELECT, org admins ALL

### Item 6: Org Finance Config
- New table `org_finance_config` per spec (organization_id unique, bank details, preferred currency, auto_deposit flag)
- RLS: org members SELECT, org admins ALL

### Item 7: Org Governance Overrides
- New table `org_governance_overrides` per spec (organization_id + governance_mode unique, threshold/pct/checklist overrides)
- RLS: org members SELECT, org admins ALL

### Item 9: Org Compliance Config
- New table `org_compliance_config` per spec (export_control, data_residency, GDPR, sanctions screening)
- RLS: org members SELECT, org admins ALL

### Item 10: Org Custom Fields
- New table `org_custom_fields` per spec (field_name, field_type CHECK, select_options JSONB, display_order, applies_to_mode)
- RLS: org members SELECT, org admins ALL

---

## Frontend Changes

### Item 1: Escrow % in GovernanceModeCard
- Add `escrow_deposit_pct` to `GovernanceModeConfigRow` interface and SELECT_COLS in `useGovernanceModeConfig.ts`
- Add editable numeric input row in `GovernanceModeCard.tsx` under a new "Escrow" section header
- Include in save payload

### Item 2: Legal Review Thresholds Admin Page
- New file: `src/pages/admin/seeker-config/LegalReviewThresholdsPage.tsx` — standard CRUD table page
- New hook: `src/hooks/queries/useLegalReviewThresholds.ts`
- Add route in `App.tsx`: `/admin/seeker-config/legal-thresholds`
- Add sidebar entry in `AdminSidebar.tsx` after "Legal Triggers"

### Item 3: Escrow Calculation Display
- New component: `src/components/cogniblend/EscrowCalculationDisplay.tsx` (~120 lines)
- Read-only display: Prize Pool -> Platform Fee -> Total Fee -> Escrow Deposit
- Fetches `md_platform_fees` and `md_governance_mode_config.escrow_deposit_pct`
- Shows confirmation checkbox
- Integrate into Creator form for MP model

### Item 4: Creator Legal Doc Upload (MP)
- New component: `src/components/cogniblend/LegalDocUploadSection.tsx` (~150 lines)
- Shows platform default templates (read-only), upload button for org-specific docs
- Files stored via Supabase storage, row inserted in `challenge_legal_docs`
- Show only for MP engagement model in the Creator form

### Item 5: Org Legal Templates Tab
- New component: `src/components/org-settings/OrgLegalTemplatesTab.tsx` (~180 lines)
- CRUD list: add/edit/delete templates, set version_status, applies_to_mode
- New hook: `src/hooks/queries/useOrgLegalTemplates.ts`

### Item 6: Org Finance Tab
- New component: `src/components/org-settings/OrgFinanceTab.tsx` (~150 lines)
- Form fields: bank name, branch, address, preferred currency, auto-deposit toggle, budget URL
- New hook: `src/hooks/queries/useOrgFinanceConfig.ts`

### Item 7: Org Governance Overrides
- Add overrides section to existing `GovernanceProfileTab.tsx` (~50 lines added)
- Or extract to `src/components/org-settings/GovernanceOverridesSection.tsx` (~120 lines)
- Per-mode override fields: legal threshold, escrow %, checklist count
- New hook: `src/hooks/queries/useOrgGovernanceOverrides.ts`

### Item 8: Fix Curator Checklist
- In `CurationChecklistPanel.tsx`:
  - Remove items 10 ("Tier 1 legal docs attached") and 11 ("Tier 2 legal templates attached")
  - Add "Fee calculation verified" (manual check)
  - For STRUCTURED: add "Escrow details entered"
  - Update LOCKED_ITEM_IDS, progress denominator (15 -> adjusted count)
  - Remove `tier1Docs`/`tier2Docs` auto-check logic

### Item 9: Org Compliance Tab
- New component: `src/components/org-settings/OrgComplianceTab.tsx` (~150 lines)
- Form: export control, controlled tech, data residency, GDPR, sanctions level, compliance email
- New hook: `src/hooks/queries/useOrgComplianceConfig.ts`

### Item 10: Org Custom Fields Tab
- New component: `src/components/org-settings/OrgCustomFieldsTab.tsx` (~180 lines)
- CRUD: add/edit/delete custom fields, set type/required/order/mode
- New hook: `src/hooks/queries/useOrgCustomFields.ts`

### OrgSettingsPage Update
- Expand from 6 tabs to 10 tabs:
  1. Profile, 2. Admin, 3. Subscription, 4. Engagement, 5. Governance (+ overrides), 6. Legal Templates, 7. Finance, 8. Compliance, 9. Custom Fields, 10. Audit Trail
- Use `grid-cols-5` x 2 rows or a scrollable TabsList to accommodate 10 tabs
- Add icons: FileText (Legal), Banknote (Finance), ShieldCheck (Compliance), Settings2 (Custom Fields)

---

## File Summary

| Action | File | Item |
|--------|------|------|
| Migration | `supabase/migrations/20260405_admin_10_items.sql` | 1,2,5,6,7,9,10 |
| Edit | `src/hooks/queries/useGovernanceModeConfig.ts` | 1 |
| Edit | `src/components/admin/governance/GovernanceModeCard.tsx` | 1 |
| New | `src/pages/admin/seeker-config/LegalReviewThresholdsPage.tsx` | 2 |
| New | `src/hooks/queries/useLegalReviewThresholds.ts` | 2 |
| New | `src/components/cogniblend/EscrowCalculationDisplay.tsx` | 3 |
| New | `src/components/cogniblend/LegalDocUploadSection.tsx` | 4 |
| New | `src/components/org-settings/OrgLegalTemplatesTab.tsx` | 5 |
| New | `src/hooks/queries/useOrgLegalTemplates.ts` | 5 |
| New | `src/components/org-settings/OrgFinanceTab.tsx` | 6 |
| New | `src/hooks/queries/useOrgFinanceConfig.ts` | 6 |
| New | `src/components/org-settings/GovernanceOverridesSection.tsx` | 7 |
| New | `src/hooks/queries/useOrgGovernanceOverrides.ts` | 7 |
| Edit | `src/pages/cogniblend/CurationChecklistPanel.tsx` | 8 |
| New | `src/components/org-settings/OrgComplianceTab.tsx` | 9 |
| New | `src/hooks/queries/useOrgComplianceConfig.ts` | 9 |
| New | `src/components/org-settings/OrgCustomFieldsTab.tsx` | 10 |
| New | `src/hooks/queries/useOrgCustomFields.ts` | 10 |
| Edit | `src/pages/org/OrgSettingsPage.tsx` | 5,6,7,9,10 |
| Edit | `src/App.tsx` | 2 (route) |
| Edit | `src/components/admin/AdminSidebar.tsx` | 2 (nav) |

**Estimated: ~20 files, all components under 200 lines.**

