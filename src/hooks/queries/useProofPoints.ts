import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { canModifyField } from '@/services/lifecycleService';
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from '@/lib/auditFields';

type ProofPoint = Database['public']['Tables']['proof_points']['Row'];
type ProofPointInsert = Database['public']['Tables']['proof_points']['Insert'];
type ProofPointUpdate = Database['public']['Tables']['proof_points']['Update'];
type ProofPointType = Database['public']['Enums']['proof_point_type'];
type ProofPointCategory = Database['public']['Enums']['proof_point_category'];

export interface ProofPointWithCounts extends ProofPoint {
  linksCount: number;
  filesCount: number;
  tagsCount: number;
  speciality_tags?: Array<{ speciality_id: string }>;
}

export interface CreateProofPointInput {
  providerId: string;
  industrySegmentId?: string; // NEW: Track industry context
  category: ProofPointCategory;
  type: ProofPointType;
  title: string;
  description: string;
  specialityIds?: string[];
  links?: Array<{ url: string; title?: string; description?: string }>;
}

export interface UpdateProofPointInput {
  id: string;
  category?: ProofPointCategory;
  type?: ProofPointType;
  title?: string;
  description?: string;
  specialityIds?: string[];
}

// Minimum proof points required - this can be overridden by system_settings
const DEFAULT_MIN_PROOF_POINTS = 2;

// Helper to get minimum proof points from system settings
async function getMinProofPointsRequired(): Promise<number> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'proof_points_minimum')
    .single();

  if (data?.setting_value && typeof data.setting_value === 'object' && 'value' in data.setting_value) {
    return (data.setting_value as { value: number }).value;
  }
  return DEFAULT_MIN_PROOF_POINTS;
}

// Helper to check content modification lock
async function checkContentLock(providerId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { data: provider, error } = await supabase
    .from('solution_providers')
    .select('lifecycle_rank')
    .eq('id', providerId)
    .single();

  if (error) throw error;

  return canModifyField(provider?.lifecycle_rank || 0, 'content');
}

// Options for useProofPoints hook
export interface UseProofPointsOptions {
  industrySegmentId?: string;
  includeAllIndustries?: boolean;
}

// Proof point counts by industry segment
export interface ProofPointCountByIndustry {
  industrySegmentId: string | null;
  count: number;
}

// Fetch proof point counts grouped by industry segment
export function useProofPointCountsByIndustry(providerId?: string) {
  return useQuery({
    queryKey: ['proof-point-counts-by-industry', providerId],
    queryFn: async (): Promise<ProofPointCountByIndustry[]> => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('proof_points')
        .select('industry_segment_id')
        .eq('provider_id', providerId)
        .eq('is_deleted', false);

      if (error) throw error;
      if (!data?.length) return [];

      // Count by industry segment
      const countMap = new Map<string | null, number>();
      data.forEach(pp => {
        const key = pp.industry_segment_id;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      });

      return Array.from(countMap.entries()).map(([industrySegmentId, count]) => ({
        industrySegmentId,
        count,
      }));
    },
    enabled: !!providerId,
    staleTime: 30000,
  });
}

