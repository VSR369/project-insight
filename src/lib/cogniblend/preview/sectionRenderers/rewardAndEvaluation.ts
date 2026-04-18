/**
 * rewardAndEvaluation renderers — structured tables for
 *  - reward_structure (monetary tiers + non-monetary items)
 *  - evaluation_criteria (criterion / weight / description)
 */

import { logWarning } from '@/lib/errorHandler';
import { EMPTY_HTML, MALFORMED_HTML, escapeHtml, type RenderContext, type SectionRenderer } from './types';

const parseIfString = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  const trimmed = v.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return v;
  try {
    return JSON.parse(trimmed);
  } catch {
    return v;
  }
};

const formatAmount = (amount: unknown, currency: string | null): string => {
  if (amount == null || amount === '' || amount === 0) return '—';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num) || num === 0) return String(amount);
  const formatted = num.toLocaleString();
  return currency ? `${currency} ${formatted}` : formatted;
};

export const renderRewardTiersTable: SectionRenderer = (value, ctx) => {
  const parsed = parseIfString(value);
  if (parsed == null) return EMPTY_HTML;
  if (typeof parsed !== 'object') {
    logWarning('export.renderer.fallback', { renderer: 'rewardTiers', reason: 'not_object' });
    return MALFORMED_HTML(String(parsed));
  }

  const obj = parsed as Record<string, unknown>;
  const rewardType = (obj.rewardType ?? obj.reward_type ?? 'monetary') as string;
  const currency = (obj.currency as string) ?? ctx.currencyCode ?? '';

  const monetary = obj.monetary as Record<string, { enabled?: boolean; amount?: number }> | undefined;
  const tiersArray = obj.tiers as Array<Record<string, unknown>> | undefined;

  const monetaryRows: string[] = [];
  if (monetary && typeof monetary === 'object') {
    for (const [tier, data] of Object.entries(monetary)) {
      if (!data || typeof data !== 'object') continue;
      const enabled = (data as { enabled?: boolean }).enabled;
      const amount = (data as { amount?: number }).amount;
      if (!enabled || !amount) continue;
      monetaryRows.push(
        `<tr><td>${escapeHtml(tier.charAt(0).toUpperCase() + tier.slice(1))}</td><td style="text-align:right">${escapeHtml(formatAmount(amount, currency))}</td></tr>`
      );
    }
  }
  if (tiersArray && Array.isArray(tiersArray)) {
    for (const t of tiersArray) {
      const name = (t.tier_name ?? t.name ?? t.rank ?? '—') as string;
      const amount = t.fixed_amount ?? t.amount ?? t.percentage_of_pool;
      if (amount == null || amount === 0) continue;
      monetaryRows.push(
        `<tr><td>${escapeHtml(name)}</td><td style="text-align:right">${escapeHtml(formatAmount(amount, currency))}</td></tr>`
      );
    }
  }

  const nonMonetary = obj.nonMonetary as { items?: Array<{ label?: string; description?: string }> } | undefined;
  const nmItems = nonMonetary?.items ?? [];
  const nmHtml = nmItems.length
    ? `<div class="export-card">
        <p class="export-card-title">Non-Monetary Incentives</p>
        <ul class="export-list">${nmItems
          .map(
            (it) =>
              `<li><strong>${escapeHtml(it.label ?? 'Incentive')}</strong>${
                it.description ? ` — ${escapeHtml(it.description)}` : ''
              }</li>`
          )
          .join('')}</ul>
      </div>`
    : '';

  const monetaryHtml = monetaryRows.length
    ? `<table><thead><tr><th>Tier</th><th style="width:160px;text-align:right">Amount</th></tr></thead><tbody>${monetaryRows.join('')}</tbody></table>`
    : '';

  if (!monetaryHtml && !nmHtml) {
    return `<p>${escapeHtml(`Reward Type: ${rewardType}`)} — no tier amounts configured.</p>`;
  }

  return [monetaryHtml, nmHtml].filter(Boolean).join('');
};

export const renderEvaluationCriteriaTable: SectionRenderer = (value) => {
  const parsed = parseIfString(value);
  if (parsed == null) return EMPTY_HTML;

  const arr = (Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>).criteria) as Array<Record<string, unknown>> | undefined;

  if (!arr || !Array.isArray(arr) || arr.length === 0) return EMPTY_HTML;

  const rows = arr
    .map((c, i) => {
      const name = c.criterion_name ?? c.name ?? c.criterion ?? '—';
      const weight = c.weight_percentage ?? c.weight ?? '—';
      const desc = (c.description ?? '') as string;
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(name)}</strong>${desc ? `<br/><span class="export-card-meta">${escapeHtml(desc)}</span>` : ''}</td>
        <td style="text-align:right">${escapeHtml(weight)}%</td>
      </tr>`;
    })
    .join('');

  const totalWeight = arr.reduce((sum, c) => {
    const w = Number(c.weight_percentage ?? c.weight ?? 0);
    return sum + (Number.isNaN(w) ? 0 : w);
  }, 0);
  const totalRow = `<tr><td colspan="2" style="text-align:right"><strong>Total</strong></td><td style="text-align:right"><strong>${totalWeight}%</strong></td></tr>`;

  return `<table><thead><tr><th style="width:40px">#</th><th>Criterion</th><th style="width:90px;text-align:right">Weight</th></tr></thead><tbody>${rows}${totalRow}</tbody></table>`;
};
