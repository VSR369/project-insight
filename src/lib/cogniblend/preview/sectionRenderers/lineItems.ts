/**
 * lineItems renderer — handles line_items / table-style JSONB arrays
 * (affected_stakeholders, success_metrics_kpis, data_resources_provided arrays).
 *
 * Detects array-of-objects vs array-of-strings and renders accordingly.
 */

import { logWarning } from '@/lib/errorHandler';
import { EMPTY_HTML, MALFORMED_HTML, escapeHtml, type SectionRenderer } from './types';

const formatHeader = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

export const renderLineItemsCards: SectionRenderer = (value) => {
  const parsed = parseIfString(value);
  if (parsed == null) return EMPTY_HTML;

  if (!Array.isArray(parsed)) {
    if (typeof parsed === 'string' && parsed.trim()) {
      return `<p>${escapeHtml(parsed)}</p>`;
    }
    logWarning('export.renderer.fallback', {
      operation: 'export.renderer.fallback',
      additionalData: { renderer: 'lineItemsCards', reason: 'not_array' },
    });
    return MALFORMED_HTML(JSON.stringify(parsed));
  }

  if (parsed.length === 0) return EMPTY_HTML;

  // Array of strings → simple bullet list
  if (parsed.every((it) => typeof it === 'string')) {
    return `<ul class="export-list">${(parsed as string[])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('')}</ul>`;
  }

  // Array of objects → card grid (one card per item, key/value rows inside)
  if (parsed.every((it) => it && typeof it === 'object' && !Array.isArray(it))) {
    const items = parsed as Array<Record<string, unknown>>;
    return items
      .map((item, idx) => {
        const entries = Object.entries(item).filter(([, v]) => v != null && v !== '');
        if (!entries.length) return '';
        // Pick a reasonable title field
        const titleKey = ['name', 'title', 'kpi', 'stakeholder_name', 'criterion_name', 'resource'].find(
          (k) => typeof item[k] === 'string' && (item[k] as string).trim()
        );
        const title = titleKey ? (item[titleKey] as string) : `Item ${idx + 1}`;
        const rows = entries
          .filter(([k]) => k !== titleKey)
          .map(
            ([k, v]) =>
              `<tr><th scope="row">${escapeHtml(formatHeader(k))}</th><td>${escapeHtml(
                typeof v === 'object' ? JSON.stringify(v) : v
              )}</td></tr>`
          )
          .join('');
        return `<div class="export-card">
          <p class="export-card-title">${escapeHtml(title)}</p>
          ${rows ? `<table class="export-card-table"><tbody>${rows}</tbody></table>` : ''}
        </div>`;
      })
      .join('');
  }

  // Mixed → fallback bullet with stringified each
  logWarning('export.renderer.fallback', {
    operation: 'export.renderer.fallback',
    additionalData: { renderer: 'lineItemsCards', reason: 'mixed_types' },
  });
  return `<ul class="export-list">${(parsed as unknown[])
    .map((v) => `<li>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</li>`)
    .join('')}</ul>`;
};
