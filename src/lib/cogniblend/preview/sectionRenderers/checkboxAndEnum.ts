/**
 * checkboxAndEnum renderers — handle:
 *  - checkbox_multi (string array) → badge list (eligibility, visibility)
 *  - single enum values → human-readable label (maturity, ip_model, visibility)
 */

import { logWarning } from '@/lib/errorHandler';
import { EMPTY_HTML, escapeHtml, type SectionRenderer } from './types';

const VISIBILITY_FALLBACK: Record<string, string> = {
  public: 'Public — visible to all Solution Providers',
  private: 'Private — restricted access',
  invite_only: 'Invite Only — invited Solution Providers',
};

const ELIGIBILITY_FALLBACK: Record<string, string> = {
  certified_expert: 'Certified Expert',
  expert_invitee: 'Expert Invitee',
  hybrid: 'Hybrid',
  open: 'Open to all',
};

const parseIfString = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  const trimmed = v.trim();
  if (!trimmed.startsWith('[')) return v;
  try {
    return JSON.parse(trimmed);
  } catch {
    return v;
  }
};

const labelize = (raw: string): string =>
  ELIGIBILITY_FALLBACK[raw] ??
  VISIBILITY_FALLBACK[raw] ??
  raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const renderCheckboxBadges: SectionRenderer = (value) => {
  const parsed = parseIfString(value);
  if (parsed == null) return EMPTY_HTML;

  if (typeof parsed === 'string') {
    if (!parsed.trim()) return EMPTY_HTML;
    return `<p><span class="export-badge">${escapeHtml(labelize(parsed))}</span></p>`;
  }

  if (!Array.isArray(parsed)) {
    logWarning('export.renderer.fallback', { renderer: 'checkboxBadges', reason: 'not_array' });
    return EMPTY_HTML;
  }
  if (parsed.length === 0) return EMPTY_HTML;

  const badges = (parsed as unknown[])
    .filter((s) => typeof s === 'string' && (s as string).trim())
    .map((s) => `<span class="export-badge">${escapeHtml(labelize(s as string))}</span>`)
    .join(' ');
  return `<p>${badges}</p>`;
};

/**
 * renderEnumLabel — single enum value with optional label map.
 * Falls back to humanised version of the raw value.
 */
export const renderEnumLabel = (
  value: unknown,
  labels: Record<string, string>,
  variant: 'primary' | 'default' = 'primary'
): string => {
  if (value == null || value === '') return EMPTY_HTML;
  const raw = String(value);
  const label = labels[raw] ?? labelize(raw);
  const klass = variant === 'primary' ? 'export-badge export-badge-primary' : 'export-badge';
  return `<p><span class="${klass}">${escapeHtml(label)}</span></p>`;
};
