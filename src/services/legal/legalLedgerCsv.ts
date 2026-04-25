/**
 * legalLedgerCsv — Convert ledger rows to a downloadable CSV blob.
 *
 * Pure utility (no DOM/navigator side-effects beyond Blob creation) so it
 * stays unit-testable. Used by the admin Acceptance Ledger export action.
 */
import type { LedgerRow } from '@/hooks/queries/useLegalAcceptanceLedger';

const HEADERS = [
  'accepted_at',
  'document_code',
  'document_version',
  'trigger_event',
  'action',
  'user_id',
  'challenge_id',
  'template_id',
  'ip_address',
] as const;

/** Escape a single CSV cell per RFC 4180. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildLedgerCsv(rows: LedgerRow[]): string {
  const header = HEADERS.join(',');
  const body = rows
    .map((r) =>
      [
        r.accepted_at,
        r.document_code,
        r.document_version,
        r.trigger_event,
        r.action,
        r.user_id,
        r.challenge_id,
        r.template_id,
        r.ip_address,
      ]
        .map(escapeCell)
        .join(','),
    )
    .join('\r\n');
  return `${header}\r\n${body}`;
}

export function buildLedgerCsvBlob(rows: LedgerRow[]): Blob {
  // BOM so Excel detects UTF-8 correctly
  return new Blob(['\uFEFF', buildLedgerCsv(rows)], {
    type: 'text/csv;charset=utf-8;',
  });
}

export function suggestLedgerFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `legal-acceptance-ledger-${ts}.csv`;
}
