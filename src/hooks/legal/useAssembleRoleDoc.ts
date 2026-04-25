/**
 * useAssembleRoleDoc — Calls the SQL RPC `assemble_role_doc` to fetch a
 * fully server-interpolated SPA / SKPA / PWA document for the current user.
 *
 * This is the canonical text shown at signature time inside `RoleLegalGate`.
 * Server-side interpolation guarantees parity with what is later persisted
 * to `legal_acceptance_log` (so audit reconstructs to identical bytes).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LegalDocCode } from '@/services/legal/roleToDocumentMap';

export interface AssembledRoleDoc {
  template_id: string;
  document_code: string;
  version: string;
  source: 'ORG' | 'PLATFORM';
  content: string;
  variables: Record<string, string>;
}

interface AssembleRoleDocArgs {
  userId: string | undefined;
  docCode: LegalDocCode | undefined;
  orgId: string | null | undefined;
  roleCode: string | null | undefined;
}

export function useAssembleRoleDoc({ userId, docCode, orgId, roleCode }: AssembleRoleDocArgs) {
  return useQuery<AssembledRoleDoc | null>({
    queryKey: ['assemble-role-doc', userId, docCode, orgId, roleCode],
    queryFn: async () => {
      if (!userId || !docCode) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('assemble_role_doc', {
        p_user_id: userId,
        p_doc_code: docCode,
        p_org_id: orgId ?? null,
        p_role_code: roleCode ?? null,
      });
      if (error) throw new Error(error.message);
      if (!data || data.success === false) {
        throw new Error(
          (data && (data.error as string)) || 'Failed to assemble legal document',
        );
      }
      return data as AssembledRoleDoc;
    },
    enabled: !!userId && !!docCode,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
