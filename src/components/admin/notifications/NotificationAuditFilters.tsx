/**
 * MOD-04 SCR-04-01: Filter controls for Notification Audit Log
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export interface AuditFilters {
  type: string;
  emailStatus: string;
  recipientSearch: string;
}

interface NotificationAuditFiltersProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
}

const TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'REASSIGNMENT_IN', label: 'Reassignment In' },
  { value: 'SLA_WARNING', label: 'SLA Warning' },
  { value: 'SLA_BREACH', label: 'SLA Breach' },
  { value: 'SLA_CRITICAL', label: 'SLA Critical' },
  { value: 'QUEUE_ESCALATION', label: 'Queue Escalation' },
  { value: 'EMAIL_FAIL', label: 'Email Fail' },
  { value: 'COURTESY_REGISTRANT', label: 'Courtesy' },
];

const STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RETRY_QUEUED', label: 'Retry Queued' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXHAUSTED', label: 'Exhausted' },
];

export function NotificationAuditFilters({ filters, onChange }: NotificationAuditFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <Select
        value={filters.type}
        onValueChange={(v) => onChange({ ...filters, type: v })}
      >
        <SelectTrigger className="w-full lg:w-[200px]">
          <SelectValue placeholder="Notification Type" />
        </SelectTrigger>
        <SelectContent>
          {TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.emailStatus}
        onValueChange={(v) => onChange({ ...filters, emailStatus: v })}
      >
        <SelectTrigger className="w-full lg:w-[180px]">
          <SelectValue placeholder="Email Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipient..."
          value={filters.recipientSearch}
          onChange={(e) => onChange({ ...filters, recipientSearch: e.target.value })}
          className="pl-9"
        />
      </div>
    </div>
  );
}
