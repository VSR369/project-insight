import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Question = Tables<"question_bank">;
export type QuestionInsert = TablesInsert<"question_bank">;
export type QuestionUpdate = TablesUpdate<"question_bank">;

export interface QuestionOption {
  index: number;
  text: string;
}

export function useQuestions(specialityId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["question_bank", specialityId, { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("question_bank")
        .select("*")
        .order("created_at", { ascending: false });

      if (specialityId) {
        query = query.eq("speciality_id", specialityId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as Question[];
    },
    enabled: !!specialityId || includeInactive,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: QuestionInsert) => {
      const { data, error } = await supabase
        .from("question_bank")
        .insert(question)
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
      toast.error(`Failed to create question: ${error.message}`);
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: QuestionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("question_bank")
        .update(updates)
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
      toast.error(`Failed to update question: ${error.message}`);
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
      toast.error(`Failed to deactivate question: ${error.message}`);
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
      toast.error(`Failed to restore question: ${error.message}`);
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
      toast.error(`Failed to delete question: ${error.message}`);
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