// Fetch all proof points for a provider with counts
export function useProofPoints(providerId?: string, options?: UseProofPointsOptions) {
  return useQuery({
    queryKey: ['proof-points', providerId, options?.industrySegmentId, options?.includeAllIndustries],
    queryFn: async () => {
      if (!providerId) return [];

      // Fetch proof points
      let query = supabase
        .from('proof_points')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_deleted', false);

      // Filter by industry unless explicitly showing all
      if (options?.industrySegmentId && !options?.includeAllIndustries) {
        query = query.eq('industry_segment_id', options.industrySegmentId);
      }

      const { data: proofPoints, error: proofPointsError } = await query.order('created_at', { ascending: false });

      if (proofPointsError) throw proofPointsError;
      if (!proofPoints?.length) return [];

      const proofPointIds = proofPoints.map(pp => pp.id);

      // Fetch counts in parallel
      const [linksResult, filesResult, tagsResult] = await Promise.all([
        supabase
          .from('proof_point_links')
          .select('proof_point_id')
          .in('proof_point_id', proofPointIds),
        supabase
          .from('proof_point_files')
          .select('proof_point_id')
          .in('proof_point_id', proofPointIds),
        supabase
          .from('proof_point_speciality_tags')
          .select('proof_point_id, speciality_id')
          .in('proof_point_id', proofPointIds),
      ]);

      // Build counts map
      const linksCounts = new Map<string, number>();
      const filesCounts = new Map<string, number>();
      const tagsCounts = new Map<string, number>();
      const tagsMap = new Map<string, Array<{ speciality_id: string }>>();

      linksResult.data?.forEach(link => {
        linksCounts.set(link.proof_point_id, (linksCounts.get(link.proof_point_id) || 0) + 1);
      });
      filesResult.data?.forEach(file => {
        filesCounts.set(file.proof_point_id, (filesCounts.get(file.proof_point_id) || 0) + 1);
      });
      tagsResult.data?.forEach(tag => {
        tagsCounts.set(tag.proof_point_id, (tagsCounts.get(tag.proof_point_id) || 0) + 1);
        if (!tagsMap.has(tag.proof_point_id)) {
          tagsMap.set(tag.proof_point_id, []);
        }
        tagsMap.get(tag.proof_point_id)!.push({ speciality_id: tag.speciality_id });
      });

      return proofPoints.map(pp => ({
        ...pp,
        linksCount: linksCounts.get(pp.id) || 0,
        filesCount: filesCounts.get(pp.id) || 0,
        tagsCount: tagsCounts.get(pp.id) || 0,
        speciality_tags: tagsMap.get(pp.id) || [],
      })) as ProofPointWithCounts[];
    },
    enabled: !!providerId,
    staleTime: 30000,
  });
}

// Fetch single proof point with all related data
export function useProofPoint(proofPointId?: string) {
  return useQuery({
    queryKey: ['proof-point', proofPointId],
    queryFn: async () => {
      if (!proofPointId) return null;

      const [proofPointResult, linksResult, filesResult, tagsResult] = await Promise.all([
        supabase
          .from('proof_points')
          .select('*')
          .eq('id', proofPointId)
          .single(),
        supabase
          .from('proof_point_links')
          .select('*')
          .eq('proof_point_id', proofPointId)
          .order('display_order', { ascending: true }),
        supabase
          .from('proof_point_files')
          .select('*')
          .eq('proof_point_id', proofPointId),
        supabase
          .from('proof_point_speciality_tags')
          .select('*, specialities(id, name)')
          .eq('proof_point_id', proofPointId),
      ]);

      if (proofPointResult.error) throw proofPointResult.error;

      return {
        ...proofPointResult.data,
        links: linksResult.data || [],
        files: filesResult.data || [],
        specialityTags: tagsResult.data || [],
      };
    },
    enabled: !!proofPointId,
  });
}

// Create new proof point with links and tags
export function useCreateProofPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProofPointInput) => {
      // Check content lock
      const contentCheck = await checkContentLock(input.providerId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Insert proof point with audit fields
      const proofPointData = await withCreatedBy({
        provider_id: input.providerId,
        industry_segment_id: input.industrySegmentId || null, // NEW: Track industry context
        category: input.category,
        type: input.type,
        title: input.title,
        description: input.description,
      });
      
      const { data: proofPoint, error: proofPointError } = await supabase
        .from('proof_points')
        .insert(proofPointData)
        .select()
        .single();

      if (proofPointError) throw proofPointError;

      // Insert speciality tags if category is specialty_specific
      if (input.category === 'specialty_specific' && input.specialityIds?.length) {
        const tags = input.specialityIds.map(specialityId => ({
          proof_point_id: proofPoint.id,
          speciality_id: specialityId,
        }));

        const { error: tagsError } = await supabase
          .from('proof_point_speciality_tags')
          .insert(tags);

        if (tagsError) throw tagsError;
      }

      // Insert links if provided
      if (input.links?.length) {
        const links = input.links.map((link, index) => ({
          proof_point_id: proofPoint.id,
          url: link.url,
          title: link.title || null,
          display_order: index,
        }));

        const { error: linksError } = await supabase
          .from('proof_point_links')
          .insert(links);

        if (linksError) throw linksError;
      }

      return proofPoint;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', variables.providerId] });
      toast.success('Proof Point saved successfully');
    },
    onError: (error) => {
      console.error('Error creating proof point:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save proof point. Please try again.');
    },
  });
}

