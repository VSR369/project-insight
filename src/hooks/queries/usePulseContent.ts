/**
 * Industry Pulse Content Hooks
 * CRUD operations for pulse_content table with React Query
 * Per Project Knowledge standards
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { toast } from "sonner";
import { PULSE_QUERY_KEYS, PULSE_POLLING_INTERVALS } from "@/constants/pulse.constants";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// =====================================================
// TYPES
// =====================================================

export type PulseContent = Tables<"pulse_content">;
export type PulseContentInsert = TablesInsert<"pulse_content">;
export type PulseContentUpdate = TablesUpdate<"pulse_content">;

export interface PulseContentWithProvider extends PulseContent {
  provider?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  industry_segment?: {
    id: string;
    name: string;
  } | null;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

export interface FeedFilters {
  contentType?: string;
  industrySegmentId?: string;
  tagId?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// FEED QUERY (with polling)
// =====================================================

export function usePulseFeed(filters: FeedFilters = {}) {
  const { contentType, industrySegmentId, tagId, providerId, limit = 20, offset = 0 } = filters;

  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.feed, filters],
    queryFn: async () => {
      let query = supabase
        .from("pulse_content")
        .select(`
          *,
          provider:solution_providers!pulse_content_provider_id_fkey(id, first_name, last_name),
          industry_segment:industry_segments!pulse_content_industry_segment_id_fkey(id, name),
          tags:pulse_content_tags(tag:pulse_tags(id, name))
        `)
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (contentType) {
        query = query.eq("content_type", contentType as "article" | "gallery" | "podcast" | "post" | "reel" | "spark");
      }
      if (industrySegmentId) {
        query = query.eq("industry_segment_id", industrySegmentId);
      }
      if (providerId) {
        query = query.eq("provider_id", providerId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as PulseContentWithProvider[];
    },
    refetchInterval: PULSE_POLLING_INTERVALS.FEED_MS,
    staleTime: 10 * 1000, // 10 seconds
  });
}

// =====================================================
// SINGLE CONTENT DETAIL
// =====================================================

export function usePulseContentDetail(contentId: string | undefined) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.contentDetail, contentId],
    queryFn: async () => {
      if (!contentId) return null;

      const { data, error } = await supabase
        .from("pulse_content")
        .select(`
          *,
          provider:solution_providers!pulse_content_provider_id_fkey(id, first_name, last_name),
          industry_segment:industry_segments!pulse_content_industry_segment_id_fkey(id, name),
          tags:pulse_content_tags(tag:pulse_tags(id, name))
        `)
        .eq("id", contentId)
        .eq("is_deleted", false)
        .single();

      if (error) throw new Error(error.message);
      return data as PulseContentWithProvider;
    },
    enabled: !!contentId,
    refetchInterval: PULSE_POLLING_INTERVALS.ACTIVE_CONTENT_MS,
    staleTime: 5 * 1000, // 5 seconds for active content
  });
}

// =====================================================
// MY CONTENT (drafts, published, etc.)
// =====================================================

export function useMyPulseContent(providerId: string | undefined, status?: string) {
  return useQuery({
    queryKey: [PULSE_QUERY_KEYS.content, "my", providerId, status],
    queryFn: async () => {
      if (!providerId) return [];

      let query = supabase
        .from("pulse_content")
        .select(`
          *,
          industry_segment:industry_segments!pulse_content_industry_segment_id_fkey(id, name),
          tags:pulse_content_tags(tag:pulse_tags(id, name))
        `)
        .eq("provider_id", providerId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("content_status", status as "archived" | "draft" | "published" | "removed" | "scheduled");
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as PulseContentWithProvider[];
    },
    enabled: !!providerId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// =====================================================
// CREATE CONTENT
// =====================================================

export function useCreatePulseContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: PulseContentInsert) => {
      const contentWithAudit = await withCreatedBy(content);

      const { data, error } = await supabase
        .from("pulse_content")
        .insert(contentWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseContent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.content] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.feed] });
      
      if (data.content_status === "draft") {
        toast.success("Draft saved");
      } else if (data.content_status === "published") {
        toast.success("Content published!");
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "create_pulse_content" });
    },
  });
}

// =====================================================
// UPDATE CONTENT
// =====================================================

export function useUpdatePulseContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PulseContentUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);

      const { data, error } = await supabase
        .from("pulse_content")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseContent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.content] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.contentDetail, data.id] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.feed] });
      toast.success("Content updated");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_pulse_content" });
    },
  });
}

// =====================================================
// PUBLISH CONTENT
// =====================================================

export function usePublishPulseContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const updatesWithAudit = await withUpdatedBy({
        content_status: "published" as const,
      });

      const { data, error } = await supabase
        .from("pulse_content")
        .update(updatesWithAudit)
        .eq("id", contentId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseContent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.content] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.contentDetail, data.id] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.feed] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.providerStats] });
      toast.success("Content published!");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "publish_pulse_content" });
    },
  });
}

// =====================================================
// DELETE CONTENT (soft delete)
// =====================================================

export function useDeletePulseContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const updatesWithAudit = await withUpdatedBy({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      });

      // Also set deleted_by
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from("pulse_content")
        .update({
          ...updatesWithAudit,
          deleted_by: userId,
        })
        .eq("id", contentId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.content] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.feed] });
      toast.success("Content deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "delete_pulse_content" });
    },
  });
}

// =====================================================
// ARCHIVE CONTENT
// =====================================================

export function useArchivePulseContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const updatesWithAudit = await withUpdatedBy({
        content_status: "archived" as const,
      });

      const { data, error } = await supabase
        .from("pulse_content")
        .update(updatesWithAudit)
        .eq("id", contentId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as PulseContent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.content] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.contentDetail, data.id] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.feed] });
      toast.success("Content archived");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "archive_pulse_content" });
    },
  });
}

// =====================================================
// ADD CONTENT TAGS
// =====================================================

export function useAddContentTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, tagIds }: { contentId: string; tagIds: string[] }) => {
      if (tagIds.length === 0) return [];

      const insertData = tagIds.map(tagId => ({
        content_id: contentId,
        tag_id: tagId,
      }));

      const { data, error } = await supabase
        .from("pulse_content_tags")
        .insert(insertData)
        .select();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.contentDetail, variables.contentId] });
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.tags] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "add_content_tags" });
    },
  });
}

// =====================================================
// REMOVE CONTENT TAG
// =====================================================

export function useRemoveContentTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, tagId }: { contentId: string; tagId: string }) => {
      const { error } = await supabase
        .from("pulse_content_tags")
        .delete()
        .eq("content_id", contentId)
        .eq("tag_id", tagId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.contentDetail, variables.contentId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "remove_content_tag" });
    },
  });
}
