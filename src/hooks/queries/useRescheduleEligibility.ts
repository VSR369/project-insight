/**
 * Hook for checking interview reschedule eligibility
 * 
 * Combines all validation rules into a single eligibility result
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InterviewBooking, CompositeSlot } from "./useInterviewScheduling";
import {
  RescheduleEligibility,
  CancelEligibility,
  checkRescheduleEligibility,
  checkCancelEligibility,
} from "@/services/rescheduleService";

interface SystemSettings {
  maxReschedules: number;
  cutoffHours: number;
  isSystemLocked: boolean;
}

// Fetch system settings for interview scheduling
export function useInterviewSystemSettings() {
  return useQuery({
    queryKey: ["interview-system-settings"],
    queryFn: async (): Promise<SystemSettings> => {
      // Fetch max reschedules setting
      const { data: maxRescheduleSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "panel_max_reschedules")
        .maybeSingle();

      // Fetch advance booking hours (used as cutoff)
      const { data: cutoffSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "interview_booking_advance_hours")
        .maybeSingle();

      // Fetch system lock status
      const { data: lockSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "interview_system_lock")
        .maybeSingle();

      // Extract values with defaults
      const maxReschedulesValue = maxRescheduleSetting?.setting_value as { value?: number } | null;
      const cutoffValue = cutoffSetting?.setting_value as { value?: number } | null;
      const lockValue = lockSetting?.setting_value as { locked?: boolean } | null;

      return {
        maxReschedules: maxReschedulesValue?.value ?? 2,
        cutoffHours: cutoffValue?.value ?? 24,
        isSystemLocked: lockValue?.locked ?? false,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to check reschedule eligibility for a booking
 */
export function useRescheduleEligibility(
  booking: InterviewBooking | null,
  availableSlots: CompositeSlot[] | undefined
): RescheduleEligibility & { isLoading: boolean } {
  const { data: settings, isLoading: settingsLoading } = useInterviewSystemSettings();

  // If no booking, return not allowed (but not an error state)
  if (!booking) {
    return {
      allowed: false,
      reasons: [],
      isLoading: false,
    };
  }

  // While loading settings, return loading state
  if (settingsLoading || !settings) {
    return {
      allowed: false,
      reasons: [],
      isLoading: true,
    };
  }

  const hasAvailableSlots = (availableSlots?.length ?? 0) > 0;

  const eligibility = checkRescheduleEligibility({
    booking,
    maxReschedules: settings.maxReschedules,
    cutoffHours: settings.cutoffHours,
    hasAvailableSlots,
    isSystemLocked: settings.isSystemLocked,
  });

  return {
    ...eligibility,
    isLoading: false,
  };
}

/**
 * Hook to check cancel eligibility for a booking
 */
export function useCancelEligibility(
  booking: InterviewBooking | null
): CancelEligibility & { isLoading: boolean } {
  const { data: settings, isLoading: settingsLoading } = useInterviewSystemSettings();

  // If no booking, return not allowed (but not an error state)
  if (!booking) {
    return {
      allowed: false,
      reasons: [],
      isLoading: false,
    };
  }

  // While loading settings, return loading state
  if (settingsLoading || !settings) {
    return {
      allowed: false,
      reasons: [],
      isLoading: true,
    };
  }

  const eligibility = checkCancelEligibility({
    booking,
    isSystemLocked: settings.isSystemLocked,
  });

  return {
    ...eligibility,
    isLoading: false,
  };
}

/**
 * Get maximum reschedules allowed (for display)
 */
export function useMaxReschedules(): number {
  const { data: settings } = useInterviewSystemSettings();
  return settings?.maxReschedules ?? 2;
}
