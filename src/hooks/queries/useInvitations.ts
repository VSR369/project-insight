import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Invitation = Tables<"solution_provider_invitations">;
export type InvitationInsert = TablesInsert<"solution_provider_invitations">;
export type InvitationUpdate = TablesUpdate<"solution_provider_invitations">;

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

// Helper to determine invitation status
export function getInvitationStatus(invitation: Invitation): InvitationStatus {
  if (invitation.accepted_at) return "accepted";
  if (invitation.declined_at) return "declined";
  if (new Date(invitation.expires_at) < new Date()) return "expired";
  return "pending";
}

// Fetch all invitations with optional filters
export function useInvitations(filters?: {
  status?: InvitationStatus;
  invitationType?: "standard" | "vip_expert";
}) {
  return useQuery({
    queryKey: ["solution_provider_invitations", filters],
    queryFn: async () => {
      let query = supabase
        .from("solution_provider_invitations")
        .select("*, industry_segments(name)")
        .order("created_at", { ascending: false });

      if (filters?.invitationType) {
        query = query.eq("invitation_type", filters.invitationType);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Filter by status client-side (since status is computed)
      let invitations = data || [];
      if (filters?.status) {
        invitations = invitations.filter(
          (inv) => getInvitationStatus(inv) === filters.status
        );
      }

      return invitations;
    },
  });
}

// Create a new invitation
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitation: Omit<InvitationInsert, "token" | "expires_at">) => {
      // Generate a secure token
      const token = crypto.randomUUID();
      
      // Set expiry to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from("solution_provider_invitations")
        .insert({
          ...invitation,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("duplicate") || error.code === "23505") {
          throw new Error("An invitation has already been sent to this email address");
        }
        throw new Error(error.message);
      }
      return data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solution_provider_invitations"] });
      toast.success("Invitation created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invitation: ${error.message}`);
    },
  });
}

// Resend/extend an invitation
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Generate new token and extend expiry
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from("solution_provider_invitations")
        .update({
          token,
          expires_at: expiresAt.toISOString(),
          accepted_at: null,
          declined_at: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solution_provider_invitations"] });
      toast.success("Invitation resent successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend invitation: ${error.message}`);
    },
  });
}

// Delete an invitation
export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("solution_provider_invitations")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solution_provider_invitations"] });
      toast.success("Invitation deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete invitation: ${error.message}`);
    },
  });
}

// Get invitation stats
export function useInvitationStats() {
  return useQuery({
    queryKey: ["solution_provider_invitations_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solution_provider_invitations")
        .select("accepted_at, declined_at, expires_at");

      if (error) throw new Error(error.message);

      const now = new Date();
      const stats = {
        total: data?.length || 0,
        pending: 0,
        accepted: 0,
        declined: 0,
        expired: 0,
      };

      data?.forEach((inv) => {
        if (inv.accepted_at) stats.accepted++;
        else if (inv.declined_at) stats.declined++;
        else if (new Date(inv.expires_at) < now) stats.expired++;
        else stats.pending++;
      });

      return stats;
    },
  });
}
