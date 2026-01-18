/**
 * Availability Calendar Component
 * 
 * Calendar view showing reviewer's availability slots with
 * color coding for open, booked, and draft slots.
 */

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  getCalendarDays, 
  groupSlotsByDate, 
  isDateInPast,
  type DraftSlot 
} from "@/services/availabilityService";
import type { InterviewSlot } from "@/hooks/queries/useReviewerAvailability";

interface AvailabilityCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  existingSlots: InterviewSlot[];
  draftSlots: DraftSlot[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function AvailabilityCalendar({
  currentMonth,
  onMonthChange,
  existingSlots,
  draftSlots,
  selectedDate,
  onDateSelect,
}: AvailabilityCalendarProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  
  const slotsByDate = useMemo(
    () => groupSlotsByDate(existingSlots),
    [existingSlots]
  );
  
  const draftsByDate = useMemo(() => {
    const grouped = new Map<string, DraftSlot[]>();
    for (const draft of draftSlots) {
      const dateKey = draft.date.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(draft);
    }
    return grouped;
  }, [draftSlots]);

  const navigateMonth = (direction: -1 | 1) => {
    const newMonth = new Date(year, month + direction, 1);
    onMonthChange(newMonth);
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  const getDayStatus = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const existingSlotsForDay = slotsByDate.get(dateKey) || [];
    const draftSlotsForDay = draftsByDate.get(dateKey) || [];
    
    const hasOpen = existingSlotsForDay.some(s => s.status === 'open');
    const hasBooked = existingSlotsForDay.some(s => s.status === 'booked' || s.status === 'held');
    const hasDraft = draftSlotsForDay.length > 0;
    
    return { hasOpen, hasBooked, hasDraft, slotCount: existingSlotsForDay.length + draftSlotsForDay.length };
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isPast = isDateInPast(date);
          const inCurrentMonth = isCurrentMonth(date);
          const status = getDayStatus(date);
          const isDateToday = isToday(date);
          const isDateSelected = isSelected(date);
          const isClickable = !isPast && inCurrentMonth;

          return (
            <button
              key={index}
              onClick={() => isClickable && onDateSelect(date)}
              disabled={!isClickable}
              className={cn(
                "relative h-10 w-full rounded-md text-sm transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                !inCurrentMonth && "text-muted-foreground/50",
                isPast && "text-muted-foreground/30 cursor-not-allowed bg-muted/30",
                isClickable && "hover:bg-muted cursor-pointer",
                isDateToday && "ring-2 ring-primary ring-offset-1",
                isDateSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              aria-label={`${date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}${status.hasOpen ? ', has open slots' : ''}${status.hasDraft ? ', has draft slots' : ''}`}
            >
              <span>{date.getDate()}</span>
              
              {/* Slot indicators */}
              {status.slotCount > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {status.hasOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                  {status.hasDraft && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                  {status.hasBooked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Open</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Draft</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}
