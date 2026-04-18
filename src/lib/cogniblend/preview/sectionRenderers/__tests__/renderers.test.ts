/**
 * Renderer unit tests — verify each renderer handles the four states
 * (null/empty/malformed/valid) per workspace rule R6.
 */

import { describe, it, expect } from 'vitest';
import { renderLineItemsCards } from '../lineItems';
import { renderStructuredFieldsList } from '../structuredFields';
import { renderCheckboxBadges, renderEnumLabel } from '../checkboxAndEnum';
import { renderRewardTiersTable, renderEvaluationCriteriaTable } from '../rewardAndEvaluation';
import type { RenderContext } from '../types';

const ctx: RenderContext = {
  maturityLabels: { prototype: 'A working demo' },
  ipModelLabels: { 'IP-JO': 'Joint Ownership — Shared rights' },
  visibilityLabels: { public: 'Public' },
  currencyCode: 'INR',
};

describe('renderLineItemsCards', () => {
  it('null → empty', () => expect(renderLineItemsCards(null, ctx)).toContain('Not provided'));
  it('empty array → empty', () => expect(renderLineItemsCards([], ctx)).toContain('Not provided'));
  it('array of strings → bullet list', () => {
    const html = renderLineItemsCards(['One', 'Two'], ctx);
    expect(html).toContain('<li>One</li>');
    expect(html).toContain('<li>Two</li>');
  });
  it('array of objects → cards (no [object Object])', () => {
    const html = renderLineItemsCards(
      [{ stakeholder_name: 'Procurement', role: 'Buyer', impact_description: 'High' }],
      ctx,
    );
    expect(html).toContain('Procurement');
    expect(html).toContain('Buyer');
    expect(html).not.toContain('[object Object]');
  });
  it('JSON string → parsed and rendered', () => {
    const html = renderLineItemsCards(JSON.stringify([{ kpi: 'Decision Rate', target: '95%' }]), ctx);
    expect(html).toContain('Decision Rate');
    expect(html).toContain('95%');
  });
});

describe('renderStructuredFieldsList', () => {
  it('null → empty', () => expect(renderStructuredFieldsList(null, ctx)).toContain('Not provided'));
  it('object → dl/dt/dd', () => {
    const html = renderStructuredFieldsList({ size: '4.2 GB', type: 'Dataset' }, ctx);
    expect(html).toContain('<dt>Size</dt>');
    expect(html).toContain('<dd>4.2 GB</dd>');
  });
  it('JSON string object → parsed', () => {
    const html = renderStructuredFieldsList('{"format":"CSV"}', ctx);
    expect(html).toContain('CSV');
  });
});

describe('renderCheckboxBadges', () => {
  it('null → empty', () => expect(renderCheckboxBadges(null, ctx)).toContain('Not provided'));
  it('JSON string array → badges with humanised labels', () => {
    const html = renderCheckboxBadges('["certified_expert","hybrid"]', ctx);
    expect(html).toContain('Certified Expert');
    expect(html).toContain('Hybrid');
    expect(html).not.toContain('[');
  });
  it('plain array → badges', () => {
    const html = renderCheckboxBadges(['public'], ctx);
    expect(html).toContain('Public');
  });
});

describe('renderEnumLabel', () => {
  it('null → empty', () => expect(renderEnumLabel(null, {})).toContain('Not provided'));
  it('uses label map when present', () => {
    expect(renderEnumLabel('IP-JO', ctx.ipModelLabels)).toContain('Joint Ownership');
  });
  it('humanises raw enum when label missing', () => {
    expect(renderEnumLabel('joint_ownership', {})).toContain('Joint Ownership');
  });
});

describe('renderRewardTiersTable', () => {
  it('null → empty', () => expect(renderRewardTiersTable(null, ctx)).toContain('Not provided'));
  it('skips zero-amount tiers', () => {
    const html = renderRewardTiersTable(
      {
        rewardType: 'monetary',
        currency: 'INR',
        monetary: {
          platinum: { enabled: true, amount: 500000 },
          gold: { enabled: true, amount: 0 },
          silver: { enabled: false, amount: 100 },
        },
      },
      ctx,
    );
    expect(html).toContain('Platinum');
    expect(html).toContain('500,000');
    expect(html).not.toContain('Gold');
    expect(html).not.toContain('Silver');
  });
  it('renders non-monetary items', () => {
    const html = renderRewardTiersTable(
      { nonMonetary: { items: [{ label: 'Mentorship', description: '6 months' }] } },
      ctx,
    );
    expect(html).toContain('Mentorship');
    expect(html).toContain('6 months');
  });
});

describe('renderEvaluationCriteriaTable', () => {
  it('null → empty', () => expect(renderEvaluationCriteriaTable(null, ctx)).toContain('Not provided'));
  it('builds proper table with totals', () => {
    const html = renderEvaluationCriteriaTable(
      [
        { criterion_name: 'Functional Coverage', weight_percentage: 40, description: 'Coverage of MAS' },
        { criterion_name: 'Performance', weight_percentage: 30 },
        { criterion_name: 'Security', weight_percentage: 30 },
      ],
      ctx,
    );
    expect(html).toContain('<table>');
    expect(html).toContain('Functional Coverage');
    expect(html).toContain('Coverage of MAS');
    expect(html).toContain('100%'); // total
  });
});
