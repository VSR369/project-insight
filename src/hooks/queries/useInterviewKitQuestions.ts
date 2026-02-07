/**
 * Interview KIT Questions Hooks
 * Per Project Knowledge Section 6 - Hook Organization Pattern
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { toast } from "sonner";
import { INTERVIEW_KIT_PAGE_SIZE, INTERVIEW_KIT_DELETE_BATCH_SIZE } from "@/constants";

// =====================================================
// Types
// =====================================================

export interface InterviewKitCompetency {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface InterviewKitQuestion {
  id: string;
  industry_segment_id: string;
  expertise_level_id: string;
  competency_id: string;
  question_text: string;
  expected_answer: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface InterviewKitQuestionWithRelations extends InterviewKitQuestion {
  interview_kit_competencies?: InterviewKitCompetency;
  industry_segments?: { id: string; name: string };
  expertise_levels?: { id: string; name: string };
}

export interface InterviewKitQuestionInsert {
  industry_segment_id: string;
  expertise_level_id: string;
  competency_id: string;
  question_text: string;
  expected_answer?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface InterviewKitQuestionUpdate {
  industry_segment_id?: string;
  expertise_level_id?: string;
  competency_id?: string;
  question_text?: string;
  expected_answer?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface InterviewKitQuestionsFilter {
  industrySegmentId?: string;
  expertiseLevelId?: string;
  competencyId?: string;
  includeInactive?: boolean;
}

// =====================================================
// Query Hooks
// =====================================================

/**
 * Fetch all interview kit competencies
 * Uses cache configuration per Project Knowledge Section 2
 */
export function useInterviewKitCompetencies(includeInactive = false) {
  return useQuery({
    queryKey: ["interview_kit_competencies", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("interview_kit_competencies")
        .select("id, name, code, description, icon, color, display_order, is_active, created_at, updated_at, created_by, updated_by")
        .order("display_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as InterviewKitCompetency[];
    },
    staleTime: 5 * 60 * 1000,   // 5 minutes - reference data
    gcTime: 30 * 60 * 1000,     // 30 minutes cache
    refetchOnWindowFocus: false, // Prevents refetch on tab return (form stability)
    refetchOnMount: false,       // Data already cached
  });
}

/**
 * Fetch interview kit questions with optional filters
 * Uses manual pagination pattern per memory/features/question-bank-pagination-logic
 */
export function useInterviewKitQuestions(filters: InterviewKitQuestionsFilter = {}) {
  const { industrySegmentId, expertiseLevelId, competencyId, includeInactive = false } = filters;

  return useQuery({
    queryKey: ["interview_kit_questions", filters],
    queryFn: async () => {
      const allQuestions: InterviewKitQuestionWithRelations[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("interview_kit_questions")
          .select(`
            *,
            interview_kit_competencies(id, name, code, color, icon),
            industry_segments(id, name),
            expertise_levels!expertise_level_id(id, name)
          `)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })
          .range(page * INTERVIEW_KIT_PAGE_SIZE, (page + 1) * INTERVIEW_KIT_PAGE_SIZE - 1);

        if (!includeInactive) {
          query = query.eq("is_active", true);
        }

        if (industrySegmentId) {
          query = query.eq("industry_segment_id", industrySegmentId);
        }

        if (expertiseLevelId) {
          query = query.eq("expertise_level_id", expertiseLevelId);
        }

        if (competencyId) {
          query = query.eq("competency_id", competencyId);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        if (data && data.length > 0) {
          allQuestions.push(...(data as unknown as InterviewKitQuestionWithRelations[]));
          hasMore = data.length === INTERVIEW_KIT_PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }

        // Safety cap at 50,000 rows
        if (allQuestions.length >= 50000) {
          hasMore = false;
        }
      }

      return allQuestions;
    },
    enabled: true,
    refetchOnWindowFocus: false, // Prevents refetch on tab return (form stability)
  });
}

/**
 * Fetch question counts grouped by competency
 */
