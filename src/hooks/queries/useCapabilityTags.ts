import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CapabilityTag {
  id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CapabilityTagInsert {
  name: string;
  description?: string | null;
  display_order?: number | null;
  is_active?: boolean;
}

export interface CapabilityTagUpdate {
  id: string;
  name?: string;
  description?: string | null;
  display_order?: number | null;
  is_active?: boolean;
}

export function useCapabilityTags(includeInactive = false) {
  return useQuery({
    queryKey: ["capability_tags", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("capability_tags")
        .select("*")
        .order("display_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as CapabilityTag[];
    },
  });
}

export function useCreateCapabilityTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: CapabilityTagInsert) => {
      const { data, error } = await supabase
        .from("capability_tags")
        .insert(tag)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as CapabilityTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capability_tags"] });
      toast.success("Capability tag created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create capability tag: ${error.message}`);
    },
  });
}

export function useUpdateCapabilityTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CapabilityTagUpdate) => {
      const { data, error } = await supabase
        .from("capability_tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as CapabilityTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capability_tags"] });
      toast.success("Capability tag updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update capability tag: ${error.message}`);
    },
  });
}

export function useDeleteCapabilityTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("capability_tags")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capability_tags"] });
      toast.success("Capability tag deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate capability tag: ${error.message}`);
    },
  });
}

export function useRestoreCapabilityTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("capability_tags")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capability_tags"] });
      toast.success("Capability tag restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore capability tag: ${error.message}`);
    },
  });
}

// Hook to get capability tags for a specific question
export function useQuestionCapabilityTags(questionId?: string) {
  return useQuery({
    queryKey: ["question_capability_tags", questionId],
    queryFn: async () => {
      if (!questionId) return [];
      
      const { data, error } = await supabase
        .from("question_capability_tags")
        .select(`
          id,
          capability_tag_id,
          capability_tags (
            id,
            name,
            description
          )
        `)
        .eq("question_id", questionId);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!questionId,
  });
}

// Mutation to update capability tags for a question
export function useUpdateQuestionCapabilityTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, tagIds }: { questionId: string; tagIds: string[] }) => {
      // First, delete existing tags
      const { error: deleteError } = await supabase
        .from("question_capability_tags")
        .delete()
        .eq("question_id", questionId);

      if (deleteError) throw new Error(deleteError.message);

      // Then, insert new tags
      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from("question_capability_tags")
          .insert(tagIds.map(tagId => ({
            question_id: questionId,
            capability_tag_id: tagId,
          })));

        if (insertError) throw new Error(insertError.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["question_capability_tags", variables.questionId] });
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update capability tags: ${error.message}`);
    },
  });
}
