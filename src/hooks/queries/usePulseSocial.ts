/**
 * Industry Pulse Social Hooks
 * Comments, Connections (Follow/Unfollow), Notifications
 * Per Project Knowledge standards
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { toast } from "sonner";
import { PULSE_QUERY_KEYS, PULSE_POLLING_INTERVALS } from "@/constants/pulse.constants";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// =====================================================
// TYPES
// =====================================================

export type PulseComment = Tables<"pulse_comments">;
export type PulseCommentInsert = TablesInsert<"pulse_comments">;
export type PulseConnection = Tables<"pulse_connections">;
export type PulseNotification = Tables<"pulse_notifications">;

export interface PulseCommentWithProvider extends PulseComment {
  provider?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  replies?: PulseCommentWithProvider[];
}

// =====================================================
// COMMENTS
// =====================================================

export function useContentComments(contentId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.comments, contentId],
    queryFn: async () => {
      if (!contentId) return [];

      const { data, error } = await supabase
        .from("pulse_comments")
        .select(`
          *,
          provider:solution_providers!pulse_comments_provider_id_fkey(id, first_name, last_name)
        `)
        .eq("content_id", contentId)
        .eq("is_deleted", false)
        .is("parent_comment_id", null) // Only top-level comments
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from("pulse_comments")
            .select(`
              *,
              provider:solution_providers!pulse_comments_provider_id_fkey(id, first_name, last_name)
            `)
            .eq("parent_comment_id", comment.id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: true });

          return {
            ...comment,
            replies: replies || [],
          } as PulseCommentWithProvider;
        })
      );

      return commentsWithReplies;
    },
    enabled: !!contentId,
    staleTime: 10 * 1000,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: PulseCommentInsert) => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .insert(comment)
        .select(`
          *,
          provider:solution_providers!pulse_comments_provider_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data as PulseCommentWithProvider;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.comments, data.content_id],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.contentDetail, data.content_id],
      });
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "add_comment" });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, contentId }: { commentId: string; contentId: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from("pulse_comments")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq("id", commentId);

      if (error) throw new Error(error.message);
      return { contentId };
    },
    onSuccess: ({ contentId }) => {
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.comments, contentId],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.contentDetail, contentId],
      });
      toast.success("Comment deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "delete_comment" });
    },
  });
}

// =====================================================
// CONNECTIONS (Follow/Unfollow)
// =====================================================

export function useIsFollowing(followerId: string | undefined, followingId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.connections, followerId, followingId],
    queryFn: async () => {
      if (!followerId || !followingId || followerId === followingId) return false;

      const { data, error } = await supabase
        .from("pulse_connections")
        .select("id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return !!data;
    },
    enabled: !!followerId && !!followingId && followerId !== followingId,
    staleTime: 30 * 1000,
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      followerId,
      followingId,
    }: {
      followerId: string;
      followingId: string;
    }) => {
      // Check if already following
      const { data: existing } = await supabase
        .from("pulse_connections")
        .select("id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      if (existing) {
        // Unfollow
        const { error } = await supabase
          .from("pulse_connections")
          .delete()
          .eq("id", existing.id);

        if (error) throw new Error(error.message);
        return { followed: false, followingId };
      } else {
        // Follow
        const { error } = await supabase
          .from("pulse_connections")
          .insert({
            follower_id: followerId,
            following_id: followingId,
          });

        if (error) throw new Error(error.message);
        return { followed: true, followingId };
      }
    },
    onSuccess: (result, { followerId, followingId }) => {
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.connections, followerId, followingId],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.followers, followingId],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.following, followerId],
      });
      queryClient.invalidateQueries({
        queryKey: [PULSE_QUERY_KEYS.providerStats],
      });

      toast.success(result.followed ? "Following!" : "Unfollowed");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "toggle_follow" });
    },
  });
}

export function useFollowers(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.followers, providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_connections")
        .select(`
          id,
          created_at,
          follower:solution_providers!pulse_connections_follower_id_fkey(id, first_name, last_name)
        `)
        .eq("following_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 60 * 1000,
  });
}

export function useFollowing(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.following, providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from("pulse_connections")
        .select(`
          id,
          created_at,
          following:solution_providers!pulse_connections_following_id_fkey(id, first_name, last_name)
        `)
        .eq("follower_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
    staleTime: 60 * 1000,
  });
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export function useNotifications(providerId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [PULSE_QUERY_KEYS.notifications, providerId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!providerId) return { items: [], nextCursor: null };

      const limit = 20;
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select(`
          *,
          related_content:pulse_content!pulse_notifications_related_content_id_fkey(id, content_type, title, headline),
          related_provider:solution_providers!pulse_notifications_related_provider_id_fkey(id, first_name, last_name)
        `)
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + limit - 1);

      if (error) throw new Error(error.message);

      return {
        items: data || [],
        nextCursor: data?.length === limit ? pageParam + limit : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!providerId,
    refetchInterval: PULSE_POLLING_INTERVALS.NOTIFICATIONS_MS,
    staleTime: 10 * 1000,
  });
}

export function useUnreadNotificationCount(providerId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.unreadCount, providerId],
    queryFn: async () => {
      if (!providerId) return 0;

      const { count, error } = await supabase
        .from("pulse_notifications")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId)
        .eq("is_read", false);

      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!providerId,
    refetchInterval: PULSE_POLLING_INTERVALS.NOTIFICATIONS_MS,
    staleTime: 10 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("pulse_notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.notifications] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.unreadCount] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "mark_notification_read" });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      const { error } = await supabase
        .from("pulse_notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("provider_id", providerId)
        .eq("is_read", false);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.notifications] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.unreadCount] });
      toast.success("All notifications marked as read");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "mark_all_notifications_read" });
    },
  });
}