// Update existing proof point
export function useUpdateProofPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProofPointInput & { providerId: string }) => {
      const { id, providerId, specialityIds, ...updateData } = input;

      // Check content lock
      const contentCheck = await checkContentLock(providerId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Update proof point with audit fields
      const updateDataWithAudit = await withUpdatedBy({
        ...updateData,
        updated_at: new Date().toISOString(),
      });
      
      const { error: updateError } = await supabase
        .from('proof_points')
        .update(updateDataWithAudit)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update speciality tags if provided
      if (specialityIds !== undefined) {
        // Delete existing tags
        await supabase
          .from('proof_point_speciality_tags')
          .delete()
          .eq('proof_point_id', id);

        // Insert new tags
        if (specialityIds.length > 0) {
          const tags = specialityIds.map(specialityId => ({
            proof_point_id: id,
            speciality_id: specialityId,
          }));

          const { error: tagsError } = await supabase
            .from('proof_point_speciality_tags')
            .insert(tags);

          if (tagsError) throw tagsError;
        }
      }

      return { id, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.id] });
      toast.success('Proof Point updated successfully');
    },
    onError: (error) => {
      console.error('Error updating proof point:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update proof point. Please try again.');
    },
  });
}

// Soft delete proof point with minimum constraint check
export function useDeleteProofPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, providerId }: { id: string; providerId: string }) => {
      // Check content lock
      const contentCheck = await checkContentLock(providerId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Check minimum proof points constraint
      const { count, error: countError } = await supabase
        .from('proof_points')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('is_deleted', false);

      if (countError) throw countError;

      const minRequired = await getMinProofPointsRequired();
      const currentCount = count || 0;

      if (currentCount <= minRequired) {
        throw new Error('Minimum 2 proof points required.');
      }

      const userId = await getCurrentUserId();
      
      const { error } = await supabase
        .from('proof_points')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq('id', id);

      if (error) throw error;
      return { id, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      toast.success('Proof Point deleted');
    },
    onError: (error) => {
      console.error('Error deleting proof point:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete proof point. Please try again.');
    },
  });
}

// Add link to proof point
export function useAddProofPointLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      proofPointId, 
      url, 
      title,
      providerId 
    }: { 
      proofPointId: string; 
      url: string; 
      title?: string;
      providerId: string;
    }) => {
      // Check content lock
      const contentCheck = await checkContentLock(providerId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      const { error } = await supabase
        .from('proof_point_links')
        .insert({
          proof_point_id: proofPointId,
          url,
          title: title || null,
        });

      if (error) throw error;
      return { proofPointId, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.proofPointId] });
    },
    onError: (error) => {
      console.error('Error adding link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add link');
    },
  });
}

// Upload file to proof point
export function useUploadProofPointFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      proofPointId, 
      file, 
      providerId,
      userId,
    }: { 
      proofPointId: string; 
      file: File; 
      providerId: string;
      userId: string;
    }) => {
      // Check content lock
      const contentCheck = await checkContentLock(providerId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds 10 MB limit');
      }

      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `${userId}/${proofPointId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proof-point-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { error: insertError } = await supabase
        .from('proof_point_files')
        .insert({
          proof_point_id: proofPointId,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          storage_path: storagePath,
        });

      if (insertError) throw insertError;

      return { proofPointId, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.proofPointId] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    },
  });
}

// Delete file from proof point
export function useDeleteProofPointFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fileId, 
      storagePath, 
      proofPointId,
      providerId 
    }: { 
      fileId: string; 
      storagePath: string; 
      proofPointId: string;
      providerId: string;
    }) => {
      // Check content lock
      const contentCheck = await checkContentLock(providerId);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.reason || 'Content modification is locked at this lifecycle stage');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('proof-point-files')
        .remove([storagePath]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete record
      const { error } = await supabase
        .from('proof_point_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      return { proofPointId, providerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proof-points', result.providerId] });
      queryClient.invalidateQueries({ queryKey: ['proof-point', result.proofPointId] });
      toast.success('File deleted');
    },
    onError: (error) => {
      console.error('Error deleting file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete file');
    },
  });
}
