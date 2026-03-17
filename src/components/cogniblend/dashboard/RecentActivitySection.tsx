/**
 * RecentActivitySection — Embeds ActivityFeed (M-05) with maxItems=5
 * and a "View all activity" link.
 */

import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

const ActivityFeed = lazy(() => import('@/components/cogniblend/ActivityFeed'));

export function RecentActivitySection() {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[hsl(218,52%,25%)] mb-4">Recent Activity</h2>

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <ActivityFeed maxItems={5} showLoadMore={false} />
      </Suspense>

      <div className="mt-3">
        <Link
          to="/cogni/activity"
          className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(210,68%,54%)] hover:underline"
        >
          View all activity
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
