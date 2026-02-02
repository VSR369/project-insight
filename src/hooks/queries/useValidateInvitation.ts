/**
 * useValidateInvitation Hook
 * 
 * Validates invitation tokens via the accept-provider-invitation edge function.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvitationData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invitation_type: 'standard' | 'vip_expert';
  industry_segment_id: string | null;
  industry_name: string | null;
}

interface ValidateInvitationResponse {
  success: boolean;
  invitation?: InvitationData;
  error?: string;
}

const INVITATION_STORAGE_KEY = 'pending_invitation';

/**
 * Store invitation data in sessionStorage for registration form
 */
export function storeInvitationData(data: InvitationData): void {
  sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Retrieve stored invitation data from sessionStorage
 */
export function getStoredInvitationData(): InvitationData | null {
  const stored = sessionStorage.getItem(INVITATION_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as InvitationData;
  } catch {
    return null;
  }
}

/**
 * Clear stored invitation data after successful registration
 */
export function clearStoredInvitationData(): void {
  sessionStorage.removeItem(INVITATION_STORAGE_KEY);
}

/**
 * Hook to validate invitation tokens via edge function
 */
export function useValidateInvitation() {
  return useMutation({
    mutationFn: async (token: string): Promise<InvitationData> => {
      const { data, error } = await supabase.functions.invoke<ValidateInvitationResponse>(
        'accept-provider-invitation',
        {
          body: { token },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to validate invitation');
      }

      if (!data?.success || !data.invitation) {
        throw new Error(data?.error || 'Invalid invitation');
      }

      return data.invitation;
    },
  });
}
