import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Import types for bulk import
import type { ParsedAcademicRow } from "@/pages/admin/academic-taxonomy/AcademicExcelExport";

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

// ============ CHECK CHILDREN ============

export function useCheckDisciplineChildren() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error } = await supabase
        .from("academic_streams")
        .select("*", { count: "exact", head: true })
        .eq("discipline_id", id)
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return (count || 0) > 0;
    },
  });
}

export function useCheckStreamChildren() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error } = await supabase
        .from("academic_subjects")
        .select("*", { count: "exact", head: true })
        .eq("stream_id", id)
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return (count || 0) > 0;
    },
  });
}

// ============ BULK IMPORT ============

interface AcademicBulkImportResult {
  disciplinesCreated: number;
  disciplinesUpdated: number;
  streamsCreated: number;
  streamsUpdated: number;
  subjectsCreated: number;
  subjectsUpdated: number;
  errors: string[];
}

interface AcademicBulkImportInput {
  rows: ParsedAcademicRow[];
  onProgress?: (progress: number) => void;
}

export function useBulkImportAcademicTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, onProgress }: AcademicBulkImportInput): Promise<AcademicBulkImportResult> => {
      const result: AcademicBulkImportResult = {
        disciplinesCreated: 0,
        disciplinesUpdated: 0,
        streamsCreated: 0,
        streamsUpdated: 0,
        subjectsCreated: 0,
        subjectsUpdated: 0,
        errors: [],
      };

      // Cache for created/found entities to avoid duplicate queries
      const disciplineCache = new Map<string, string>(); // "disciplineName" -> disciplineId
      const streamCache = new Map<string, string>(); // "disciplineId:streamName" -> streamId
      const subjectCache = new Map<string, string>(); // "streamId:subjectName" -> subjectId

      // Pre-fetch existing data
      const { data: existingDisciplines } = await supabase
        .from("academic_disciplines")
        .select("id, name, description");

      for (const disc of existingDisciplines || []) {
        disciplineCache.set(disc.name.toLowerCase().trim(), disc.id);
      }

      const { data: existingStreams } = await supabase
        .from("academic_streams")
        .select("id, name, discipline_id, description");

      for (const stream of existingStreams || []) {
        streamCache.set(`${stream.discipline_id}:${stream.name.toLowerCase().trim()}`, stream.id);
      }

      const { data: existingSubjects } = await supabase
        .from("academic_subjects")
        .select("id, name, stream_id, description");

      for (const subject of existingSubjects || []) {
        subjectCache.set(`${subject.stream_id}:${subject.name.toLowerCase().trim()}`, subject.id);
      }

      // Process each row
      const totalRows = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          // Find or create discipline
          const disciplineKey = row.discipline.toLowerCase().trim();
          let disciplineId = disciplineCache.get(disciplineKey);

          if (!disciplineId) {
            // Create new discipline
            const { data: newDisc, error: discError } = await supabase
              .from("academic_disciplines")
              .insert({
                name: row.discipline,
                description: row.disciplineDescription || null,
                is_active: true,
              })
              .select()
              .single();

            if (discError) {
              result.errors.push(`Row ${row.rowNumber}: Failed to create discipline - ${discError.message}`);
              continue;
            }

            disciplineId = newDisc.id;
            disciplineCache.set(disciplineKey, disciplineId);
            result.disciplinesCreated++;
          } else if (row.disciplineDescription) {
            // Update existing discipline description if provided
            await supabase
              .from("academic_disciplines")
              .update({ description: row.disciplineDescription })
              .eq("id", disciplineId);
            result.disciplinesUpdated++;
          }

          // Find or create stream
          const streamKey = `${disciplineId}:${row.stream.toLowerCase().trim()}`;
          let streamId = streamCache.get(streamKey);

          if (!streamId) {
            // Create new stream
            const { data: newStream, error: streamError } = await supabase
              .from("academic_streams")
              .insert({
                name: row.stream,
                description: row.streamDescription || null,
                discipline_id: disciplineId,
                is_active: true,
              })
              .select()
              .single();

            if (streamError) {
              result.errors.push(`Row ${row.rowNumber}: Failed to create stream - ${streamError.message}`);
              continue;
            }

            streamId = newStream.id;
            streamCache.set(streamKey, streamId);
            result.streamsCreated++;
          } else if (row.streamDescription) {
            // Update existing stream description if provided
            await supabase
              .from("academic_streams")
              .update({ description: row.streamDescription })
              .eq("id", streamId);
            result.streamsUpdated++;
          }

          // Find or create subject
          const subjectKey = `${streamId}:${row.subject.toLowerCase().trim()}`;
          let subjectId = subjectCache.get(subjectKey);

          if (!subjectId) {
            // Create new subject
            const { data: newSubject, error: subjectError } = await supabase
              .from("academic_subjects")
              .insert({
                name: row.subject,
                description: row.subjectDescription || null,
                display_order: row.displayOrder,
                stream_id: streamId,
                is_active: row.isActive,
              })
              .select()
              .single();

            if (subjectError) {
              result.errors.push(`Row ${row.rowNumber}: Failed to create subject - ${subjectError.message}`);
              continue;
            }

            subjectId = newSubject.id;
            subjectCache.set(subjectKey, subjectId);
            result.subjectsCreated++;
          } else {
            // Update existing subject
            await supabase
              .from("academic_subjects")
              .update({
                description: row.subjectDescription || undefined,
                display_order: row.displayOrder,
                is_active: row.isActive,
              })
              .eq("id", subjectId);
            result.subjectsUpdated++;
          }
        } catch (error) {
          result.errors.push(`Row ${row.rowNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // Report progress
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalRows) * 100));
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_disciplines"] });
      queryClient.invalidateQueries({ queryKey: ["academic_streams"] });
      queryClient.invalidateQueries({ queryKey: ["academic_subjects"] });
      toast.success("Academic taxonomy imported successfully");
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
