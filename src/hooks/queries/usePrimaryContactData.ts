/**
 * Primary Contact Data Hooks (REG-002)
 * 
 * React Query hooks for Step 2: blocked domains, languages, OTP, upsert contact.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MASTER_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

// ============================================================
// Departments
// ============================================================
export function useDepartments() {
  return useQuery({
    queryKey: ['md_departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_departments')
        .select('id, code, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Blocked Email Domains (BR-REG-005)
// ============================================================
export function useBlockedDomains() {
  return useQuery({
    queryKey: ['blocked_email_domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_blocked_email_domains')
        .select('domain')
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => d.domain.toLowerCase());
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Languages
// ============================================================
export function useLanguages() {
  return useQuery({
    queryKey: ['md_languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_languages')
        .select('id, code, name, native_name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Send OTP (via edge function)
// ============================================================
export function useSendOtp() {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      organization_id: string;
      tenant_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-registration-otp', {
        body: payload,
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) {
        throw new Error(data.error?.message ?? 'Failed to send OTP');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Verification code sent to your email');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send OTP: ${error.message}`);
    },
  });
}

// ============================================================
// Verify OTP (via edge function)
// ============================================================
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      otp: string;
      organization_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('verify-registration-otp', {
        body: payload,
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) {
        throw new Error(data.error?.message ?? 'Verification failed');
      }
      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============================================================
// Upsert Primary Contact
// ============================================================
export function useUpsertContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      tenant_id: string;
      first_name: string;
      last_name: string;
      job_title: string;
      email: string;
      phone_country_code: string;
      phone_number: string;
      department?: string;
      timezone: string;
      preferred_language_id: string;
      email_verified: boolean;
    }) => {
      const { organization_id, tenant_id, job_title, ...rest } = payload;

      // Check if primary contact exists for this org
      const { data: existing } = await supabase
        .from('seeker_contacts')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('is_primary', true)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('seeker_contacts')
          .update({
            ...rest,
            job_title,
            email_verified_at: payload.email_verified ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
        return { contactId: existing.id };
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('seeker_contacts')
          .insert({
            organization_id,
            tenant_id,
            ...rest,
            job_title,
            contact_type: 'primary' as const,
            is_primary: true,
            is_decision_maker: true,
            email_verified_at: payload.email_verified ? new Date().toISOString() : null,
          })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        return { contactId: data.id };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_contacts'] });
      toast.success('Contact details saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save contact: ${error.message}`);
    },
  });
}
