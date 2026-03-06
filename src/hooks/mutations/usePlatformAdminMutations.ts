/**
 * Mutation hooks for platform admin management.
 * Uses edge functions for privileged operations, direct update for self-service.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';

// ============================================================================
// Create Platform Admin (supervisor only, via edge function)
// ============================================================================

interface CreatePlatformAdminInput {
  email: string;
  full_name: string;
  phone: string;
  is_supervisor: boolean;
  admin_tier?: 'supervisor' | 'senior_admin' | 'admin';
  industry_expertise: string[];
  country_region_expertise?: string[];
  org_type_expertise?: string[];
  max_concurrent_verifications?: number;
  assignment_priority?: number;
}

export function useCreatePlatformAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlatformAdminInput) => {
      const { data, error } = await supabase.functions.invoke('manage-platform-admin', {
        body: { action: 'create', ...input },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to create admin');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      toast.success('Platform admin created successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'create_platform_admin' }),
  });
}

// ============================================================================
// Update Platform Admin (supervisor only, via edge function)
// ============================================================================

interface UpdatePlatformAdminInput {
  admin_id: string;
  updates: Record<string, unknown>;
}

export function useUpdatePlatformAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ admin_id, updates }: UpdatePlatformAdminInput) => {
      const { data, error } = await supabase.functions.invoke('manage-platform-admin', {
        body: { action: 'update', admin_id, updates },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to update admin');
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admins', variables.admin_id] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-audit-log', variables.admin_id] });
      toast.success('Platform admin updated successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_platform_admin' }),
  });
}

// ============================================================================
// Deactivate Platform Admin (supervisor only, via edge function)
// ============================================================================

export function useDeactivatePlatformAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (admin_id: string) => {
      const { data, error } = await supabase.functions.invoke('manage-platform-admin', {
        body: { action: 'deactivate', admin_id },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to deactivate admin');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      toast.success('Platform admin deactivated');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'deactivate_platform_admin' }),
  });
}

// ============================================================================
// Update Own Availability (self-service, direct Supabase update)
// ============================================================================

interface UpdateAvailabilityInput {
  availability_status: string;
  leave_start_date?: string | null;
  leave_end_date?: string | null;
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAvailabilityInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData = await withUpdatedBy({
        availability_status: input.availability_status,
        leave_start_date: input.leave_start_date || null,
        leave_end_date: input.leave_end_date || null,
      });

      const { data, error } = await supabase
        .from('platform_admin_profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admins', 'self'] });
      toast.success('Availability updated successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_availability' }),
  });
}
