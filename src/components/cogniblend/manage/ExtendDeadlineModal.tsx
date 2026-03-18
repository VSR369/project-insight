/**
 * ExtendDeadlineModal — Modal for extending a challenge's submission deadline.
 *
 * Requires new date (after current deadline) and reason (min 50 chars).
 */

import { useState, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useExtendDeadline } from '@/hooks/cogniblend/useExtendDeadline';

/* ─── Types ──────────────────────────────────────────────── */

interface ExtendDeadlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeTitle: string;
  currentDeadline: string | null;
  userId: string;
}

/* ─── Constants ──────────────────────────────────────────── */

const MIN_REASON_LENGTH = 50;

/* ─── Component ──────────────────────────────────────────── */

export function ExtendDeadlineModal({
  open,
  onOpenChange,
  challengeId,
  challengeTitle,
  currentDeadline,
  userId,
}: ExtendDeadlineModalProps) {
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [extendDays, setExtendDays] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notifySolvers, setNotifySolvers] = useState(true);
  const extendMutation = useExtendDeadline();

  const currentDate = currentDeadline ? new Date(currentDeadline) : new Date();
  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH;
  const canSubmit = !!newDate && !reasonTooShort && !extendMutation.isPending;

  const handleDateSelect = useCallback((date: Date | undefined) => {
    setNewDate(date);
    if (date) {
      const diffMs = date.getTime() - currentDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      setExtendDays(diffDays > 0 ? String(diffDays) : '');
    } else {
      setExtendDays('');
    }
  }, [currentDate]);

  const handleDaysChange = useCallback((value: string) => {
    setExtendDays(value);
    const days = parseInt(value, 10);
    if (!isNaN(days) && days > 0) {
      setNewDate(addDays(currentDate, days));
    } else {
      setNewDate(undefined);
    }
  }, [currentDate]);

  const handleExtend = () => {
    if (!newDate) return;

    extendMutation.mutate(
      {
        challengeId,
        challengeTitle,
        userId,
        oldDeadline: currentDeadline ?? new Date().toISOString(),
        newDeadline: newDate.toISOString(),
        reason: reason.trim(),
        notifySolvers,
      },
      {
        onSuccess: () => {
          setNewDate(undefined);
          setExtendDays('');
          setReason('');
          setNotifySolvers(true);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-bold">Extend Submission Deadline</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {/* Current deadline */}
          <div>
            <Label className="text-xs text-muted-foreground">Current Deadline</Label>
            <p className="text-sm font-medium text-foreground mt-1">
              {currentDeadline
                ? format(new Date(currentDeadline), 'dd MMMM yyyy, HH:mm')
                : 'No deadline set'}
            </p>
          </div>

          {/* New deadline date picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">New Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !newDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, 'PPP') : 'Select new deadline'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={(date) => date <= currentDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Reason for Extension <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the deadline is being extended (min 50 characters)..."
              rows={4}
              maxLength={500}
              className="text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <p
                className={cn(
                  'text-[10px]',
                  reasonTooShort ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {reason.trim().length} / {MIN_REASON_LENGTH} min characters
              </p>
              <p className="text-[10px] text-muted-foreground">
                {reason.length} / 500
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={extendMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExtend}
            disabled={!canSubmit}
          >
            {extendMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
