import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type AcademicDiscipline = Tables<"academic_disciplines">;
export type AcademicDisciplineInsert = TablesInsert<"academic_disciplines">;
export type AcademicDisciplineUpdate = TablesUpdate<"academic_disciplines">;

export type AcademicStream = Tables<"academic_streams">;
export type AcademicStreamInsert = TablesInsert<"academic_streams">;
export type AcademicStreamUpdate = TablesUpdate<"academic_streams">;

export type AcademicSubject = Tables<"academic_subjects">;
export type AcademicSubjectInsert = TablesInsert<"academic_subjects">;
export type AcademicSubjectUpdate = TablesUpdate<"academic_subjects">;

// ============ DISCIPLINES ============

export function useAcademicDisciplines(includeInactive = false) {
  return useQuery({
    queryKey: ["academic_disciplines", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("academic_disciplines")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as AcademicDiscipline[];
    },
  });
}

export function useCreateAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discipline: AcademicDisciplineInsert) => {
      const { data, error } = await supabase
        .from("academic_disciplines")
        .insert(discipline)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AcademicDiscipline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_disciplines"] });
      toast.success("Discipline created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create discipline: ${error.message}`);
    },
  });
}

export function useUpdateAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcademicDisciplineUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("academic_disciplines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AcademicDiscipline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_disciplines"] });
      toast.success("Discipline updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update discipline: ${error.message}`);
    },
  });
}

export function useDeleteAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_disciplines")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_disciplines"] });
      toast.success("Discipline deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate discipline: ${error.message}`);
    },
  });
}

export function useRestoreAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_disciplines")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_disciplines"] });
      queryClient.refetchQueries({ queryKey: ["academic_disciplines"] });
      toast.success("Discipline restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore discipline: ${error.message}`);
    },
  });
}

export function useHardDeleteAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_disciplines")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_disciplines"] });
      toast.success("Discipline permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete discipline: ${error.message}`);
    },
  });
}

// ============ STREAMS ============

export function useAcademicStreams(disciplineId?: string | null, includeInactive = false) {
  return useQuery({
    queryKey: ["academic_streams", { disciplineId, includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("academic_streams")
        .select("*, academic_disciplines(name)")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (disciplineId) {
        query = query.eq("discipline_id", disciplineId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useCreateAcademicStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stream: AcademicStreamInsert) => {
      const { data, error } = await supabase
        .from("academic_streams")
        .insert(stream)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AcademicStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_streams"] });
      toast.success("Stream created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create stream: ${error.message}`);
    },
  });
}

export function useUpdateAcademicStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcademicStreamUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("academic_streams")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AcademicStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_streams"] });
      toast.success("Stream updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stream: ${error.message}`);
    },
  });
}

export function useDeleteAcademicStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_streams")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_streams"] });
      toast.success("Stream deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate stream: ${error.message}`);
    },
  });
}

export function useRestoreAcademicStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_streams")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_streams"] });
      queryClient.refetchQueries({ queryKey: ["academic_streams"] });
      toast.success("Stream restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore stream: ${error.message}`);
    },
  });
}

export function useHardDeleteAcademicStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_streams")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_streams"] });
      toast.success("Stream permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete stream: ${error.message}`);
    },
  });
}

// ============ SUBJECTS ============

export function useAcademicSubjects(streamId?: string | null, includeInactive = false) {
  return useQuery({
    queryKey: ["academic_subjects", { streamId, includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("academic_subjects")
        .select("*, academic_streams(name, academic_disciplines(name))")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (streamId) {
        query = query.eq("stream_id", streamId);
      }

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useCreateAcademicSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subject: AcademicSubjectInsert) => {
      const { data, error } = await supabase
        .from("academic_subjects")
        .insert(subject)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AcademicSubject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_subjects"] });
      toast.success("Subject created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subject: ${error.message}`);
    },
  });
}

export function useUpdateAcademicSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcademicSubjectUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("academic_subjects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AcademicSubject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_subjects"] });
      toast.success("Subject updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subject: ${error.message}`);
    },
  });
}

export function useDeleteAcademicSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_subjects")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_subjects"] });
      toast.success("Subject deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate subject: ${error.message}`);
    },
  });
}

export function useRestoreAcademicSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_subjects")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_subjects"] });
      queryClient.refetchQueries({ queryKey: ["academic_subjects"] });
      toast.success("Subject restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore subject: ${error.message}`);
    },
  });
}

export function useHardDeleteAcademicSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_subjects")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_subjects"] });
      toast.success("Subject permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subject: ${error.message}`);
    },
  });
}
