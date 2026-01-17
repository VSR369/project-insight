/**
 * Reschedule Eligibility Service
 * 
 * Implements interview rescheduling rules:
 * - Status must be "scheduled" or "confirmed"
 * - Must be before cutoff time (default 24 hours)
 * - Must not exceed max reschedule count
 * - Must have available alternative slots
 * - Must not be system-locked
 */

import { InterviewBooking } from "@/hooks/queries/useInterviewScheduling";

export interface RescheduleEligibility {
  allowed: boolean;
  reasons: string[];
}

export interface CancelEligibility {
  allowed: boolean;
  reasons: string[];
}

export interface RescheduleContext {
  booking: InterviewBooking;
  maxReschedules: number;
  cutoffHours: number;
  hasAvailableSlots: boolean;
  isSystemLocked?: boolean;
}

export interface CancelContext {
  booking: InterviewBooking;
  isSystemLocked?: boolean;
}

// Status values that allow rescheduling
const RESCHEDULABLE_STATUSES = ["scheduled", "confirmed"];

// Status values that block all changes (terminal states)
const TERMINAL_STATUSES = ["completed", "no_show"];

// Status indicating interview is in progress
const IN_PROGRESS_STATUS = "in_progress";

// Status indicating booking was cancelled
const CANCELLED_STATUS = "cancelled";

/**
 * Check if an interview booking can be rescheduled
 */
export function checkRescheduleEligibility(context: RescheduleContext): RescheduleEligibility {
  const reasons: string[] = [];
  const { booking, maxReschedules, cutoffHours, hasAvailableSlots, isSystemLocked } = context;

  // Rule 1: Check if system is locked
  if (isSystemLocked) {
    reasons.push("Interview scheduling is currently locked for administrative reasons");
  }

  // Rule 2: Check booking status
  if (booking.status === CANCELLED_STATUS) {
    reasons.push("Cannot reschedule a cancelled booking");
  } else if (booking.status === IN_PROGRESS_STATUS) {
    reasons.push("Cannot reschedule an interview that is in progress");
  } else if (TERMINAL_STATUSES.includes(booking.status)) {
    reasons.push(`Cannot reschedule an interview that is ${booking.status.replace("_", " ")}`);
  } else if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
    reasons.push(`Booking status "${booking.status}" does not allow rescheduling`);
  }

  // Rule 3: Check reschedule count limit
  if (booking.reschedule_count >= maxReschedules) {
    reasons.push(`Maximum reschedule limit (${maxReschedules}) reached`);
  }

  // Rule 4: Check cutoff time
  const scheduledTime = new Date(booking.scheduled_at);
  const now = new Date();
  const hoursUntilInterview = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilInterview <= 0) {
    reasons.push("Interview time has already passed");
  } else if (hoursUntilInterview < cutoffHours) {
    reasons.push(`Reschedule cutoff time (${cutoffHours}h prior) has passed`);
  }

  // Rule 5: Check if alternative slots are available
  if (!hasAvailableSlots) {
    reasons.push("No alternative interview slots are currently available");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

/**
 * Check if an interview booking can be cancelled
 */
export function checkCancelEligibility(context: CancelContext): CancelEligibility {
  const reasons: string[] = [];
  const { booking, isSystemLocked } = context;

  // Rule 1: Check if system is locked
  if (isSystemLocked) {
    reasons.push("Interview scheduling is currently locked for administrative reasons");
  }

  // Rule 2: Check booking status
  if (booking.status === CANCELLED_STATUS) {
    reasons.push("Booking is already cancelled");
  } else if (booking.status === IN_PROGRESS_STATUS) {
    reasons.push("Cannot cancel an interview that is in progress");
  } else if (TERMINAL_STATUSES.includes(booking.status)) {
    reasons.push(`Cannot cancel an interview that is ${booking.status.replace("_", " ")}`);
  }

  // Rule 3: Check if interview time has passed
  const scheduledTime = new Date(booking.scheduled_at);
  const now = new Date();
  if (scheduledTime <= now) {
    reasons.push("Interview time has already passed");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

/**
 * Format eligibility reasons into a user-friendly message
 */
export function formatEligibilityMessage(reasons: string[]): string {
  if (reasons.length === 0) return "";
  if (reasons.length === 1) return reasons[0];
  return reasons.join(". ");
}
