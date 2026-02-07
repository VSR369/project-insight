import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError, logWarning } from "@/lib/errorHandler";

// Base question type from database
type BaseQuestion = Tables<"question_bank">;

// Extended question type with capability tags
export interface Question extends BaseQuestion {
  question_capability_tags?: Array<{
    id: string;
    capability_tag_id: string;
    capability_tags: {
      id: string;
      name: string;
    } | null;
  }>;
}

export type QuestionInsert = TablesInsert<"question_bank">;
export type QuestionUpdate = TablesUpdate<"question_bank">;

// New enum types matching the database
export type QuestionType = "conceptual" | "scenario" | "experience" | "decision" | "proof";
export type QuestionUsageMode = "self_assessment" | "interview" | "both";
export type QuestionDifficulty = "introductory" | "applied" | "advanced" | "strategic";

export interface QuestionOption {
  index: number;
  text: string;
}

// Difficulty labels and colors for display
export const DIFFICULTY_CONFIG: Record<QuestionDifficulty, { label: string; color: string; bgColor: string }> = {
  introductory: { label: "Introductory", color: "text-green-700", bgColor: "bg-green-100" },
  applied: { label: "Applied", color: "text-lime-700", bgColor: "bg-lime-100" },
  advanced: { label: "Advanced", color: "text-orange-700", bgColor: "bg-orange-100" },
  strategic: { label: "Strategic", color: "text-red-700", bgColor: "bg-red-100" },
};

// Difficulty options for forms/selects
export const DIFFICULTY_OPTIONS = [
  { value: "introductory" as const, label: "Introductory" },
  { value: "applied" as const, label: "Applied" },
  { value: "advanced" as const, label: "Advanced" },
  { value: "strategic" as const, label: "Strategic" },
];

// Question type labels and colors
export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; color: string; bgColor: string; description: string }> = {
  conceptual: { label: "Conceptual", color: "text-blue-700", bgColor: "bg-blue-100", description: "Basic understanding (20% - mostly self-assessment)" },
  scenario: { label: "Scenario", color: "text-purple-700", bgColor: "bg-purple-100", description: "Applied situations (30% - both modes)" },
  experience: { label: "Experience", color: "text-amber-700", bgColor: "bg-amber-100", description: "Past experience validation (25% - interview)" },
  decision: { label: "Decision", color: "text-pink-700", bgColor: "bg-pink-100", description: "Trade-off/judgment (15% - interview)" },
  proof: { label: "Proof", color: "text-indigo-700", bgColor: "bg-indigo-100", description: "Evidence-based (10% - senior interview)" },
};

// Question type options for forms/selects
export const QUESTION_TYPE_OPTIONS = [
  { value: "conceptual" as const, label: "Conceptual" },
  { value: "scenario" as const, label: "Scenario" },
  { value: "experience" as const, label: "Experience" },
  { value: "decision" as const, label: "Decision" },
  { value: "proof" as const, label: "Proof" },
];

// Usage mode labels and colors
export const USAGE_MODE_CONFIG: Record<QuestionUsageMode, { label: string; color: string; bgColor: string }> = {
  self_assessment: { label: "Self-Assessment", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  interview: { label: "Interview", color: "text-violet-700", bgColor: "bg-violet-100" },
  both: { label: "Both", color: "text-emerald-700", bgColor: "bg-emerald-100" },
};

// Usage mode options for forms/selects
export const USAGE_MODE_OPTIONS = [
  { value: "self_assessment" as const, label: "Self-Assessment" },
  { value: "interview" as const, label: "Interview" },
  { value: "both" as const, label: "Both" },
];

export function useQuestions(specialityId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["question_bank", specialityId, { includeInactive }],
    queryFn: async () => {
      // PostgREST applies a default max rows limit (commonly 1000) when no range is provided.
      // For admin question bank views and post-import verification, we must paginate.
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 50; // safety cap (50k rows)

      const all: Question[] = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("question_bank")
          .select(
            `
            *,
            question_capability_tags (
              id,
              capability_tag_id,
              capability_tags (
                id,
                name
              )
            )
          `
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (specialityId) {
          query = query.eq("speciality_id", specialityId);
        }

        if (!includeInactive) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const pageRows = (data ?? []) as Question[];
        all.push(...pageRows);

        // Last page reached
        if (pageRows.length < PAGE_SIZE) break;
      }

      return all;
    },
    // Always enabled - pagination handles large datasets; filter by specialityId is optional
    enabled: true,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: QuestionInsert) => {
      const questionWithAudit = await withCreatedBy(question);
      const { data, error } = await supabase
        .from("question_bank")
        .insert(questionWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Question;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      toast.success("Question created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_question' });
    },
  });
}

