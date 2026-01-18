/**
 * Reviewer Availability Hooks
 * 
 * React Query hooks for managing reviewer interview availability slots.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleMutationError, logInfo, logAuditEvent } from "@/lib/errorHandler";
import { getCurrentUserId } from "@/lib/auditFields";
import type { Tables } from "@/integrations/supabase/types";

// Types for cancellation
export interface CancellationResult {
  success: boolean;
  error?: string;
  booking_id?: string;
  provider_id?: string;
  provider_name?: string;
  provider_email?: string;
  scheduled_at?: string;
  industry_name?: string;
  expertise_name?: string;
  cancelled_slots_count?: number;
}

export interface BookingForSlot {
  bookingId: string;
  providerName: string;
  providerEmail: string;
  scheduledAt: string;
  industryName?: string;
  expertiseName?: string;
}

// Types
export type InterviewSlot = Tables<"interview_slots">;

export interface CreateSlotInput {
  start_at: string;
  end_at: string;
}

// Get current reviewer's profile from panel_reviewers
export function useCurrentReviewer() {
  return useQuery({
    queryKey: ["current-reviewer"],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("NOT_AUTHENTICATED");

      // First check if ANY reviewer record exists for this user
      const { data: anyReviewer, error: checkError } = await supabase
        .from("panel_reviewers")
        .select("id, is_active, approval_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) throw new Error(checkError.message);
      
      // No reviewer record at all
      if (!anyReviewer) {
        throw new Error("NOT_A_REVIEWER");
      }
      
      // Reviewer exists but is inactive
      if (!anyReviewer.is_active) {
        throw new Error("REVIEWER_INACTIVE");
      }

      // Fetch full profile for active reviewer
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
  });
}

// Fetch reviewer's own slots for a given month range
export function useReviewerSlots(
  reviewerId: string | undefined,
  monthStart: Date,
  monthEnd: Date
) {
  return useQuery({
    queryKey: ["reviewer-slots", reviewerId, monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: async () => {
      if (!reviewerId) return [];

      const { data, error } = await supabase
        .from("interview_slots")
        .select("*")
        .eq("reviewer_id", reviewerId)
        .gte("start_at", monthStart.toISOString())
        .lte("start_at", monthEnd.toISOString())
        .order("start_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data as InterviewSlot[];
    },
    enabled: !!reviewerId,
  });
}

// Create multiple slots in one transaction
export function useCreateReviewerSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { reviewerId: string; slots: CreateSlotInput[] }) => {
      const { reviewerId, slots } = input;

      if (slots.length === 0) {
        throw new Error("No slots to create");
      }

      // Prepare slots for insertion
      const slotsToInsert = slots.map((slot) => ({
        reviewer_id: reviewerId,
        start_at: slot.start_at,
        end_at: slot.end_at,
        status: 'open' as const,
      }));

      const { data, error } = await supabase
        .from("interview_slots")
        .insert(slotsToInsert)
        .select();

      if (error) {
        // Check for unique constraint violation
        if (error.code === "23505") {
          throw new Error("One or more slots overlap with existing availability");
        }
        throw new Error(error.message);
      }

      logInfo(`Created ${data.length} availability slots`, {
        operation: "create_reviewer_slots",
        component: "ReviewerAvailability",
      });

      return data as InterviewSlot[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reviewer-slots"] });
      toast.success(`Availability saved. ${data.length} slots are now open for booking.`);
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: "create_reviewer_slots",
        component: "ReviewerAvailability",
      });
    },
  });
}

// Delete an OPEN slot
export function useDeleteReviewerSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotId: string) => {
      // First verify the slot exists and is open
      const { data: slot, error: fetchError } = await supabase
        .from("interview_slots")
        .select("id, status")
        .eq("id", slotId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if (!slot) throw new Error("Slot not found");
      
      if (slot.status !== 'open') {
        throw new Error("Only open slots can be deleted. This slot is currently " + slot.status);
      }

      const { error } = await supabase
        .from("interview_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw new Error(error.message);

      logInfo("Deleted availability slot", {
        operation: "delete_reviewer_slot",
        component: "ReviewerAvailability",
      });

      return slotId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewer-slots"] });
      toast.success("Slot removed from your availability");
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: "delete_reviewer_slot",
        component: "ReviewerAvailability",
      });
    },
  });
}

// Get booking details for a booked slot
export function useBookingForSlot(slotId: string | null) {
  return useQuery({
    queryKey: ["booking-for-slot", slotId],
    queryFn: async (): Promise<BookingForSlot | null> => {
      if (!slotId) return null;

      // Find the booking linked to this slot
      const { data: bookingReviewer, error: brError } = await supabase
        .from("booking_reviewers")
        .select(`
          booking_id,
          interview_bookings!inner (
            id,
            provider_id,
            scheduled_at,
            status,
            enrollment_id
          )
        `)
        .eq("slot_id", slotId)
        .maybeSingle();

      if (brError) throw new Error(brError.message);
      if (!bookingReviewer) return null;

      const booking = (bookingReviewer as any).interview_bookings;
      if (!booking || !['scheduled', 'confirmed'].includes(booking.status)) {
        return null;
      }

      // Get provider details
      const { data: provider, error: provError } = await supabase
        .from("solution_providers")
        .select(`
          id,
          first_name,
          last_name,
          user_id,
          profiles!inner (email)
        `)
        .eq("id", booking.provider_id)
        .single();

      if (provError) throw new Error(provError.message);

      // Get enrollment details for industry/expertise names
      const { data: enrollment, error: enrError } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          industry_segments (name),
          expertise_levels (name)
        `)
        .eq("id", booking.enrollment_id)
        .single();

      const providerName = [provider?.first_name, provider?.last_name]
        .filter(Boolean)
        .join(" ") || "Provider";
      const providerEmail = (provider as any)?.profiles?.email || "";

      return {
        bookingId: booking.id,
        providerName,
        providerEmail,
        scheduledAt: booking.scheduled_at,
        industryName: (enrollment as any)?.industry_segments?.name,
        expertiseName: (enrollment as any)?.expertise_levels?.name,
      };
    },
    enabled: !!slotId,
  });
}

// Cancel a booked slot (cancels entire booking, notifies provider)
export function useCancelBookedSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      slotId, 
      reviewerId, 
      reason = "Reviewer cancelled availability" 
    }: { 
      slotId: string; 
      reviewerId: string;
      reason?: string;
    }) => {
      // Call the RPC function to cancel the booking
      const { data, error } = await supabase.rpc("cancel_booked_slot_by_reviewer", {
        p_slot_id: slotId,
        p_reviewer_id: reviewerId,
        p_reason: reason,
      });

      if (error) throw new Error(error.message);

      const result = data as unknown as CancellationResult;
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel booking");
      }

      // Send email notification to provider
      if (result.provider_email) {
        try {
          const { error: notifyError } = await supabase.functions.invoke(
            "notify-booking-cancelled",
            {
              body: {
                provider_email: result.provider_email,
                provider_name: result.provider_name,
                scheduled_at: result.scheduled_at,
                industry_name: result.industry_name,
                expertise_name: result.expertise_name,
                booking_id: result.booking_id,
              },
            }
          );

          if (notifyError) {
            console.error("Failed to send cancellation email:", notifyError);
            // Don't throw - booking is already cancelled, email is best-effort
          }
        } catch (emailError) {
          console.error("Error calling notification function:", emailError);
        }
      }

      logAuditEvent("booked_slot_cancelled_by_reviewer", {
        slot_id: slotId,
        reviewer_id: reviewerId,
        booking_id: result.booking_id,
        provider_id: result.provider_id,
        cancelled_slots_count: result.cancelled_slots_count,
      });

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["reviewer-slots"] });
      queryClient.invalidateQueries({ queryKey: ["booking-for-slot"] });
      toast.success(
        `Interview cancelled. ${result.provider_name} has been notified by email.`
      );
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: "cancel_booked_slot",
        component: "ReviewerAvailability",
      });
    },
  });
}
