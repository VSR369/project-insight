import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withUpdatedBy } from "@/lib/auditFields";

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
        .select("*")
        .order("created_at", { ascending: false });

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
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as PanelReviewer;
    },
    enabled: !!id,
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
      toast.error(`Failed to create reviewer: ${error.message}`);
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
      toast.error(`Failed to send invitation: ${error.message}`);
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
      toast.error(`Failed to update reviewer: ${error.message}`);
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
      toast.error(`Failed to deactivate reviewer: ${error.message}`);
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
      toast.error(`Failed to restore reviewer: ${error.message}`);
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
        .select("invitation_status, is_active");

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
      toast.error(`Failed to cancel invitation: ${error.message}`);
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
      toast.error(`Failed to delete reviewer: ${error.message}`);
    },
  });
}
