/**
 * MOD-04 SCR-04-01: Filter controls for Notification Audit Log
 * Figma: labels above each filter, Export CSV in filter row
 */
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CalendarIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuditFilters {
  type: string;
  emailStatus: string;
  recipientSearch: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface NotificationAuditFiltersProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
  onExportCsv?: () => void;
  hasData?: boolean;
}

const TYPES = [
  { value: 'ALL', label: 'All' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'REASSIGNMENT_IN', label: 'Reassignment In' },
  { value: 'SLA_WARNING', label: 'SLA Warning' },
  { value: 'SLA_BREACH', label: 'SLA Breach' },
  { value: 'SLA_CRITICAL', label: 'SLA Critical' },
  { value: 'QUEUE_ESCALATION', label: 'Queue Escalation' },
  { value: 'EMAIL_FAIL', label: 'Email Fail' },
  { value: 'COURTESY_REGISTRANT', label: 'Courtesy' },
  { value: 'COURTESY_TIER2', label: 'Courtesy Tier 2' },
  { value: 'COURTESY_TIER3', label: 'Courtesy Tier 3' },
];

const STATUSES = [
  { value: 'ALL', label: 'All' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RETRY_QUEUED', label: 'Retry Queued' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXHAUSTED', label: 'Exhausted' },
];

export function NotificationAuditFilters({ filters, onChange, onExportCsv, hasData }: NotificationAuditFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 flex-wrap items-end">
      {/* Notification Type */}
      <div className="w-full lg:w-[200px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notification Type</label>
        <Select
          value={filters.type}
          onValueChange={(v) => onChange({ ...filters, type: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="w-full lg:w-[180px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
        <Select
          value={filters.emailStatus}
          onValueChange={(v) => onChange({ ...filters, emailStatus: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date From */}
      <div className="w-full lg:w-[160px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !filters.dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? format(filters.dateFrom, 'dd-MM-yyyy') : 'dd-mm-yyyy'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom ?? undefined}
              onSelect={(d) => onChange({ ...filters, dateFrom: d ?? null })}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date To */}
      <div className="w-full lg:w-[160px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !filters.dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? format(filters.dateTo, 'dd-MM-yyyy') : 'dd-mm-yyyy'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo ?? undefined}
              onSelect={(d) => onChange({ ...filters, dateTo: d ?? null })}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Recipient Search */}
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Recipient</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={filters.recipientSearch}
            onChange={(e) => onChange({ ...filters, recipientSearch: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Export CSV */}
      {onExportCsv && (
        <Button variant="outline" size="sm" onClick={onExportCsv} disabled={!hasData} className="shrink-0">
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      )}
    </div>
  );
}