export function useInterviewKitQuestionCounts(filters?: {
  industrySegmentId?: string;
  expertiseLevelId?: string;
}) {
  return useQuery({
    queryKey: ["interview_kit_question_counts", filters],
    queryFn: async () => {
      let query = supabase
        .from("interview_kit_questions")
        .select("competency_id, interview_kit_competencies(code)")
        .eq("is_active", true);

      if (filters?.industrySegmentId) {
        query = query.eq("industry_segment_id", filters.industrySegmentId);
      }

      if (filters?.expertiseLevelId) {
        query = query.eq("expertise_level_id", filters.expertiseLevelId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Group by competency code
      const counts: Record<string, number> = {};
      (data || []).forEach((item: { competency_id: string; interview_kit_competencies: { code: string } | null }) => {
        const code = item.interview_kit_competencies?.code;
        if (code) {
          counts[code] = (counts[code] || 0) + 1;
        }
      });

      return counts;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Create a new interview kit question
 */
export function useCreateInterviewKitQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: InterviewKitQuestionInsert) => {
      const questionWithAudit = await withCreatedBy(question);
      const { data, error } = await supabase
        .from("interview_kit_questions")
        .insert(questionWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as InterviewKitQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      toast.success("Question created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_interview_kit_question' });
    },
  });
}

/**
 * Update an existing interview kit question
 */
export function useUpdateInterviewKitQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InterviewKitQuestionUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("interview_kit_questions")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as InterviewKitQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      toast.success("Question updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_interview_kit_question' });
    },
  });
}

/**
 * Soft delete (deactivate) an interview kit question
 */
export function useDeleteInterviewKitQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const updatesWithAudit = await withUpdatedBy({ is_active: false });
      const { error } = await supabase
        .from("interview_kit_questions")
        .update(updatesWithAudit)
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      toast.success("Question deactivated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_interview_kit_question' });
    },
  });
}

/**
 * Restore a deactivated interview kit question
 */
export function useRestoreInterviewKitQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const updatesWithAudit = await withUpdatedBy({ is_active: true });
      const { error } = await supabase
        .from("interview_kit_questions")
        .update(updatesWithAudit)
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      toast.success("Question restored successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_interview_kit_question' });
    },
  });
}

/**
 * Hard delete an interview kit question (permanent)
 */
export function useHardDeleteInterviewKitQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("interview_kit_questions")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      toast.success("Question permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'hard_delete_interview_kit_question' });
    },
  });
}

/**
 * Bulk delete questions by competency IDs (for import replace mode)
 * Uses batching to avoid PostgREST URL limits
 */
export function useBulkDeleteInterviewKitQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competencyIds: string[]) => {
      if (competencyIds.length === 0) return { count: 0 };

      let totalDeleted = 0;

      // Batch delete to avoid URL limits
      for (let i = 0; i < competencyIds.length; i += INTERVIEW_KIT_DELETE_BATCH_SIZE) {
        const batch = competencyIds.slice(i, i + INTERVIEW_KIT_DELETE_BATCH_SIZE);

        const { error, count } = await supabase
          .from("interview_kit_questions")
          .delete()
          .in("competency_id", batch);

        if (error) throw new Error(error.message);
        totalDeleted += count || 0;
      }

      return { count: totalDeleted };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      if (result.count > 0) {
        toast.success(`Deleted ${result.count} questions`);
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'bulk_delete_interview_kit_questions' });
    },
  });
}

/**
 * Bulk create questions (for import)
 */
export function useBulkCreateInterviewKitQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questions: InterviewKitQuestionInsert[]) => {
      if (questions.length === 0) return { count: 0 };

      let totalCreated = 0;

      // Batch insert to avoid payload limits
      for (let i = 0; i < questions.length; i += INTERVIEW_KIT_DELETE_BATCH_SIZE) {
        const batch = questions.slice(i, i + INTERVIEW_KIT_DELETE_BATCH_SIZE);
        
        // Add audit fields to all questions in batch
        const batchWithAudit = await Promise.all(
          batch.map(q => withCreatedBy(q))
        );

        const { error, count } = await supabase
          .from("interview_kit_questions")
          .insert(batchWithAudit);

        if (error) throw new Error(error.message);
        totalCreated += count || batch.length;
      }

      return { count: totalCreated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview_kit_question_counts"] });
      toast.success(`Imported ${result.count} questions successfully`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'bulk_create_interview_kit_questions' });
    },
  });
}
