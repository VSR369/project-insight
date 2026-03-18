/**
 * useCommunicationPermission — Pre-check hook for role-to-role messaging.
 * Queries the communication_permissions table to verify if a sender role
 * can communicate with a recipient role at the current challenge phase.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommPermissionCheck {
  allowed: boolean;
  reason: string | null;
}

/**
 * Check if a sender role can message a recipient role at the given phase.
 */
export function useCommunicationPermission(
  senderRole: string | undefined,
  recipientRole: string | undefined,
  currentPhase: number | undefined,
) {
  return useQuery({
    queryKey: ['communication_permissions', senderRole, recipientRole, currentPhase],
    queryFn: async (): Promise<CommPermissionCheck> => {
      if (!senderRole || !recipientRole || currentPhase == null) {
        return { allowed: true, reason: null };
      }

      // Check for explicit block rules
      const { data: blockRules, error } = await supabase
        .from('communication_permissions')
        .select('allowed, challenge_phase_min, challenge_phase_max')
        .eq('from_role', senderRole)
        .eq('to_role', recipientRole);

      if (error) {
        console.error('Communication permission check failed:', error.message);
        return { allowed: true, reason: null }; // Fail-open for query errors
      }

      if (!blockRules || blockRules.length === 0) {
        // No explicit rules = allowed by default
        return { allowed: true, reason: null };
      }

      // Check if any rule applies to the current phase
      for (const rule of blockRules) {
        const inRange =
          currentPhase >= rule.challenge_phase_min &&
          currentPhase <= rule.challenge_phase_max;

        if (inRange) {
          return {
            allowed: rule.allowed,
            reason: rule.allowed
              ? null
              : `${senderRole} cannot directly message ${recipientRole} at Phase ${currentPhase}.`,
          };
        }
      }

      // No matching phase range = allowed
      return { allowed: true, reason: null };
    },
    enabled: !!senderRole && !!recipientRole && currentPhase != null,
    staleTime: 5 * 60 * 1000, // Reference data
  });
}

/**
 * Imperative check for use in mutation pre-flight.
 */
export async function checkCommunicationPermission(
  senderRole: string,
  recipientRole: string,
  currentPhase: number,
): Promise<CommPermissionCheck> {
  const { data, error } = await supabase
    .from('communication_permissions')
    .select('allowed, challenge_phase_min, challenge_phase_max')
    .eq('from_role', senderRole)
    .eq('to_role', recipientRole);

  if (error || !data?.length) {
    return { allowed: true, reason: null };
  }

  for (const rule of data) {
    if (currentPhase >= rule.challenge_phase_min && currentPhase <= rule.challenge_phase_max) {
      return {
        allowed: rule.allowed,
        reason: rule.allowed
          ? null
          : `${senderRole} cannot directly message ${recipientRole} at Phase ${currentPhase}.`,
      };
    }
  }

  return { allowed: true, reason: null };
}
