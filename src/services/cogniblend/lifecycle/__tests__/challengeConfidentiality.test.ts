import { describe, it, expect } from 'vitest';
import {
  CONFIDENTIAL_ORG_LABEL,
  resolveSeekerDisplay,
  canViewConfidentialContent,
  filterAttachmentsForViewer,
  confidentialAuditAction,
} from '../challengeConfidentiality';

const base = { isPrivileged: false, discloseOrgName: false, isWinner: false, cpaAccepted: false, isEligible: true };

describe('BR-CHL-P09 seeker identity masking', () => {
  it('hides identity by default — shows the Confidential label, never the name', () => {
    expect(resolveSeekerDisplay('Acme Corp', base)).toBe(CONFIDENTIAL_ORG_LABEL);
    expect(resolveSeekerDisplay('Acme Corp', base)).not.toContain('Acme');
  });

  it('shows the name when the creator ticked "Show our organisation name to providers"', () => {
    expect(resolveSeekerDisplay('Acme Corp', { ...base, discloseOrgName: true })).toBe('Acme Corp');
  });

  it('reveals identity to a confirmed winner only', () => {
    expect(resolveSeekerDisplay('Acme Corp', { ...base, isWinner: true })).toBe('Acme Corp');
    // non-selected participant still sees the label
    expect(resolveSeekerDisplay('Acme Corp', { ...base, isWinner: false })).toBe(CONFIDENTIAL_ORG_LABEL);
  });

  it('always shows the name to privileged users (tenant, platform admin, challenge role)', () => {
    expect(resolveSeekerDisplay('Acme Corp', { ...base, isPrivileged: true })).toBe('Acme Corp');
  });

  it('CPA acceptance alone never reveals identity before award', () => {
    // CPA acceptance is deliberately not an input to identity display
    expect(resolveSeekerDisplay('Acme Corp', { ...base, cpaAccepted: true })).toBe(CONFIDENTIAL_ORG_LABEL);
    expect(canViewConfidentialContent({ ...base, cpaAccepted: true })).toBe(true);
  });
});

describe('BR-CHL-P09 confidential content gate', () => {
  it('refuses confidential fields/attachments before CPA acceptance', () => {
    expect(canViewConfidentialContent(base)).toBe(false);
  });

  it('allows after CPA acceptance while eligible under BR-CHL-P10', () => {
    expect(canViewConfidentialContent({ ...base, cpaAccepted: true })).toBe(true);
  });

  it('refuses an ineligible provider even with CPA accepted', () => {
    expect(canViewConfidentialContent({ ...base, cpaAccepted: true, isEligible: false })).toBe(false);
  });

  it('always allows privileged users', () => {
    expect(canViewConfidentialContent({ ...base, isPrivileged: true })).toBe(true);
  });
});

describe('attachment filtering (mirrors attachments_provider_select RLS)', () => {
  const atts = [
    { id: 'a1', is_confidential: false },
    { id: 'a2', is_confidential: true },
  ];

  it('hides confidential attachments from a provider without CPA acceptance', () => {
    expect(filterAttachmentsForViewer(atts, false).map((a) => a.id)).toEqual(['a1']);
  });

  it('returns all attachments once confidential access is granted', () => {
    expect(filterAttachmentsForViewer(atts, true)).toHaveLength(2);
  });
});

describe('audit action names (9.3)', () => {
  it('names view and download actions for the audit log', () => {
    expect(confidentialAuditAction('view')).toBe('CONFIDENTIAL_CONTENT_VIEW');
    expect(confidentialAuditAction('download')).toBe('CONFIDENTIAL_CONTENT_DOWNLOAD');
  });
});
