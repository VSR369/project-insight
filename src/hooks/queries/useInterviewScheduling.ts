import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/auditFields";
import { checkRescheduleEligibility, checkCancelEligibility } from "@/services/rescheduleService";

// Types
export interface CompositeSlot {
  id: string;
  expertise_level_id: string;
  industry_segment_id: string;
  start_at: string;
  end_at: string;
  available_reviewer_count: number;
  status: string;
}

export interface InterviewBooking {
  id: string;
  provider_id: string;
  enrollment_id: string;
  composite_slot_id: string | null;
  status: string;
  scheduled_at: string;
  reschedule_count: number;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface QuorumRequirement {
  id: string;
  expertise_level_id: string;
  industry_segment_id: string | null;
  required_quorum_count: number;
  interview_duration_minutes: number;
}

export interface BookingResult {
  success: boolean;
  booking_id?: string;
  scheduled_at?: string;
  reviewer_count?: number;
  error?: string;
}

// Fetch composite slots for an enrollment
export function useCompositeSlots(
  enrollmentId?: string,
  expertiseLevelId?: string,
  industrySegmentId?: string
) {
  return useQuery({
    queryKey: ["composite-interview-slots", enrollmentId, expertiseLevelId, industrySegmentId],
    queryFn: async () => {
      if (!expertiseLevelId || !industrySegmentId) {
        return [];
      }

      const { data, error } = await supabase
        .from("composite_interview_slots")
        .select("*")
        .eq("expertise_level_id", expertiseLevelId)
        .eq("industry_segment_id", industrySegmentId)
        .eq("status", "open")
        .gt("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data as CompositeSlot[];
    },
    enabled: !!expertiseLevelId && !!industrySegmentId,
  });
}

// Check for existing booking for an enrollment
export function useExistingBooking(enrollmentId?: string, providerId?: string) {
  return useQuery({
    queryKey: ["interview-booking", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId || !providerId) return null;

      const { data, error } = await supabase
        .from("interview_bookings")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .eq("provider_id", providerId)
        .in("status", ["scheduled", "confirmed"])
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as InterviewBooking | null;
    },
    enabled: !!enrollmentId && !!providerId,
  });
}

// Get quorum requirement for expertise level
export function useQuorumRequirement(
  expertiseLevelId?: string,
  industrySegmentId?: string
) {
  return useQuery({
    queryKey: ["quorum-requirement", expertiseLevelId, industrySegmentId],
    queryFn: async () => {
      if (!expertiseLevelId) return null;

      // First try industry-specific, then fallback to global
      let query = supabase
        .from("interview_quorum_requirements")
        .select("*")
        .eq("expertise_level_id", expertiseLevelId)
        .eq("is_active", true);

      if (industrySegmentId) {
        // Try industry-specific first
        const { data: specific } = await query
          .eq("industry_segment_id", industrySegmentId)
          .maybeSingle();

        if (specific) return specific as QuorumRequirement;
      }

      // Fallback to global (null industry)
      const { data: global } = await supabase
        .from("interview_quorum_requirements")
        .select("*")
        .eq("expertise_level_id", expertiseLevelId)
        .is("industry_segment_id", null)
        .eq("is_active", true)
        .maybeSingle();

      return global as QuorumRequirement | null;
    },
    enabled: !!expertiseLevelId,
  });
}

// Book an interview slot
export function useBookInterviewSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      providerId: string;
      enrollmentId: string;
      compositeSlotId: string;
    }) => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("book_interview_slot", {
        p_provider_id: input.providerId,
        p_enrollment_id: input.enrollmentId,
        p_composite_slot_id: input.compositeSlotId,
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);
      
      const result = data as unknown as BookingResult;
      if (!result.success) {
        throw new Error(result.error || "Failed to book interview slot");
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["interview-booking"] });
      queryClient.invalidateQueries({ queryKey: ["composite-interview-slots"] });
      queryClient.invalidateQueries({ queryKey: ["provider-enrollments"] });
      toast.success("Interview scheduled successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Cancel an interview booking
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      reason?: string;
      skipValidation?: boolean; // Used during reschedule flow
    }) => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Not authenticated");

      // Get current booking for validation (unless skipped)
      if (!input.skipValidation) {
        const { data: booking, error: fetchError } = await supabase
          .from("interview_bookings")
          .select("*")
          .eq("id", input.bookingId)
          .single();

        if (fetchError) throw new Error(fetchError.message);
        if (!booking) throw new Error("Booking not found");

        // Fetch system lock status
        const { data: lockSetting } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "interview_system_lock")
          .maybeSingle();

        const lockValue = lockSetting?.setting_value as { locked?: boolean } | null;
        const isSystemLocked = lockValue?.locked ?? false;

        // Validate cancellation eligibility
        const cancelEligibility = checkCancelEligibility({
          booking: booking as InterviewBooking,
          isSystemLocked,
        });

        if (!cancelEligibility.allowed) {
          throw new Error(cancelEligibility.reasons[0] || "Cancellation not allowed");
        }
      }

      const { data, error } = await supabase.rpc("cancel_interview_booking", {
        p_booking_id: input.bookingId,
        p_reason: input.reason || null,
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel booking");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-booking"] });
      queryClient.invalidateQueries({ queryKey: ["composite-interview-slots"] });
      queryClient.invalidateQueries({ queryKey: ["provider-enrollments"] });
      toast.success("Booking cancelled successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Reschedule booking (cancel + rebook)
export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      currentBookingId: string;
      providerId: string;
      enrollmentId: string;
      newCompositeSlotId: string;
    }) => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Not authenticated");

      // Get current booking with all fields for validation
      const { data: currentBooking, error: fetchError } = await supabase
        .from("interview_bookings")
        .select("*")
        .eq("id", input.currentBookingId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if (!currentBooking) throw new Error("Booking not found");

      // Fetch system settings
      const { data: maxRescheduleSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "panel_max_reschedules")
        .maybeSingle();

      const { data: cutoffSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "interview_booking_advance_hours")
        .maybeSingle();

      const { data: lockSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "interview_system_lock")
        .maybeSingle();

      const maxReschedulesValue = maxRescheduleSetting?.setting_value as { value?: number } | null;
      const cutoffValue = cutoffSetting?.setting_value as { value?: number } | null;
      const lockValue = lockSetting?.setting_value as { locked?: boolean } | null;

      const maxReschedules = maxReschedulesValue?.value ?? 2;
      const cutoffHours = cutoffValue?.value ?? 24;
      const isSystemLocked = lockValue?.locked ?? false;

      // Validate reschedule eligibility
      const rescheduleEligibility = checkRescheduleEligibility({
        booking: currentBooking as InterviewBooking,
        maxReschedules,
        cutoffHours,
        hasAvailableSlots: true, // We already have a new slot selected
        isSystemLocked,
      });

      if (!rescheduleEligibility.allowed) {
        throw new Error(rescheduleEligibility.reasons[0] || "Reschedule not allowed");
      }

      const currentCount = currentBooking?.reschedule_count ?? 0;

      // Cancel current booking (skip validation since we already validated)
      const { error: cancelError } = await supabase.rpc("cancel_interview_booking", {
        p_booking_id: input.currentBookingId,
        p_reason: "Rescheduled by provider",
        p_user_id: userId,
      });

      if (cancelError) throw new Error(cancelError.message);

      // Book new slot
      const { data: bookResult, error: bookError } = await supabase.rpc("book_interview_slot", {
        p_provider_id: input.providerId,
        p_enrollment_id: input.enrollmentId,
        p_composite_slot_id: input.newCompositeSlotId,
        p_user_id: userId,
      });

      if (bookError) throw new Error(bookError.message);

      const result = bookResult as unknown as BookingResult;
      if (!result.success) {
        throw new Error(result.error || "Failed to reschedule");
      }

      // Update reschedule count
      await supabase
        .from("interview_bookings")
        .update({ reschedule_count: currentCount + 1 })
        .eq("id", result.booking_id);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-booking"] });
      queryClient.invalidateQueries({ queryKey: ["composite-interview-slots"] });
      queryClient.invalidateQueries({ queryKey: ["provider-enrollments"] });
      toast.success("Interview rescheduled successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Get booking history for an enrollment
export function useBookingHistory(enrollmentId?: string, providerId?: string) {
  return useQuery({
    queryKey: ["booking-history", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId || !providerId) return [];

      const { data, error } = await supabase
        .from("interview_bookings")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as InterviewBooking[];
    },
    enabled: !!enrollmentId && !!providerId,
  });
}

// Check if user can schedule interview
export function useCanScheduleInterview(enrollmentId?: string, lifecycleRank?: number) {
  const isEligible = (lifecycleRank ?? 0) >= 110;
  const alreadyScheduled = (lifecycleRank ?? 0) >= 120;
  
  return {
    canSchedule: isEligible && !alreadyScheduled,
    isEligible,
    alreadyScheduled,
    reason: !isEligible 
      ? "You must pass the assessment before scheduling an interview"
      : alreadyScheduled 
        ? "Interview already scheduled"
        : undefined,
  };
}
