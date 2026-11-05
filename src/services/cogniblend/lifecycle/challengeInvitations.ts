/**
 * Challenge invitations (DEF-0035 invite_only flow). The RPCs
 * list_certified_providers_for_challenge, invite_provider_to_challenge and
 * revoke_challenge_invitation are the enforcement authority; this module only
 * forwards requests and derives UI state.
 */
import { supabase } from '@/integrations/supabase/client';

export interface CertifiedProviderRow {
  provider_id: string;
  provider_name: string;
  industry_segment_name: string | null;
  expertise_level: number;
  star_rating: number | null;
  invitation_id: string | null;
  invitation_status: string | null;
  invited_at: string | null;
  valid_until: string | null;
}

export type InvitationUiStatus = 'not_invited' | 'invited' | 'accepted' | 'declined' | 'revoked' | 'expired';

export interface CertifiedProviderView extends CertifiedProviderRow {
  uiStatus: InvitationUiStatus;
  canInvite: boolean;
  canRevoke: boolean;
}

/** Pure derivation so the UI and tests share one rule. */
export function deriveInvitationState(row: CertifiedProviderRow, now: Date = new Date()): Pick<CertifiedProviderView, 'uiStatus' | 'canInvite' | 'canRevoke'> {
  let uiStatus: InvitationUiStatus = 'not_invited';
  if (row.invitation_status === 'invited') {
    uiStatus = row.valid_until && new Date(row.valid_until) < now ? 'expired' : 'invited';
  } else if (row.invitation_status === 'accepted' || row.invitation_status === 'declined' || row.invitation_status === 'revoked') {
    uiStatus = row.invitation_status;
  }
  return {
    uiStatus,
    canInvite: uiStatus === 'not_invited' || uiStatus === 'revoked' || uiStatus === 'expired' || uiStatus === 'declined',
    canRevoke: uiStatus === 'invited',
  };
}

export async function fetchCertifiedProviders(challengeId: string): Promise<CertifiedProviderView[]> {
  const { data, error } = await supabase.rpc('list_certified_providers_for_challenge', {
    p_challenge_id: challengeId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CertifiedProviderRow[]).map((row) => ({ ...row, ...deriveInvitationState(row) }));
}

export async function inviteProvider(challengeId: string, providerId: string): Promise<void> {
  const { data, error } = await supabase.rpc('invite_provider_to_challenge', {
    p_challenge_id: challengeId,
    p_provider_id: providerId,
  });
  if (error) throw new Error(error.message);
  const result = data as unknown as { success?: boolean; error?: string } | null;
  if (result && result.success === false) throw new Error(result.error ?? 'invite_failed');
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { data, error } = await supabase.rpc('revoke_challenge_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw new Error(error.message);
  const result = data as unknown as { success?: boolean; error?: string } | null;
  if (result && result.success === false) throw new Error(result.error ?? 'revoke_failed');
}
