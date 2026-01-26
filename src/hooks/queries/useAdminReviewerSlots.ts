import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError, logAuditEvent, logWarning } from "@/lib/errorHandler";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type InterviewSlot = Database["public"]["Tables"]["interview_slots"]["Row"];
type PanelReviewer = Database["public"]["Tables"]["panel_reviewers"]["Row"];

export interface SlotFilters {
  reviewerSearch: string;
  industrySegmentIds: string[];
  expertiseLevelIds: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  status: "all" | "open" | "booked" | "cancelled" | "held";
}

export interface AdminSlotWithReviewer extends InterviewSlot {
  reviewer: Pick<
    PanelReviewer,
    "id" | "name" | "email" | "timezone" | "industry_segment_ids" | "expertise_level_ids"
  >;
}

export interface SlotSummary {
  totalSlots: number;
  openSlots: number;
  bookedSlots: number;
  uniqueReviewers: number;
}

// Helper to get lookup maps for industries and expertise levels
export function useSlotLookupMaps() {
  return useQuery({
    queryKey: ["slot-lookup-maps"],
    queryFn: async () => {
      const [industriesRes, levelsRes] = await Promise.all([
        supabase
          .from("industry_segments")
          .select("id, name, code")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("expertise_levels")
          .select("id, name, level_number")
          .eq("is_active", true)
          .order("level_number"),
      ]);

      if (industriesRes.error) throw new Error(industriesRes.error.message);
      if (levelsRes.error) throw new Error(levelsRes.error.message);

      const industryMap = new Map(
        industriesRes.data.map((i) => [i.id, i.name])
      );
      const levelMap = new Map(levelsRes.data.map((l) => [l.id, l.name]));

      return {
        industries: industriesRes.data,
        levels: levelsRes.data,
        industryMap,
        levelMap,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Fetch all active reviewers for dropdown
export function useActiveReviewers() {
  return useQuery({
    queryKey: ["active-reviewers-for-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, timezone, industry_segment_ids, expertise_level_ids")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("name");

      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 60 * 1000,
  });
}

// Main hook: Fetch future interview slots with reviewer details
export function useAllReviewerSlots(filters: SlotFilters) {
  return useQuery({
    queryKey: ["admin-reviewer-slots", filters],
    queryFn: async () => {
      // Start building the query - fetch slots with reviewer join
      let query = supabase
        .from("interview_slots")
        .select(
          `
          id,
          start_at,
          end_at,
          status,
          cancelled_reason,
          cancelled_at,
          created_at,
          reviewer_id,
          reviewer:panel_reviewers!inner(
            id,
            name,
            email,
            timezone,
            industry_segment_ids,
            expertise_level_ids
          )
        `
        )
        .gt("start_at", new Date().toISOString()) // FUTURE SLOTS ONLY
        .eq("reviewer.is_active", true)
        .order("start_at", { ascending: true });

      // Apply status filter
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Apply date range filters
      if (filters.dateFrom) {
        query = query.gte("start_at", filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        // Add 1 day to include the entire end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("start_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      // Cast and filter client-side for reviewer search and industry/expertise filters
      let slots = (data as unknown as AdminSlotWithReviewer[]) || [];

      // Filter by reviewer name search
      if (filters.reviewerSearch.trim()) {
        const search = filters.reviewerSearch.toLowerCase();
        slots = slots.filter(
          (s) =>
            s.reviewer.name?.toLowerCase().includes(search) ||
            s.reviewer.email?.toLowerCase().includes(search)
        );
      }

      // Filter by industry segments (overlap)
      if (filters.industrySegmentIds.length > 0) {
        slots = slots.filter((s) =>
          s.reviewer.industry_segment_ids?.some((id) =>
            filters.industrySegmentIds.includes(id)
          )
        );
      }

      // Filter by expertise levels (overlap)
      if (filters.expertiseLevelIds.length > 0) {
        slots = slots.filter((s) =>
          s.reviewer.expertise_level_ids?.some((id) =>
            filters.expertiseLevelIds.includes(id)
          )
        );
      }

      return slots;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Calculate summary from slots
export function calculateSlotSummary(
  slots: AdminSlotWithReviewer[] | undefined
): SlotSummary {
  if (!slots || slots.length === 0) {
    return { totalSlots: 0, openSlots: 0, bookedSlots: 0, uniqueReviewers: 0 };
  }

  const uniqueReviewerIds = new Set(slots.map((s) => s.reviewer_id));

  return {
    totalSlots: slots.length,
    openSlots: slots.filter((s) => s.status === "open").length,
    bookedSlots: slots.filter((s) => s.status === "booked").length,
    uniqueReviewers: uniqueReviewerIds.size,
  };
}

// Admin create slot for a reviewer
export function useAdminCreateSlotForReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewerId,
      startAt,
      endAt,
      notifyReviewer,
      reviewerEmail,
      reviewerName,
    }: {
      reviewerId: string;
      startAt: string;
      endAt: string;
      notifyReviewer: boolean;
      reviewerEmail: string;
      reviewerName: string;
    }) => {
      // Check for conflicts
      const { data: conflicts, error: conflictError } = await supabase
        .from("interview_slots")
        .select("id")
        .eq("reviewer_id", reviewerId)
        .lt("start_at", endAt)
        .gt("end_at", startAt)
        .neq("status", "cancelled");

      if (conflictError) throw new Error(conflictError.message);
      if (conflicts && conflicts.length > 0) {
        throw new Error(
          "This reviewer already has a slot at this time. Please choose a different time."
        );
      }

      // Create the slot
      const { data, error } = await supabase
        .from("interview_slots")
        .insert({
          reviewer_id: reviewerId,
          start_at: startAt,
          end_at: endAt,
          status: "open",
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Send notification if requested
      if (notifyReviewer && reviewerEmail) {
        try {
          await supabase.functions.invoke("notify-slot-modified-by-admin", {
            body: {
              action: "created",
              reviewer_email: reviewerEmail,
              reviewer_name: reviewerName,
              slot_date: new Date(startAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              slot_time: `${new Date(startAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })} - ${new Date(endAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}`,
            },
          });
        } catch (notifyErr) {
          logWarning("Failed to send notification email", {
            operation: "admin_create_slot_notify",
          });
        }
      }

      logAuditEvent("admin_created_slot_for_reviewer", {
        slotId: data.id,
        reviewerId,
        startAt,
        endAt,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviewer-slots"] });
      toast.success("Slot created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "admin_create_slot" });
    },
  });
}

// Admin modify slot time
export function useAdminModifySlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slotId,
      reviewerId,
      newStartAt,
      newEndAt,
      reason,
      reviewerEmail,
      reviewerName,
    }: {
      slotId: string;
      reviewerId: string;
      newStartAt: string;
      newEndAt: string;
      reason: string;
      reviewerEmail: string;
      reviewerName: string;
    }) => {
      // Check for conflicts (exclude current slot)
      const { data: conflicts, error: conflictError } = await supabase
        .from("interview_slots")
        .select("id")
        .eq("reviewer_id", reviewerId)
        .neq("id", slotId)
        .lt("start_at", newEndAt)
        .gt("end_at", newStartAt)
        .neq("status", "cancelled");

      if (conflictError) throw new Error(conflictError.message);
      if (conflicts && conflicts.length > 0) {
        throw new Error(
          "This time conflicts with another slot for this reviewer."
        );
      }

      // Update the slot
      const { data, error } = await supabase
        .from("interview_slots")
        .update({
          start_at: newStartAt,
          end_at: newEndAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", slotId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Send notification
      try {
        await supabase.functions.invoke("notify-slot-modified-by-admin", {
          body: {
            action: "modified",
            reviewer_email: reviewerEmail,
            reviewer_name: reviewerName,
            slot_date: new Date(newStartAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            slot_time: `${new Date(newStartAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })} - ${new Date(newEndAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}`,
            reason,
          },
        });
      } catch (notifyErr) {
        logWarning("Failed to send modification notification", {
          operation: "admin_modify_slot_notify",
        });
      }

      logAuditEvent("admin_modified_slot", {
        slotId,
        newStartAt,
        newEndAt,
        reason,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviewer-slots"] });
      toast.success("Slot updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "admin_modify_slot" });
    },
  });
}

// Admin delete open slot
export function useAdminDeleteSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slotId,
      reason,
      reviewerEmail,
      reviewerName,
      slotDate,
      slotTime,
    }: {
      slotId: string;
      reason: string;
      reviewerEmail: string;
      reviewerName: string;
      slotDate: string;
      slotTime: string;
    }) => {
      // Verify slot is open
      const { data: slot, error: fetchError } = await supabase
        .from("interview_slots")
        .select("status")
        .eq("id", slotId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if (slot.status !== "open") {
        throw new Error("Only open slots can be deleted. Use cancel for booked slots.");
      }

      // Delete the slot
      const { error } = await supabase
        .from("interview_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw new Error(error.message);

      // Send notification
      try {
        await supabase.functions.invoke("notify-slot-modified-by-admin", {
          body: {
            action: "deleted",
            reviewer_email: reviewerEmail,
            reviewer_name: reviewerName,
            slot_date: slotDate,
            slot_time: slotTime,
            reason,
          },
        });
      } catch (notifyErr) {
        logWarning("Failed to send deletion notification", {
          operation: "admin_delete_slot_notify",
        });
      }

      logAuditEvent("admin_deleted_slot", { slotId, reason });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviewer-slots"] });
      toast.success("Slot deleted successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "admin_delete_slot" });
    },
  });
}

// Admin cancel booked slot
export function useAdminCancelBookedSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slotId,
      reason,
      reviewerEmail,
      reviewerName,
      slotDate,
      slotTime,
    }: {
      slotId: string;
      reason: string;
      reviewerEmail: string;
      reviewerName: string;
      slotDate: string;
      slotTime: string;
    }) => {
      // Get booking info for this slot
      const { data: bookingReviewer, error: brError } = await supabase
        .from("booking_reviewers")
        .select(
          `
          booking_id,
          interview_bookings!inner(
            id,
            provider_id,
            enrollment_id,
            status,
            solution_providers!inner(
              first_name,
              last_name,
              user_id
            )
          )
        `
        )
        .eq("slot_id", slotId)
        .maybeSingle();

      if (brError) throw new Error(brError.message);

      // Update slot to cancelled
      const { error: updateError } = await supabase
        .from("interview_slots")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", slotId);

      if (updateError) throw new Error(updateError.message);

      // If there's a booking, get provider email and notify
      let providerEmail: string | null = null;
      let providerName: string | null = null;

      if (bookingReviewer?.interview_bookings) {
        const booking = bookingReviewer.interview_bookings as any;
        const provider = booking.solution_providers;
        providerName = `${provider.first_name || ""} ${provider.last_name || ""}`.trim();

        // Get provider email from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", provider.user_id)
          .single();

        providerEmail = profile?.email || null;
      }

      // Send notification to reviewer
      try {
        await supabase.functions.invoke("notify-slot-modified-by-admin", {
          body: {
            action: "booking_cancelled",
            reviewer_email: reviewerEmail,
            reviewer_name: reviewerName,
            slot_date: slotDate,
            slot_time: slotTime,
            reason,
            provider_email: providerEmail,
            provider_name: providerName,
          },
        });
      } catch (notifyErr) {
        logWarning("Failed to send cancellation notification", {
          operation: "admin_cancel_booking_notify",
        });
      }

      logAuditEvent("admin_cancelled_booked_slot", { slotId, reason });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviewer-slots"] });
      toast.success("Booking cancelled successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "admin_cancel_booking" });
    },
  });
}
