/**
 * structuredFields renderer — handles JSONB objects rendered as
 * a definition list (e.g., data_resources_provided when stored as
 * a single object rather than an array).
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

export const renderStructuredFieldsList: SectionRenderer = (value) => {
  const parsed = parseIfString(value);
  if (parsed == null) return EMPTY_HTML;

  // Already an array → delegate cards style
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return EMPTY_HTML;
    return parsed
      .map((item, idx) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>).filter(
            ([, v]) => v != null && v !== ''
          );
          const rows = entries
            .map(
              ([k, v]) =>
                `<dt>${escapeHtml(formatHeader(k))}</dt><dd>${escapeHtml(
                  typeof v === 'object' ? JSON.stringify(v) : v
                )}</dd>`
            )
            .join('');
          return `<div class="export-card">
            <p class="export-card-title">Resource ${idx + 1}</p>
            <dl class="export-kv">${rows}</dl>
          </div>`;
        }
        return `<p>${escapeHtml(typeof item === 'object' ? JSON.stringify(item) : item)}</p>`;
      })
      .join('');
  }

  if (typeof parsed !== 'object') {
    if (typeof parsed === 'string' && parsed.trim()) return `<p>${escapeHtml(parsed)}</p>`;
    logWarning('export.renderer.fallback', {
      operation: 'export.renderer.fallback',
      additionalData: { renderer: 'structuredFieldsList', reason: 'not_object' },
    });
    return MALFORMED_HTML(String(parsed));
  }

  const entries = Object.entries(parsed as Record<string, unknown>).filter(
    ([, v]) => v != null && v !== ''
  );
  if (!entries.length) return EMPTY_HTML;

  const rows = entries
    .map(
      ([k, v]) =>
        `<dt>${escapeHtml(formatHeader(k))}</dt><dd>${escapeHtml(
          typeof v === 'object' ? JSON.stringify(v) : v
        )}</dd>`
    )
    .join('');
  return `<dl class="export-kv">${rows}</dl>`;
};
