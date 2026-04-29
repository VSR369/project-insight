/**
 * Phase 10f.2 — Field editability regression contract.
 *
 * Every column read by useOrgSettings (`fetchOrgProfile` SELECT list) MUST be
 * explicitly classified as either LOCKED or EDITABLE. Adding a new column to
 * the SELECT without a lock-vs-edit decision will fail this test, forcing a
 * conscious governance decision before the column reaches the admin UI.
 */

import { describe, it, expect } from 'vitest';
import {
  isFieldEditable,
  getLockedFields,
  getEditableFields,
} from '../orgSettingsService';

/**
 * Canonical column list mirrors the SELECT in
 * `src/hooks/queries/useOrgSettings.ts` -> fetchOrgProfile.
 *
 * Excludes:
 *  - Identity / audit cols (id, tenant_id, created_at, updated_at) — never user-editable
 *  - Joined relations (organization_types, countries) — read-only joins
 *  - Lifecycle metadata (registration_step, is_enterprise, subsidized_discount_pct)
 *    — governed by separate flows (enterprise admin, registration wizard)
 *  - Platform-only display fields (logo_url, preferred_currency, date_format,
 *    number_format) — handled in dedicated surfaces, not Profile editor
 */
const PROFILE_COLUMNS_REQUIRING_DECISION = [
  'organization_name',
  'legal_entity_name',
  'trade_brand_name',
  'organization_type_id',
  'employee_count_range',
  'annual_revenue_range',
  'registration_number',
  'founding_year',
  'hq_country_id',
  'hq_state_province_id',
  'hq_city',
  'hq_address_line1',
  'hq_address_line2',
  'hq_postal_code',
  'website_url',
  'linkedin_url',
  'organization_description',
  'timezone',
] as const;

describe('orgSettingsService — field editability classification', () => {
  it('every profile column is classified as either locked or editable', () => {
    const locked = new Set(getLockedFields());
    const editable = new Set(getEditableFields());

    const unclassified = PROFILE_COLUMNS_REQUIRING_DECISION.filter(
      (col) => !locked.has(col) && !editable.has(col),
    );

    expect(unclassified, `Columns missing a lock/edit decision: ${unclassified.join(', ')}`).toEqual([]);
  });

  it('locked and editable sets are mutually exclusive', () => {
    const locked = new Set(getLockedFields());
    const editable = new Set(getEditableFields());
    const overlap = [...locked].filter((c) => editable.has(c));
    expect(overlap, `Columns appear in both sets: ${overlap.join(', ')}`).toEqual([]);
  });

  it('isFieldEditable returns false for locked fields', () => {
    for (const col of getLockedFields()) {
      expect(isFieldEditable(col)).toBe(false);
    }
  });

  it('isFieldEditable returns true for editable fields', () => {
    for (const col of getEditableFields()) {
      expect(isFieldEditable(col)).toBe(true);
    }
  });

  it('isFieldEditable returns false for unknown fields (defensive default)', () => {
    expect(isFieldEditable('totally_made_up_column')).toBe(false);
    expect(isFieldEditable('')).toBe(false);
  });

  it('locks foundational identity fields that must never be admin-editable', () => {
    const locked = new Set(getLockedFields());
    expect(locked.has('legal_entity_name')).toBe(true);
    expect(locked.has('organization_type_id')).toBe(true);
    expect(locked.has('hq_country_id')).toBe(true);
    expect(locked.has('founding_year')).toBe(true);
  });

  it('exposes business_registration_number as editable (Phase 10f)', () => {
    expect(isFieldEditable('registration_number')).toBe(true);
  });
});
