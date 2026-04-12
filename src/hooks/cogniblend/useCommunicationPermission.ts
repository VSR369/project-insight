/**
 * useCommunicationPermission — Pre-check hook for role-to-role messaging.
 * Queries the communication_permissions table to verify if a sender role
 * can communicate with a recipient role at the current challenge phase.
 *
 * R-07: Also enforces AD agreement requirement for AGG model challenges.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommPermissionCheck {
  allowed: boolean;
  reason: string | null;
}

/**
 * Check if a sender role can message a recipient role at the given phase.
 * For AGG model challenges, also checks ad_accepted on solver_enrollments.
 */
export function useCommunicationPermission(
  senderRole: string | undefined,
  recipientRole: string | undefined,
  currentPhase: number | undefined,
  challengeId?: string,
  senderId?: string,
) {
  return useQuery({
    queryKey: ['communication_permissions', senderRole, recipientRole, currentPhase, challengeId, senderId],
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
        return { allowed: true, reason: null }; // Fail-open for query errors
      }

      if (!blockRules || blockRules.length === 0) {
        return { allowed: true, reason: null };
      }

      // Check if any rule applies to the current phase
      for (const rule of blockRules) {
        const inRange =
          currentPhase >= rule.challenge_phase_min &&
          currentPhase <= rule.challenge_phase_max;

        if (inRange) {
          if (!rule.allowed) {
            return {
              allowed: false,
              reason: `${senderRole} cannot directly message ${recipientRole} at Phase ${currentPhase}.`,
            };
          }
        }
      }

      // R-07: BR-AD-001–005 — AGG model AD agreement check
      if (challengeId && senderId) {
        const adCheck = await checkAdAgreement(challengeId, senderId);
        if (!adCheck.allowed) {
          return adCheck;
        }
      }

      return { allowed: true, reason: null };
    },
    enabled: !!senderRole && !!recipientRole && currentPhase != null,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if sender has accepted AD agreement for AGG model challenges.
 */
async function checkAdAgreement(
  challengeId: string,
  senderId: string,
): Promise<CommPermissionCheck> {
  // 1. Check if challenge uses AGG operating model
  const { data: challenge, error: cErr } = await supabase
    .from('challenges')
    .select('operating_model')
    .eq('id', challengeId)
    .single();

  if (cErr || !challenge) {
    return { allowed: true, reason: null }; // Fail-open
  }

  if (challenge.operating_model !== 'AGG') {
    return { allowed: true, reason: null };
  }

  // 2. Check solver enrollment for ad_accepted flag
  const { data: enrollment, error: eErr } = await supabase
    .from('solver_enrollments')
    .select('ad_accepted')
    .eq('challenge_id', challengeId)
    .eq('solver_id', senderId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (eErr) {
    return { allowed: true, reason: null }; // Fail-open
  }

  if (!enrollment || !enrollment.ad_accepted) {
    return {
      allowed: false,
      reason: 'Anti-Disintermediation agreement must be accepted before messaging in AGG model challenges.',
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Imperative check for use in mutation pre-flight.
 */
export async function checkCommunicationPermission(
  senderRole: string,
  recipientRole: string,
  currentPhase: number,
  challengeId?: string,
  senderId?: string,
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
      if (!rule.allowed) {
        return {
          allowed: false,
          reason: `${senderRole} cannot directly message ${recipientRole} at Phase ${currentPhase}.`,
        };
      }
    }
  }

  // R-07: AD agreement check for AGG model
  if (challengeId && senderId) {
    return checkAdAgreement(challengeId, senderId);
  }

  return { allowed: true, reason: null };
}
