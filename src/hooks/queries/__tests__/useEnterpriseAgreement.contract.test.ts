/**
 * Smoke contract tests for the Phase 10c Enterprise hooks.
 * Confirms the React Query keys and hook surface stay stable so the
 * Platform Admin page and Org read-only card never silently break.
 */

import { describe, it, expect } from 'vitest';
import * as hooks from '@/hooks/queries/useEnterpriseAgreement';

describe('useEnterpriseAgreement module', () => {
  it('exposes the read hooks', () => {
    expect(typeof hooks.useActiveEnterpriseAgreement).toBe('function');
    expect(typeof hooks.useEnterpriseAgreements).toBe('function');
    expect(typeof hooks.useEnterpriseAgreement).toBe('function');
    expect(typeof hooks.useEnterpriseAgreementAudit).toBe('function');
    expect(typeof hooks.useEnterpriseFeatureGateKeys).toBe('function');
  });

  it('exposes the mutation hooks', () => {
    expect(typeof hooks.useUpsertEnterpriseAgreement).toBe('function');
    expect(typeof hooks.useTransitionAgreementStatus).toBe('function');
  });
});
