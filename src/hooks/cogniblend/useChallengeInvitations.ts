import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import {
  fetchCertifiedProviders,
  fetchChallengeVisibility,
  inviteProvider,
  revokeInvitation,
} from '@/services/cogniblend/lifecycle/challengeInvitations';

export function useChallengeVisibility(challengeId: string | null) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'visibility'],
    queryFn: () => fetchChallengeVisibility(challengeId as string),
    enabled: !!challengeId,
    staleTime: 60_000,
  });
}

export function useCertifiedProviders(challengeId: string | null) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'invitations'],
    queryFn: () => fetchCertifiedProviders(challengeId as string),
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export function useInviteProvider(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => inviteProvider(challengeId, providerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges', challengeId, 'invitations'] });
      toast.success('Invitation sent');
    },
    onError: (e) => handleMutationError(e, { operation: 'invite_provider', component: 'useInviteProvider' }),
  });
}

export function useRevokeInvitation(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges', challengeId, 'invitations'] });
      toast.success('Invitation revoked');
    },
    onError: (e) => handleMutationError(e, { operation: 'revoke_invitation', component: 'useRevokeInvitation' }),
  });
}
