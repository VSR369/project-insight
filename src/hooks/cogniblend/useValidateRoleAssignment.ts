/**
 * useValidateRoleAssignment — Calls the `validate_role_assignment` RPC
 * to check for role fusion conflicts before assignment.
 *
 * Returns conflict details: HARD_BLOCK, SOFT_WARN, or ALLOWED.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleConflictResult {
  allowed: boolean;
  conflictType: 'HARD_BLOCK' | 'SOFT_WARN' | 'ALLOWED';
  message: string | null;
}

const ALLOWED_RESULT: RoleConflictResult = {
  allowed: true,
  conflictType: 'ALLOWED',
  message: null,
};

/**
 * Stateless utility: validate a single role assignment against the DB.
 * Uses `resolve_challenge_governance()` inside the RPC when challengeId is provided.
 */
export async function validateRoleAssignment(params: {
  userId: string;
  challengeId: string | null;
  newRole: string;
  governanceProfile?: string;
}): Promise<RoleConflictResult> {
  const { data, error } = await supabase.rpc('validate_role_assignment', {
    p_user_id: params.userId,
    p_challenge_id: params.challengeId,
    p_new_role: params.newRole,
    p_governance_profile: params.governanceProfile ?? 'STRUCTURED',
  });

  if (error) {
    console.error('validate_role_assignment RPC error:', error.message);
    // Fail-open: allow but warn
    return ALLOWED_RESULT;
  }

  const result = data as { allowed: boolean; conflict_type: string; message: string | null } | null;
  if (!result) return ALLOWED_RESULT;

  return {
    allowed: result.allowed,
    conflictType: (result.conflict_type as RoleConflictResult['conflictType']) ?? 'ALLOWED',
    message: result.message ?? null,
  };
}

/**
 * React hook wrapper for interactive conflict checking.
 * Tracks loading state and the latest validation result.
 */
export function useValidateRoleAssignment() {
  const [result, setResult] = useState<RoleConflictResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (params: {
    userId: string;
    challengeId: string | null;
    newRole: string;
    governanceProfile?: string;
  }) => {
    setIsValidating(true);
    try {
      const res = await validateRoleAssignment(params);
      setResult(res);
      return res;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { result, isValidating, validate, reset };
}
