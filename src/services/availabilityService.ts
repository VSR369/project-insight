/**
 * Availability Service
 * 
 * Utility functions for reviewer availability management
 * including overlap detection and time utilities.
 */

export interface TimeSlot {
  id?: string;
  startAt: Date;
  endAt: Date;
  status?: 'open' | 'held' | 'booked' | 'cancelled';
}

export interface DraftSlot {
  date: Date;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  key: string; // Unique key for React rendering
}

/**
 * Check if two time slots overlap
 */
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.startAt < slot2.endAt && slot2.startAt < slot1.endAt;
}

/**
 * Check if a new slot overlaps with any existing slots
 */
export function checkSlotOverlap(
  existingSlots: TimeSlot[],
  newSlot: TimeSlot
): { overlaps: boolean; conflictingSlot?: TimeSlot } {
  for (const existing of existingSlots) {
    if (slotsOverlap(existing, newSlot)) {
      return { overlaps: true, conflictingSlot: existing };
    }
  }
  return { overlaps: false };
}

/**
 * Convert draft slot to TimeSlot with UTC timestamps
 */
export function draftToTimeSlot(draft: DraftSlot): TimeSlot {
  const startAt = new Date(draft.date);
  startAt.setHours(draft.startHour, draft.startMinute, 0, 0);
  
  const endAt = new Date(startAt);
  endAt.setMinutes(endAt.getMinutes() + draft.durationMinutes);
  
  return { startAt, endAt };
}

/**
 * Convert draft slot to database format
 */
export function draftToDbSlot(
  draft: DraftSlot,
  reviewerId: string
): { reviewer_id: string; start_at: string; end_at: string; status: string } {
  const timeSlot = draftToTimeSlot(draft);
  
  return {
    reviewer_id: reviewerId,
    start_at: timeSlot.startAt.toISOString(),
    end_at: timeSlot.endAt.toISOString(),
    status: 'open',
  };
}

/**
 * Generate unique key for a draft slot
 */
export function generateSlotKey(date: Date, startHour: number, startMinute: number): string {
  return `${date.toISOString().split('T')[0]}-${startHour}-${startMinute}`;
}

/**
 * Format time for display (12-hour format)
 */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Format date for display
 */
export function formatSlotDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format slot time range for display
 */
export function formatSlotTimeRange(startAt: Date, endAt: Date): string {
  const startTime = startAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTime = endAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${startTime} - ${endTime}`;
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Check if a time slot is in the past
 */
export function isSlotInPast(startAt: Date): boolean {
  return startAt < new Date();
}

/**
 * Get calendar days for a month view
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Add padding days from previous month
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }
  
  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
  
  // Add padding days from next month to complete weeks
  const endPadding = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

/**
 * Group slots by date for calendar display
 */
export function groupSlotsByDate(
  slots: Array<{ start_at: string; status: string | null }>
): Map<string, Array<{ start_at: string; status: string | null }>> {
  const grouped = new Map<string, Array<{ start_at: string; status: string | null }>>();
  
  for (const slot of slots) {
    const dateKey = slot.start_at.split('T')[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(slot);
  }
  
  return grouped;
}

/**
 * Quick time presets for slot creation
 */
export const QUICK_TIME_PRESETS = [
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '5:00 PM', hour: 17, minute: 0 },
] as const;

/**
 * Duration options for slot creation
 */
export const DURATION_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: '90 minutes', value: 90 },
  { label: '120 minutes', value: 120 },
] as const;

/**
 * Hour options for time selection (12-hour format)
 */
export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1,
}));

/**
 * Minute options for time selection
 */
export const MINUTE_OPTIONS = [
  { label: '00', value: 0 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '45', value: 45 },
] as const;
