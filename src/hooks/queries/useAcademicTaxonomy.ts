import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

// Import types for bulk import
import type { ParsedAcademicRow } from "@/pages/admin/academic-taxonomy/types";

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
    staleTime: 300000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discipline: AcademicDisciplineInsert) => {
      const disciplineWithAudit = await withCreatedBy(discipline);
      const { data, error } = await supabase
        .from("academic_disciplines")
        .insert(disciplineWithAudit)
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
      handleMutationError(error, { operation: 'create_discipline' });
    },
  });
}

export function useUpdateAcademicDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcademicDisciplineUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("academic_disciplines")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_discipline' });
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
      handleMutationError(error, { operation: 'deactivate_discipline' });
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
      handleMutationError(error, { operation: 'restore_discipline' });
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
      handleMutationError(error, { operation: 'delete_discipline' });
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
      const streamWithAudit = await withCreatedBy(stream);
      const { data, error } = await supabase
        .from("academic_streams")
        .insert(streamWithAudit)
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
      handleMutationError(error, { operation: 'create_stream' });
    },
  });
}

export function useUpdateAcademicStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcademicStreamUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("academic_streams")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_stream' });
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
      handleMutationError(error, { operation: 'deactivate_stream' });
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
      handleMutationError(error, { operation: 'restore_stream' });
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
      handleMutationError(error, { operation: 'delete_stream' });
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
      const subjectWithAudit = await withCreatedBy(subject);
      const { data, error } = await supabase
        .from("academic_subjects")
        .insert(subjectWithAudit)
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
      handleMutationError(error, { operation: 'create_subject' });
    },
  });
}

export function useUpdateAcademicSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcademicSubjectUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("academic_subjects")
        .update(updatesWithAudit)
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
      handleMutationError(error, { operation: 'update_subject' });
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
      handleMutationError(error, { operation: 'deactivate_subject' });
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
      handleMutationError(error, { operation: 'restore_subject' });
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
      handleMutationError(error, { operation: 'delete_subject' });
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
  disciplinesDeleted: number;
  streamsCreated: number;
  streamsUpdated: number;
  streamsDeleted: number;
  subjectsCreated: number;
  subjectsUpdated: number;
  subjectsDeleted: number;
  errors: string[];
}

interface AcademicBulkImportInput {
  rows: ParsedAcademicRow[];
  replaceExisting?: boolean;
  onProgress?: (progress: number) => void;
}

export function useBulkImportAcademicTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, replaceExisting = true, onProgress }: AcademicBulkImportInput): Promise<AcademicBulkImportResult> => {
      const result: AcademicBulkImportResult = {
        disciplinesCreated: 0,
        disciplinesUpdated: 0,
        disciplinesDeleted: 0,
        streamsCreated: 0,
        streamsUpdated: 0,
        streamsDeleted: 0,
        subjectsCreated: 0,
        subjectsUpdated: 0,
        subjectsDeleted: 0,
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

        // Report progress (use 80% for import, 20% for deletion)
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalRows) * 80));
        }
      }

      // If replaceExisting is true, delete items not in the import
      if (replaceExisting) {
        const importedDisciplineIds = new Set(disciplineCache.values());
        const importedStreamIds = new Set(streamCache.values());
        const importedSubjectIds = new Set(subjectCache.values());

        // Delete subjects not in import
        const { data: allSubjects } = await supabase
          .from("academic_subjects")
          .select("id");

        const subjectsToDelete = (allSubjects || [])
          .filter(s => !importedSubjectIds.has(s.id))
          .map(s => s.id);

        if (subjectsToDelete.length > 0) {
          const { error: deleteSubjectsError } = await supabase
            .from("academic_subjects")
            .delete()
            .in("id", subjectsToDelete);

          if (deleteSubjectsError) {
            result.errors.push(`Failed to delete old subjects: ${deleteSubjectsError.message}`);
          } else {
            result.subjectsDeleted = subjectsToDelete.length;
          }
        }

        if (onProgress) onProgress(85);

        // Delete streams not in import
        const { data: allStreams } = await supabase
          .from("academic_streams")
          .select("id");

        const streamsToDelete = (allStreams || [])
          .filter(s => !importedStreamIds.has(s.id))
          .map(s => s.id);

        if (streamsToDelete.length > 0) {
          const { error: deleteStreamsError } = await supabase
            .from("academic_streams")
            .delete()
            .in("id", streamsToDelete);

          if (deleteStreamsError) {
            result.errors.push(`Failed to delete old streams: ${deleteStreamsError.message}`);
          } else {
            result.streamsDeleted = streamsToDelete.length;
          }
        }

        if (onProgress) onProgress(92);

        // Delete disciplines not in import
        const { data: allDisciplines } = await supabase
          .from("academic_disciplines")
          .select("id");

        const disciplinesToDelete = (allDisciplines || [])
          .filter(d => !importedDisciplineIds.has(d.id))
          .map(d => d.id);

        if (disciplinesToDelete.length > 0) {
          const { error: deleteDiscError } = await supabase
            .from("academic_disciplines")
            .delete()
            .in("id", disciplinesToDelete);

          if (deleteDiscError) {
            result.errors.push(`Failed to delete old disciplines: ${deleteDiscError.message}`);
          } else {
            result.disciplinesDeleted = disciplinesToDelete.length;
          }
        }

        if (onProgress) onProgress(100);
      } else {
        if (onProgress) onProgress(100);
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