/**
 * Bulk-optimized question creation for imports.
 * DOES NOT trigger toast or cache invalidation per-row.
 * Caller must handle final cache invalidation and user feedback.
 */
export function useCreateQuestionBulk() {
  return useMutation({
    mutationFn: async (question: QuestionInsert) => {
      const questionWithAudit = await withCreatedBy(question);
      const { data, error } = await supabase
        .from("question_bank")
        .insert(questionWithAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Question;
    },
    // NO onSuccess/onError callbacks - caller handles everything
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: QuestionUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("question_bank")
        .update(updatesWithAudit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Question;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      toast.success("Question updated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_question' });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("question_bank")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      toast.success("Question deactivated successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_question' });
    },
  });
}

export function useRestoreQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("question_bank")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      queryClient.refetchQueries({ queryKey: ["question_bank"] });
      toast.success("Question restored successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'restore_question' });
    },
  });
}

export function useHardDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("question_bank")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      toast.success("Question permanently deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'hard_delete_question' });
    },
  });
}

// Fallback batch deletion function (used when RPC fails or is unavailable)
async function batchDeleteQuestions(specialityIds: string[]): Promise<{ count: number }> {
  const SPECIALITY_BATCH_SIZE = 20;
  const QUESTION_BATCH_SIZE = 50;
  let totalDeleted = 0;

  for (let i = 0; i < specialityIds.length; i += SPECIALITY_BATCH_SIZE) {
    const batchIds = specialityIds.slice(i, i + SPECIALITY_BATCH_SIZE);

    // Get question IDs for this batch
    const { data: questionsToDelete, error: fetchError } = await supabase
      .from("question_bank")
      .select("id")
      .in("speciality_id", batchIds);

    if (fetchError) throw new Error(fetchError.message);

    const questionIds = (questionsToDelete || []).map(q => q.id);

    if (questionIds.length > 0) {
      // Delete in sub-batches to avoid URL limits
      for (let j = 0; j < questionIds.length; j += QUESTION_BATCH_SIZE) {
        const questionBatch = questionIds.slice(j, j + QUESTION_BATCH_SIZE);

        // Delete capability tags first
        const { error: tagsError } = await supabase
          .from("question_capability_tags")
          .delete()
          .in("question_id", questionBatch);

        if (tagsError) throw new Error(tagsError.message);

        // Delete questions
        const { error: questionsError } = await supabase
          .from("question_bank")
          .delete()
          .in("id", questionBatch);

        if (questionsError) throw new Error(questionsError.message);

        totalDeleted += questionBatch.length;
      }
    }
  }

  return { count: totalDeleted };
}

// Permanently delete all questions for given speciality IDs (for replace import mode)
export function useDeleteQuestionsBySpecialities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (specialityIds: string[]) => {
      if (specialityIds.length === 0) return { count: 0 };

      // Try database function first (most efficient, no URL limits)
      const { data, error } = await supabase.rpc(
        'delete_questions_by_specialities',
        { p_speciality_ids: specialityIds }
      );

      if (error) {
        // Log and fallback to batched deletion
        logWarning('RPC delete_questions_by_specialities failed, using batch fallback', {
          operation: 'bulk_delete_questions',
          component: 'useDeleteQuestionsBySpecialities',
          additionalData: { errorMessage: error.message }
        });
        return await batchDeleteQuestions(specialityIds);
      }

      return { count: data as number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["question_bank"] });
      if (result.count > 0) {
        toast.success(`Permanently deleted ${result.count} existing questions`);
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'bulk_delete_questions' });
    },
  });
}

