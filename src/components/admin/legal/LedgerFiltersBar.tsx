/**
 * LedgerFiltersBar — Filter controls for the admin Acceptance Ledger.
 * Pure presentational; parent owns filter state.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import {
  LEDGER_DOC_CODE_OPTIONS,
  LEDGER_TRIGGER_OPTIONS,
} from '@/constants/legalLedger.constants';

interface LedgerFiltersBarProps {
  documentCode: string;
  triggerEvent: string;
  userIdSearch: string;
  fromDate: string;
  toDate: string;
  onDocumentCodeChange: (v: string) => void;
  onTriggerEventChange: (v: string) => void;
  onUserIdSearchChange: (v: string) => void;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onReset: () => void;
}

export function LedgerFiltersBar({
  documentCode,
  triggerEvent,
  userIdSearch,
  fromDate,
  toDate,
  onDocumentCodeChange,
  onTriggerEventChange,
  onUserIdSearchChange,
  onFromDateChange,
  onToDateChange,
  onReset,
}: LedgerFiltersBarProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
      <div className="lg:col-span-2">
        <Label htmlFor="ledger-doc" className="text-xs">Document</Label>
        <Select value={documentCode} onValueChange={onDocumentCodeChange}>
          <SelectTrigger id="ledger-doc" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEDGER_DOC_CODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="ledger-trigger" className="text-xs">Trigger</Label>
        <Select value={triggerEvent} onValueChange={onTriggerEventChange}>
          <SelectTrigger id="ledger-trigger" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEDGER_TRIGGER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="ledger-user" className="text-xs">User ID (UUID)</Label>
        <Input
          id="ledger-user"
          value={userIdSearch}
          onChange={(e) => onUserIdSearchChange(e.target.value)}
          placeholder="user uuid…"
          className="h-9 text-base lg:text-sm"
        />
      </div>
      <div>
        <Label htmlFor="ledger-from" className="text-xs">From</Label>
        <Input
          id="ledger-from"
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="h-9 text-base lg:text-sm"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="ledger-to" className="text-xs">To</Label>
          <Input
            id="ledger-to"
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="h-9 text-base lg:text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 self-end"
          aria-label="Reset filters"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
