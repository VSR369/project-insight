import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type IndustrySegment = Tables<"industry_segments">;
export type IndustrySegmentInsert = TablesInsert<"industry_segments">;
export type IndustrySegmentUpdate = TablesUpdate<"industry_segments">;

export function useIndustrySegments(includeInactive = false) {
  return useQuery({
    queryKey: ["industry_segments", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("industry_segments")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as IndustrySegment[];
    },
    staleTime: 300000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateIndustrySegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segment: IndustrySegmentInsert) => {
      const segmentWithAudit = await withCreatedBy(segment);
      const { data, error } = await supabase
        .from("industry_segments")
        .insert(segmentWithAudit)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as IndustrySegment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry_segments"] });
      toast.success("Industry segment created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_industry_segment' });
    },
  });
}

export function useUpdateIndustrySegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IndustrySegmentUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("industry_segments")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as IndustrySegment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry_segments"] });
      toast.success("Industry segment updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_industry_segment' });
    },
  });
}

export function useDeleteIndustrySegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("industry_segments")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry_segments"] });
      toast.success("Industry segment deactivated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_industry_segment' });
    },
  });
}

export function useRestoreIndustrySegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("industry_segments")
        .update({ is_active: true })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry_segments"] });
      queryClient.refetchQueries({ queryKey: ["industry_segments"] });
      toast.success("Industry segment restored successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_industry_segment' });
    },
  });
}

export function useHardDeleteIndustrySegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("industry_segments")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry_segments"] });
      toast.success("Industry segment permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'hard_delete_industry_segment' });
    },
  });
}
