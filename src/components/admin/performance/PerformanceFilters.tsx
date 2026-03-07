import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { AdminMetricRow } from '@/hooks/queries/useAllAdminMetrics';

interface PerformanceFiltersProps {
  availability: string;
  onAvailabilityChange: (v: string) => void;
  sortBy: string;
  onSortByChange: (v: string) => void;
  data: AdminMetricRow[];
}

function exportCsv(data: AdminMetricRow[]) {
  const headers = ['Admin', 'Tier', 'Status', 'Completed', 'SLA Rate %', 'Avg Hours', 'Pending', 'At-Risk', 'Queue Claims', 'Reassign In', 'Reassign Out'];
  const rows = data.map((d) => [
    d.full_name, d.admin_tier, d.availability_status,
    d.completed_total,
    d.completed_total > 0 ? Math.round((d.sla_compliant_total / d.completed_total) * 100) : '',
    d.avg_processing_hours ?? '',
    d.current_pending, d.sla_at_risk_count, d.open_queue_claims,
    d.reassignments_received, d.reassignments_sent,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin-performance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PerformanceFilters({ availability, onAvailabilityChange, sortBy, onSortByChange, data }: PerformanceFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
      <Select value={availability} onValueChange={onAvailabilityChange}>
        <SelectTrigger className="w-full lg:w-[180px]">
          <SelectValue placeholder="Availability" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="Available">Available</SelectItem>
          <SelectItem value="Partially_Available">Partially Available</SelectItem>
          <SelectItem value="Fully_Loaded">Fully Loaded</SelectItem>
          <SelectItem value="On_Leave">On Leave</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full lg:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sla_asc">SLA Rate ↑</SelectItem>
          <SelectItem value="sla_desc">SLA Rate ↓</SelectItem>
          <SelectItem value="pending_desc">Pending ↓</SelectItem>
          <SelectItem value="completed_desc">Completed ↓</SelectItem>
          <SelectItem value="name_asc">Name A-Z</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="ml-auto" onClick={() => exportCsv(data)}>
        <Download className="h-4 w-4 mr-1" />
        <span className="hidden lg:inline">Export CSV</span>
      </Button>
    </div>
  );
}
