/**
 * Candidate Detail Hook
 * 
 * Fetches comprehensive enrollment details for reviewer candidate view.
 * Provides read-only data for the Provider Details tab.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CandidateOrganization {
  org_name: string | null;
  org_type: string | null;
  org_type_id: string | null;
  org_website: string | null;
  designation: string | null;
  manager_name: string | null;
  manager_email: string | null;
  manager_phone: string | null;
  employee_count: string | null;
  approval_status: string | null;
}

export interface CandidateDetail {
  // Enrollment info
  enrollmentId: string;
  providerId: string;
  lifecycleStatus: string;
  lifecycleRank: number;
  
  // Provider details
  firstName: string;
  lastName: string;
  address: string | null;
  pinCode: string | null;
  countryId: string | null;
  countryName: string | null;
  
  // Industry & Expertise
  industrySegmentId: string;
  industrySegmentName: string;
  expertiseLevelId: string | null;
  expertiseLevelName: string | null;
  
  // Participation Mode (Affiliation Type)
  participationModeId: string | null;
  participationModeCode: string | null;
  participationModeName: string | null;
  requiresOrgInfo: boolean;
  
  // Organization Details (from enrollment.organization JSONB)
  organization: CandidateOrganization | null;
  
  // org_approval_status from enrollment
  orgApprovalStatus: string | null;
  
  // Interview info
  interviewBookingId: string | null;
  interviewScheduledAt: string | null;
  interviewStatus: string | null;
  
  // For header display
  timezone: string | null;
}

/**
 * Fetch comprehensive enrollment details for reviewer view
 */
export function useCandidateDetail(enrollmentId?: string) {
  return useQuery({
    queryKey: ['candidate-detail', enrollmentId],
    queryFn: async (): Promise<CandidateDetail | null> => {
      if (!enrollmentId) return null;

      // Fetch enrollment with related data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select(`
          id,
          provider_id,
          lifecycle_status,
          lifecycle_rank,
          industry_segment_id,
          expertise_level_id,
          participation_mode_id,
          organization,
          org_approval_status
        `)
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError || !enrollment) {
        throw new Error(enrollmentError?.message || 'Enrollment not found');
      }

      // Fetch provider details
      const { data: provider, error: providerError } = await supabase
        .from('solution_providers')
        .select(`
          id,
          first_name,
          last_name,
          address,
          pin_code,
          country_id
        `)
        .eq('id', enrollment.provider_id)
        .single();

      if (providerError || !provider) {
        throw new Error(providerError?.message || 'Provider not found');
      }

      // Fetch related lookup data in parallel
      const [
        industryResult,
        expertiseResult,
        modeResult,
        countryResult,
        interviewResult
      ] = await Promise.all([
        // Industry segment
        supabase
          .from('industry_segments')
          .select('id, name')
          .eq('id', enrollment.industry_segment_id)
          .single(),
        // Expertise level (optional)
        enrollment.expertise_level_id
          ? supabase
              .from('expertise_levels')
              .select('id, name')
              .eq('id', enrollment.expertise_level_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
        // Participation mode (optional)
        enrollment.participation_mode_id
          ? supabase
              .from('participation_modes')
              .select('id, name, code, requires_org_info')
              .eq('id', enrollment.participation_mode_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
        // Country (optional)
        provider.country_id
          ? supabase
              .from('countries')
              .select('id, name')
              .eq('id', provider.country_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
        // Interview booking
        supabase
          .from('interview_bookings')
          .select('id, scheduled_at, status')
          .eq('enrollment_id', enrollmentId)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      // Parse organization JSONB - cast through unknown for type safety
      const organization = enrollment.organization as unknown as CandidateOrganization | null;

      return {
        enrollmentId: enrollment.id,
        providerId: enrollment.provider_id,
        lifecycleStatus: enrollment.lifecycle_status,
        lifecycleRank: enrollment.lifecycle_rank,
        
        firstName: provider.first_name || '',
        lastName: provider.last_name || '',
        address: provider.address,
        pinCode: provider.pin_code,
        countryId: provider.country_id,
        countryName: countryResult.data?.name || null,
        timezone: null, // Not stored on solution_providers table
        
        industrySegmentId: enrollment.industry_segment_id,
        industrySegmentName: industryResult.data?.name || 'Unknown',
        expertiseLevelId: enrollment.expertise_level_id,
        expertiseLevelName: expertiseResult.data?.name || null,
        
        participationModeId: enrollment.participation_mode_id,
        participationModeCode: modeResult.data?.code || null,
        participationModeName: modeResult.data?.name || null,
        requiresOrgInfo: modeResult.data?.requires_org_info || false,
        
        organization,
        orgApprovalStatus: enrollment.org_approval_status || organization?.approval_status || null,
        
        interviewBookingId: interviewResult.data?.id || null,
        interviewScheduledAt: interviewResult.data?.scheduled_at || null,
        interviewStatus: interviewResult.data?.status || null,
      };
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
  });
}
