/**
 * FcChallengeQueuePage — FC queue showing CONTROLLED challenges assigned to the user.
 * Route: /cogni/fc-queue
 */

import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCorrelationId } from '@/lib/errorHandler';
import { useFcChallengeQueue } from '@/hooks/cogniblend/useFcChallengeQueue';
import { FcQueueHeader, FcQueueLoadingState, FcQueueEmptyState, FcQueueErrorState } from '@/components/cogniblend/fc/FcQueueStates';
import { FcQueueSections } from '@/components/cogniblend/fc/FcQueueSections';
import { filterFcQueueItems, splitFcQueueItems } from '@/services/cogniblend/fcQueueViewService';

export default function FcChallengeQueuePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [correlationId] = useState(() => generateCorrelationId());
  const { data, isLoading, isError, isRefetching, refetch } = useFcChallengeQueue();

  const filteredQueue = useMemo(
    () => filterFcQueueItems(data ?? [], deferredSearch),
    [data, deferredSearch],
  );
  const { awaitingItems, upcomingItems } = useMemo(
    () => splitFcQueueItems(filteredQueue),
    [filteredQueue],
  );

  if (isLoading) return <FcQueueLoadingState />;

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <FcQueueHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {isError ? (
          <FcQueueErrorState
            correlationId={correlationId}
            onRetry={() => void refetch()}
            isRetrying={isRefetching}
          />
        ) : filteredQueue.length === 0 ? (
          <FcQueueEmptyState
            hasSearch={!!deferredSearch.trim()}
            onViewDashboard={() => navigate('/cogni/dashboard')}
          />
        ) : (
          <FcQueueSections
            awaitingItems={awaitingItems}
            upcomingItems={upcomingItems}
            onOpenChallenge={(challengeId) => navigate(`/cogni/challenges/${challengeId}/finance`)}
          />
        )}
      </div>
    </div>
  );
}