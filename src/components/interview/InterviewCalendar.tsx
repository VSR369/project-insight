import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay } from "date-fns";
import { CompositeSlot } from "@/hooks/queries/useInterviewScheduling";
import { formatInTimezone } from "./TimeZoneSelector";
import { cn } from "@/lib/utils";

interface InterviewCalendarProps {
  slots: CompositeSlot[];
  selectedSlot: CompositeSlot | null;
  onSelectSlot: (slot: CompositeSlot | null) => void;
  timezone: string;
  isLoading?: boolean;
}

export function InterviewCalendar({
  slots,
  selectedSlot,
  onSelectSlot,
  timezone,
  isLoading,
}: InterviewCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, CompositeSlot[]> = {};
    slots.forEach((slot) => {
      const dateKey = format(new Date(slot.start_at), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });
    return grouped;
  }, [slots]);

  // Get days for current month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get day of week the month starts on (0 = Sunday)
  const startDayOfWeek = startOfMonth(currentMonth).getDay();

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return slotsByDate[dateKey] || [];
  }, [selectedDate, slotsByDate]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    if (slotsByDate[dateKey]?.length > 0) {
      setSelectedDate(date);
      onSelectSlot(null); // Clear slot selection when changing date
    }
  };

  const handleSlotClick = (slot: CompositeSlot) => {
    onSelectSlot(selectedSlot?.id === slot.id ? null : slot);
  };

  return (
    <div className="space-y-4">
      {/* Calendar Grid */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-12" />
                ))}

                {/* Month days */}
                {monthDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const daySlots = slotsByDate[dateKey] || [];
                  const hasSlots = daySlots.length > 0;
                  const isPast = isBefore(day, startOfDay(new Date()));
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={dateKey}
                      onClick={() => handleDateClick(day)}
                      disabled={!hasSlots || isPast}
                      className={cn(
                        "h-12 rounded-md text-sm font-medium transition-colors relative",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        isToday(day) && "ring-1 ring-primary",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && hasSlots && !isPast && "bg-green-100 hover:bg-green-200 text-green-800",
                        !isSelected && !hasSlots && "text-muted-foreground",
                        isPast && "opacity-50 cursor-not-allowed",
                        !hasSlots && !isPast && "hover:bg-muted"
                      )}
                    >
                      {format(day, "d")}
                      {hasSlots && !isPast && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px]">
                          {daySlots.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Time slots for selected date */}
      {selectedDate && slotsForSelectedDate.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Available Times - {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {slotsForSelectedDate
                .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                .map((slot) => {
                  const isSlotSelected = selectedSlot?.id === slot.id;
                  const timeStr = formatInTimezone(slot.start_at, timezone, {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <Button
                      key={slot.id}
                      variant={isSlotSelected ? "default" : "outline"}
                      className={cn(
                        "justify-center",
                        isSlotSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => handleSlotClick(slot)}
                    >
                      {timeStr}
                    </Button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
          <span>Available for your level</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border" />
          <span>Not available</span>
        </div>
      </div>
    </div>
  );
}
