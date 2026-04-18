/**
 * Shared types for export-document section renderers.
 * Renderers are pure functions: (value, ctx) => HTML string.
 * No DB calls, no React, no side-effects.
 */

export interface RenderContext {
  /** Master-data label maps (resolved upstream by the caller) */
  maturityLabels: Record<string, string>;
  ipModelLabels: Record<string, string>;
  visibilityLabels: Record<string, string>;
  /** Currency code from challenge (for amount formatting) */
  currencyCode: string | null;
}

export type SectionRenderer = (value: unknown, ctx: RenderContext) => string;

export const EMPTY_HTML = '<p class="export-empty">Not provided.</p>';
export const NOT_DEFINED_HTML = '<p class="export-empty">Not defined yet.</p>';
export const MALFORMED_HTML = (raw: string) =>
  `<pre class="export-malformed">${raw.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c))}</pre>`;

export const escapeHtml = (s: unknown): string => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};
