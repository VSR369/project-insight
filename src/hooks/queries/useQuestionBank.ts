import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError, logWarning } from "@/lib/errorHandler";

// Re-export all types and constants from the extracted module
export type {
  Question,
  QuestionInsert,
  QuestionUpdate,
  QuestionType,
  QuestionUsageMode,
  QuestionDifficulty,
  QuestionOption,
  BulkQuestionInput,
  BulkInsertResult,
} from "./questionBankConstants";

export {
  DIFFICULTY_CONFIG,
  DIFFICULTY_OPTIONS,
  QUESTION_TYPE_CONFIG,
  QUESTION_TYPE_OPTIONS,
  USAGE_MODE_CONFIG,
  USAGE_MODE_OPTIONS,
  parseQuestionOptions,
  formatQuestionOptions,
  getDifficultyDisplay,
  getQuestionTypeDisplay,
  getUsageModeDisplay,
} from "./questionBankConstants";

import type { Question, QuestionInsert, QuestionUpdate, BulkQuestionInput, BulkInsertResult } from "./questionBankConstants";

export function useQuestions(specialityId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["question_bank", specialityId, { includeInactive }],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 50;
      const all: Question[] = [];

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("question_bank")
          .select(`*, question_capability_tags (id, capability_tag_id, capability_tags (id, name))`)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (specialityId) query = query.eq("speciality_id", specialityId);
        if (!includeInactive) query = query.eq("is_active", true);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const pageRows = (data ?? []) as Question[];
        all.push(...pageRows);
        if (pageRows.length < PAGE_SIZE) break;
      }
      return all;
    },
    enabled: true,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (question: QuestionInsert) => {
      const questionWithAudit = await withCreatedBy(question);
      const { data, error } = await supabase.from("question_bank").insert(questionWithAudit).select().single();
      if (error) throw new Error(error.message);
      return data as Question;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["question_bank"] }); toast.success("Question created successfully"); },
    onError: (error: Error) => { handleMutationError(error, { operation: 'create_question' }); },
  });
}

export function useCreateQuestionBulk() {
  return useMutation({
    mutationFn: async (question: QuestionInsert) => {
      const questionWithAudit = await withCreatedBy(question);
      const { data, error } = await supabase.from("question_bank").insert(questionWithAudit).select().single();
      if (error) throw new Error(error.message);
      return data as Question;
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: QuestionUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("question_bank").update(updatesWithAudit).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Question;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["question_bank"] }); toast.success("Question updated successfully"); },
    onError: (error: Error) => { handleMutationError(error, { operation: 'update_question' }); },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_bank").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["question_bank"] }); toast.success("Question deactivated successfully"); },
    onError: (error: Error) => { handleMutationError(error, { operation: 'deactivate_question' }); },
  });
}

export function useRestoreQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_bank").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["question_bank"] }); toast.success("Question restored successfully"); },
    onError: (error: Error) => { handleMutationError(error, { operation: 'restore_question' }); },
  });
}

export function useHardDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_bank").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["question_bank"] }); toast.success("Question permanently deleted"); },
    onError: (error: Error) => { handleMutationError(error, { operation: 'hard_delete_question' }); },
  });
}

async function batchDeleteQuestions(specialityIds: string[]): Promise<{ count: number }> {
  const SPECIALITY_BATCH_SIZE = 20;
  const QUESTION_BATCH_SIZE = 50;
  let totalDeleted = 0;

  for (let i = 0; i < specialityIds.length; i += SPECIALITY_BATCH_SIZE) {
    const batchIds = specialityIds.slice(i, i + SPECIALITY_BATCH_SIZE);
    const { data: questionsToDelete, error: fetchError } = await supabase
      .from("question_bank").select("id").in("speciality_id", batchIds);
    if (fetchError) throw new Error(fetchError.message);

    const questionIds = (questionsToDelete || []).map(q => q.id);
    if (questionIds.length > 0) {
      for (let j = 0; j < questionIds.length; j += QUESTION_BATCH_SIZE) {
        const questionBatch = questionIds.slice(j, j + QUESTION_BATCH_SIZE);
        const { error: tagsError } = await supabase.from("question_capability_tags").delete().in("question_id", questionBatch);
        if (tagsError) throw new Error(tagsError.message);
        const { error: questionsError } = await supabase.from("question_bank").delete().in("id", questionBatch);
        if (questionsError) throw new Error(questionsError.message);
        totalDeleted += questionBatch.length;
      }
    }
  }
  return { count: totalDeleted };
}

export function useDeleteQuestionsBySpecialities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (specialityIds: string[]) => {
      if (specialityIds.length === 0) return { count: 0 };
      const { data, error } = await supabase.rpc('delete_questions_by_specialities', { p_speciality_ids: specialityIds });
      if (error) {
        logWarning('RPC delete_questions_by_specialities failed, using batch fallback', {
          operation: 'bulk_delete_questions', component: 'useDeleteQuestionsBySpecialities',
          additionalData: { errorMessage: error.message }
        });
        return await batchDeleteQuestions(specialityIds);
      }
      return { count: data as number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      if (result.count > 0) toast.success(`Permanently deleted ${result.count} existing questions`);
    },
    onError: (error: Error) => { handleMutationError(error, { operation: 'bulk_delete_questions' }); },
  });
}

export async function getExistingQuestionCount(specialityIds: string[]): Promise<number> {
  if (specialityIds.length === 0) return 0;
  const { data, error } = await supabase.rpc('get_question_count_by_specialities', { p_speciality_ids: specialityIds });
  if (error) {
    logWarning('RPC get_question_count_by_specialities failed, using fallback', {
      operation: 'get_existing_question_count', component: 'useQuestionBank',
    });
    const { count, error: fallbackError } = await supabase
      .from("question_bank").select("*", { count: "exact", head: true })
      .in("speciality_id", specialityIds).eq("is_active", true);
    if (fallbackError) throw new Error(fallbackError.message);
    return count || 0;
  }
  return (data as number) || 0;
}

export function useBulkInsertQuestions() {
  return useMutation({
    mutationFn: async (questions: BulkQuestionInput[]): Promise<BulkInsertResult[]> => {
      if (questions.length === 0) return [];
      const payload = questions.map(q => ({
        question_text: q.question_text,
        options: q.options.map(opt => ({ index: opt.index, text: opt.text })),
        correct_option: q.correct_option, difficulty: q.difficulty,
        question_type: q.question_type, usage_mode: q.usage_mode,
        expected_answer_guidance: q.expected_answer_guidance,
        speciality_id: q.speciality_id,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('bulk_insert_questions', { p_questions: payload as any });
      if (error) throw new Error(error.message);
      return (data || []) as BulkInsertResult[];
    },
    onError: (error: Error) => { handleMutationError(error, { operation: 'bulk_insert_questions' }); },
  });
}
