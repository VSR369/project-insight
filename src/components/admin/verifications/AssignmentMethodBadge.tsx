import { Badge } from '@/components/ui/badge';

interface AssignmentMethodBadgeProps {
  method: string | null;
}

const LABELS: Record<string, string> = {
  AUTO_ASSIGNED: 'Auto-Assigned',
  OPEN_QUEUE_CLAIMED: 'Queue Claimed',
  REASSIGNED: 'Reassigned',
  AFFINITY_ROUTING: 'Affinity Routing',
};

export function AssignmentMethodBadge({ method }: AssignmentMethodBadgeProps) {
  if (!method) return null;
  return (
    <Badge variant="secondary" className="text-xs">
      {LABELS[method] ?? method}
    </Badge>
  );
}
