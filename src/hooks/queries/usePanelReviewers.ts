import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type PanelReviewer = Tables<"panel_reviewers">;
export type PanelReviewerUpdate = TablesUpdate<"panel_reviewers">;

// Extended type with related data
export interface PanelReviewerWithDetails extends PanelReviewer {
  industry_names?: string[];
  level_names?: string[];
}

/**
 * Fetch all panel reviewers with optional filters
 */
export function usePanelReviewers(options?: { 
  includeInactive?: boolean;
  status?: string;
}) {
  const { includeInactive = false, status } = options || {};

  return useQuery({
    queryKey: ["panel-reviewers", { includeInactive, status }],
    queryFn: async () => {
      let query = supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, enrollment_source, expertise_level_ids, industry_segment_ids, years_experience, timezone, languages, max_interviews_per_day, notes, approval_status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      if (status) {
        query = query.eq("invitation_status", status);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as PanelReviewer[];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch a single panel reviewer by ID
 */
export function usePanelReviewer(id: string | null) {
  return useQuery({
    queryKey: ["panel-reviewers", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, enrollment_source, expertise_level_ids, industry_segment_ids, years_experience, timezone, languages, max_interviews_per_day, notes, approval_status, approved_at, approved_by, approval_notes, why_join_statement, created_at, updated_at, created_by, updated_by")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as PanelReviewer;
    },
    enabled: !!id,
  });
}

/**
 * Fetch a panel reviewer by auth user ID
 */
export function useReviewerByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["panel-reviewers", "by-user", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, enrollment_source, expertise_level_ids, industry_segment_ids, years_experience, timezone, languages, max_interviews_per_day, notes, approval_status, created_at, updated_at")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(error.message);
      }
      return data as PanelReviewer;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}

interface CreateReviewerData {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  industry_segment_ids: string[];
  expertise_level_ids: string[];
  years_experience?: number;
  timezone?: string;
  languages?: string[];
  max_interviews_per_day?: number;
  is_active?: boolean;
  notes?: string;
}

interface CreateReviewerResponse {
  success: boolean;
  data?: {
    reviewer_id: string;
    user_id: string;
    email: string;
    password: string;
  };
  error?: string;
}

/**
 * Create a new panel reviewer via edge function
 */
export function useCreatePanelReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReviewerData): Promise<CreateReviewerResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("create-panel-reviewer", {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as CreateReviewerResponse;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
        toast.success("Panel reviewer created successfully");
      } else {
        toast.error(result.error || "Failed to create reviewer");
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_panel_reviewer' });
    },
  });
}

interface SendInvitationData {
  reviewer_id: string;
  channel: "email" | "sms" | "both";
  message?: string;
  expiry_days?: number;
  password?: string;
}

/**
 * Send invitation to a panel reviewer via edge function
 */
export function useSendReviewerInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendInvitationData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("send-reviewer-invitation", {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to send invitation");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      toast.success("Invitation sent successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'send_reviewer_invitation' });
    },
  });
}

/**
 * Update an existing panel reviewer
 */
export function useUpdatePanelReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PanelReviewerUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("panel_reviewers")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PanelReviewer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      toast.success("Reviewer updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_panel_reviewer' });
    },
  });
}

/**
 * Deactivate a panel reviewer (soft delete)
 */
export function useDeactivatePanelReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const updates = await withUpdatedBy({ is_active: false });
      const { error } = await supabase
        .from("panel_reviewers")
        .update(updates)
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      toast.success("Reviewer deactivated");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_panel_reviewer' });
    },
  });
}

/**
 * Restore a deactivated panel reviewer
 */
export function useRestorePanelReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const updates = await withUpdatedBy({ is_active: true });
      const { error } = await supabase
        .from("panel_reviewers")
        .update(updates)
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      toast.success("Reviewer restored");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_panel_reviewer' });
    },
  });
}

/**
 * Get reviewer statistics by status
 */
export function usePanelReviewerStats() {
  return useQuery({
    queryKey: ["panel-reviewers", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("invitation_status, is_active, enrollment_source");

      if (error) throw new Error(error.message);

      const stats = {
        total: data.length,
        active: data.filter(r => r.is_active).length,
        inactive: data.filter(r => !r.is_active).length,
        draft: data.filter(r => r.invitation_status === "DRAFT").length,
        pending: data.filter(r => r.invitation_status === "PENDING").length,
        sent: data.filter(r => r.invitation_status === "SENT").length,
        accepted: data.filter(r => r.invitation_status === "ACCEPTED").length,
        expired: data.filter(r => r.invitation_status === "EXPIRED").length,
        cancelled: data.filter(r => r.invitation_status === "CANCELLED").length,
        declined: data.filter(r => r.invitation_status === "DECLINED").length,
      };

      return stats;
    },
    staleTime: 30000,
  });
}

