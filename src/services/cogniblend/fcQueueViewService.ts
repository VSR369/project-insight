import type { FcQueueItem } from '@/services/cogniblend/fcQueueService';

export function filterFcQueueItems(items: FcQueueItem[], searchQuery: string): FcQueueItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
}

export function splitFcQueueItems(items: FcQueueItem[]): {
  awaitingItems: FcQueueItem[];
  upcomingItems: FcQueueItem[];
} {
  return {
    awaitingItems: items.filter((item) => item.currentPhase >= 3 && !item.fcComplianceComplete),
    upcomingItems: items.filter((item) => item.currentPhase < 3),
  };
}