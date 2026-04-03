/**
 * LifecyclePhaseTable — Table of 10 lifecycle phases for one governance mode.
 */

import { useLifecyclePhaseConfig } from '@/hooks/queries/useLifecyclePhaseConfig';
import { Skeleton } from '@/components/ui/skeleton';
import LifecyclePhaseRow from './LifecyclePhaseRow';

interface LifecyclePhaseTableProps {
  mode: string;
}

export default function LifecyclePhaseTable({ mode }: LifecyclePhaseTableProps) {
  const { data: phases, isLoading, error } = useLifecyclePhaseConfig(mode);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load phase config: {error.message}
      </div>
    );
  }

  if (!phases || phases.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No phase configuration found for {mode} mode.
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-center font-medium text-muted-foreground w-12">#</th>
            <th className="p-2 text-left font-medium text-muted-foreground min-w-[160px]">Phase Name</th>
            <th className="p-2 text-left font-medium text-muted-foreground">Role</th>
            <th className="p-2 text-left font-medium text-muted-foreground">2nd Role</th>
            <th className="p-2 text-left font-medium text-muted-foreground">Type</th>
            <th className="p-2 text-center font-medium text-muted-foreground">Auto</th>
            <th className="p-2 text-center font-medium text-muted-foreground">SLA</th>
            <th className="p-2 w-10" />
          </tr>
        </thead>
        <tbody>
          {phases.map((phase) => (
            <LifecyclePhaseRow key={phase.id} phase={phase} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