// Get count of existing active questions for given speciality IDs (uses RPC to avoid URL limits)
export async function getExistingQuestionCount(specialityIds: string[]): Promise<number> {
  if (specialityIds.length === 0) return 0;

  // Use RPC to avoid URL limits with 200+ specialities
  const { data, error } = await supabase.rpc(
    'get_question_count_by_specialities',
    { p_speciality_ids: specialityIds }
  );

  if (error) {
    // Fallback to direct query for smaller sets
    logWarning('RPC get_question_count_by_specialities failed, using fallback', {
      operation: 'get_existing_question_count',
      component: 'useQuestionBank',
    });
    
    const { count, error: fallbackError } = await supabase
      .from("question_bank")
      .select("*", { count: "exact", head: true })
      .in("speciality_id", specialityIds)
      .eq("is_active", true);

    if (fallbackError) throw new Error(fallbackError.message);
    return count || 0;
  }

  return (data as number) || 0;
}

// =====================================================
// BULK OPERATIONS FOR ENTERPRISE IMPORT
// =====================================================

export interface BulkQuestionInput {
  question_text: string;
  options: QuestionOption[];
  correct_option: number;
  difficulty: string | null;
  question_type: string;
  usage_mode: string;
  expected_answer_guidance: string | null;
  speciality_id: string;
  row_number: number; // For error tracking
}

export interface BulkInsertResult {
  inserted_id: string;
  row_index: number;
}

/**
 * Hook for bulk inserting questions via RPC
 * Accepts batches of 100 questions and returns inserted IDs with row indexes
 */
export function useBulkInsertQuestions() {
  return useMutation({
    mutationFn: async (questions: BulkQuestionInput[]): Promise<BulkInsertResult[]> => {
      if (questions.length === 0) return [];

      // Transform to format expected by RPC - convert options to plain JSON
      const payload = questions.map(q => ({
        question_text: q.question_text,
        options: q.options.map(opt => ({ index: opt.index, text: opt.text })),
        correct_option: q.correct_option,
        difficulty: q.difficulty,
        question_type: q.question_type,
        usage_mode: q.usage_mode,
        expected_answer_guidance: q.expected_answer_guidance,
        speciality_id: q.speciality_id,
      }));

      // Cast to any for RPC call - Supabase types don't perfectly match JSONB params
      const { data, error } = await supabase.rpc(
        'bulk_insert_questions',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { p_questions: payload as any }
      );

      if (error) throw new Error(error.message);
      return (data || []) as BulkInsertResult[];
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'bulk_insert_questions' });
    },
  });
}

// Helper to parse options from JSON
export function parseQuestionOptions(options: unknown): QuestionOption[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((opt, idx) => {
      if (typeof opt === "string") {
        return { index: idx + 1, text: opt };
      }
      if (typeof opt === "object" && opt !== null) {
        return {
          index: (opt as QuestionOption).index ?? idx + 1,
          text: (opt as QuestionOption).text ?? String(opt),
        };
      }
      return { index: idx + 1, text: String(opt) };
    });
  }
  return [];
}

// Helper to format options for storage
export function formatQuestionOptions(options: QuestionOption[]): QuestionOption[] {
  return options.map((opt, idx) => ({
    index: idx + 1,
    text: opt.text.trim(),
  }));
}

// Helper to get difficulty display info
export function getDifficultyDisplay(difficulty: QuestionDifficulty | null) {
  if (!difficulty) return null;
  return DIFFICULTY_CONFIG[difficulty];
}

// Helper to get question type display info
export function getQuestionTypeDisplay(questionType: QuestionType) {
  return QUESTION_TYPE_CONFIG[questionType];
}

// Helper to get usage mode display info
export function getUsageModeDisplay(usageMode: QuestionUsageMode) {
  return USAGE_MODE_CONFIG[usageMode];
}