/**
 * Fetch invited reviewers (enrollment_source = 'invitation') with optional status filter
 */
export function useInvitedReviewers(statusFilter?: string) {
  return useQuery({
    queryKey: ["panel-reviewers", "invited", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, invitation_sent_at, invitation_accepted_at, enrollment_source, expertise_level_ids, industry_segment_ids, years_experience, timezone, languages, max_interviews_per_day, notes, approval_status, created_at, updated_at")
        .eq("enrollment_source", "invitation")
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("invitation_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as PanelReviewer[];
    },
    staleTime: 30000,
  });
}

/**
 * Get invitation statistics for the Invitations tab
 */
export function useInvitationStats() {
  return useQuery({
    queryKey: ["panel-reviewers", "invitation-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("invitation_status")
        .eq("enrollment_source", "invitation");

      if (error) throw new Error(error.message);

      const stats = {
        totalInvited: data.length,
        draft: data.filter(r => r.invitation_status === "DRAFT").length,
        sent: data.filter(r => r.invitation_status === "SENT").length,
        accepted: data.filter(r => r.invitation_status === "ACCEPTED").length,
        declined: data.filter(r => r.invitation_status === "DECLINED").length,
        expired: data.filter(r => r.invitation_status === "EXPIRED").length,
        cancelled: data.filter(r => r.invitation_status === "CANCELLED").length,
      };

      return stats;
    },
    staleTime: 30000,
  });
}

interface CancelInvitationData {
  reviewer_id: string;
  reason?: string;
}

/**
 * Cancel a panel reviewer invitation via edge function
 */
export function useCancelReviewerInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CancelInvitationData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("cancel-reviewer-invitation", {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to cancel invitation");
      }

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      if (result.was_accepted) {
        toast.success("Invitation cancelled and regret email sent");
      } else {
        toast.success("Invitation cancelled successfully");
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cancel_reviewer_invitation' });
    },
  });
}

interface DeleteReviewerData {
  reviewer_id: string;
  reason?: string; // Required if invitation was ACCEPTED
}

/**
 * Permanently delete a panel reviewer via edge function
 * Sends regret email if the reviewer was ACCEPTED
 */
export function useDeletePanelReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteReviewerData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("delete-panel-reviewer", {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to delete reviewer");
      }

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      if (result.was_accepted) {
        toast.success("Reviewer deleted and notification email sent");
      } else {
        toast.success("Reviewer permanently deleted");
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_panel_reviewer' });
    },
  });
}

// ============================================
// REVIEWER APPROVAL HOOKS (Admin Approval Flow)
// ============================================

/**
 * Fetch pending reviewer applications (self-signup with pending approval)
 */
export function usePendingReviewers() {
  return useQuery({
    queryKey: ["panel-reviewers", "pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, enrollment_source, expertise_level_ids, industry_segment_ids, years_experience, timezone, languages, max_interviews_per_day, notes, approval_status, why_join_statement, created_at, updated_at")
        .eq("enrollment_source", "self_signup")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data as PanelReviewer[];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch approval history (approved or rejected applications)
 */
export function useReviewerApprovalHistory(status: "approved" | "rejected") {
  return useQuery({
    queryKey: ["panel-reviewers", "history", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, phone, user_id, is_active, invitation_status, enrollment_source, expertise_level_ids, industry_segment_ids, years_experience, timezone, languages, max_interviews_per_day, notes, approval_status, approved_at, approved_by, approval_notes, why_join_statement, created_at, updated_at")
        .eq("enrollment_source", "self_signup")
        .eq("approval_status", status)
        .order("approved_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as PanelReviewer[];
    },
    staleTime: 30000,
  });
}

/**
 * Get count of pending reviewer applications (for badge display)
 */
export function usePendingReviewerCount() {
  return useQuery({
    queryKey: ["panel-reviewers", "pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("panel_reviewers")
        .select("*", { count: "exact", head: true })
        .eq("enrollment_source", "self_signup")
        .eq("approval_status", "pending");

      if (error) throw new Error(error.message);
      return count || 0;
    },
    staleTime: 120_000,  // 2 minutes — badge count, low priority
  });
}

/**
 * Approve a reviewer application via edge function
 */
export function useApproveReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewerId: string) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("approve-reviewer-application", {
        body: { reviewer_id: reviewerId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to approve reviewer");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      toast.success("Reviewer approved successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'approve_reviewer' });
    },
  });
}

/**
 * Reject a reviewer application via edge function
 */
export function useRejectReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewerId, reason }: { reviewerId: string; reason: string }) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("reject-reviewer-application", {
        body: { reviewer_id: reviewerId, reason },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to reject application");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-reviewers"] });
      toast.success("Application rejected");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'reject_reviewer' });
    },
  });
}
