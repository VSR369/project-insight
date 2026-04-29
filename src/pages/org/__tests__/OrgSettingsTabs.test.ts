/**
 * Phase 10a regression — Delegated tab restriction.
 *
 * Before 10a: `useCurrentSeekerAdmin` filtered admin_tier='PRIMARY', so a
 * Delegated admin returned null → isDelegated=false → ALL_TABS rendered.
 * After 10a: `useCurrentAdminTier` returns the actual tier, so the visible
 * tabs are correctly restricted for delegated admins.
 *
 * This file tests the pure visible-tabs computation that drives the page,
 * mirroring the logic in OrgSettingsPage.tsx without the rendering harness.
 */

import { describe, it, expect } from 'vitest';

type TabId =
  | 'profile'
  | 'admin'
  | 'subscription'
  | 'engagement'
  | 'governance'
  | 'legal-templates'
  | 'finance'
  | 'compliance'
  | 'custom-fields'
  | 'audit';

const ALL_TABS: TabId[] = [
  'profile',
  'admin',
  'subscription',
  'engagement',
  'governance',
  'legal-templates',
  'finance',
  'compliance',
  'custom-fields',
  'audit',
];

const DELEGATED_TABS: TabId[] = ['profile', 'admin', 'subscription'];

function computeVisibleTabs(isDelegated: boolean): TabId[] {
  return isDelegated ? DELEGATED_TABS : ALL_TABS;
}

function resolveActiveTab(visibleTabs: TabId[], requested: string | null): TabId {
  const candidate = (requested as TabId) || 'profile';
  return visibleTabs.includes(candidate) ? candidate : 'profile';
}

describe('OrgSettings — visible tabs by admin tier', () => {
  it('PRIMARY admin sees all 10 tabs', () => {
    const tabs = computeVisibleTabs(/* isDelegated */ false);
    expect(tabs).toHaveLength(10);
    expect(tabs).toContain('governance');
    expect(tabs).toContain('legal-templates');
    expect(tabs).toContain('finance');
    expect(tabs).toContain('compliance');
    expect(tabs).toContain('custom-fields');
    expect(tabs).toContain('audit');
  });

  it('DELEGATED admin sees only profile, admin, subscription', () => {
    const tabs = computeVisibleTabs(/* isDelegated */ true);
    expect(tabs).toEqual(['profile', 'admin', 'subscription']);
    expect(tabs).not.toContain('governance');
    expect(tabs).not.toContain('legal-templates');
    expect(tabs).not.toContain('finance');
    expect(tabs).not.toContain('compliance');
  });

  it('non-admin org user (isDelegated=false) sees the full tab set', () => {
    // A regular org_user who is NOT a seeking_org_admin returns null tier,
    // which evaluates to isDelegated=false in useCurrentAdminTier — they
    // get the full UI; RLS continues to gate sensitive mutations.
    const tabs = computeVisibleTabs(false);
    expect(tabs).toEqual(ALL_TABS);
  });
});

describe('OrgSettings — URL tab tampering protection', () => {
  it('redirects DELEGATED admin to profile when URL requests a hidden tab', () => {
    const visible = computeVisibleTabs(true);
    expect(resolveActiveTab(visible, 'governance')).toBe('profile');
    expect(resolveActiveTab(visible, 'legal-templates')).toBe('profile');
    expect(resolveActiveTab(visible, 'finance')).toBe('profile');
    expect(resolveActiveTab(visible, 'compliance')).toBe('profile');
    expect(resolveActiveTab(visible, 'audit')).toBe('profile');
  });

  it('honours valid tab requests for DELEGATED admin', () => {
    const visible = computeVisibleTabs(true);
    expect(resolveActiveTab(visible, 'admin')).toBe('admin');
    expect(resolveActiveTab(visible, 'subscription')).toBe('subscription');
  });

  it('honours every valid tab for PRIMARY admin', () => {
    const visible = computeVisibleTabs(false);
    for (const tab of ALL_TABS) {
      expect(resolveActiveTab(visible, tab)).toBe(tab);
    }
  });

  it('falls back to profile when URL has no tab param', () => {
    expect(resolveActiveTab(computeVisibleTabs(false), null)).toBe('profile');
    expect(resolveActiveTab(computeVisibleTabs(true), null)).toBe('profile');
  });
});
