/**
 * Reviewer Availability Hooks
 * 
 * React Query hooks for managing reviewer interview availability slots.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleMutationError, logInfo } from "@/lib/errorHandler";
import { getCurrentUserId } from "@/lib/auditFields";
import type { Tables } from "@/integrations/supabase/types";

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
