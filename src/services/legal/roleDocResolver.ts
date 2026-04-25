/**
 * roleDocResolver — Thin wrapper around the SQL function
 * `resolve_active_legal_template(org_id, doc_code, role_code)`.
 *
 * Returns the active template (org override if AGG / LC / FC, else platform
 * default) along with `source` so the UI can badge "Org template" vs
 * "Platform default".
 */
import { supabase } from '@/integrations/supabase/client';
import type { LegalDocCode } from './roleToDocumentMap';

export interface ResolvedLegalTemplate {
  template_id: string;
  document_code: string;
  version: string;
  content: string;
  source: 'ORG' | 'PLATFORM';
}

export async function resolveActiveLegalTemplate(
  orgId: string | null,
  docCode: LegalDocCode,
  roleCode: string | null,
): Promise<ResolvedLegalTemplate | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('resolve_active_legal_template', {
    p_org_id: orgId,
    p_doc_code: docCode,
    p_role_code: roleCode,
  });
  if (error) throw new Error(error.message);
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row as ResolvedLegalTemplate;
}
