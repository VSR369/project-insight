import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import {
  fetchMinimumModeFlags,
  updateMinimumModeFlags,
  type MinimumModeFlags,
} from '@/services/cogniblend/lifecycle/minimumModeService';

const STALE_TIME_MS = 30_000;

export function useMinimumModeFlags(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'minimum-mode-flags'],
    queryFn: () => fetchMinimumModeFlags(challengeId as string),
    enabled: !!challengeId,
    staleTime: STALE_TIME_MS,
  });
}

export function useUpdateMinimumModeFlags(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flags: MinimumModeFlags) => updateMinimumModeFlags(challengeId as string, flags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', challengeId] });
      toast.success('Challenge flags updated successfully');
    },
    onError: (e) => handleMutationError(e, { operation: 'update_minimum_mode_flags', component: 'MinimumModeFlagsCard' }),
  });
}
