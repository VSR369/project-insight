import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchFcQueueItems, type FcQueueItem } from '@/services/cogniblend/fcQueueService';
import { handleQueryError } from '@/lib/errorHandler';

export function useFcChallengeQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fc-challenge-queue', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<FcQueueItem[]> => {
      if (!user?.id) return [];

      try {
        return await fetchFcQueueItems(user.id);
      } catch (error) {
        handleQueryError(error, {
          operation: 'fetch_fc_queue',
          component: 'useFcChallengeQueue',
          userId: user.id,
        });
        throw error;
      }
    },
  });
}

export type { FcQueueItem };