/**
 * usePreviewData — Combined data loading for Challenge Preview Page.
 * Fetches challenge (with org join), legal docs, escrow, digest, attachments, field rules.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGovernanceFieldRules } from '@/hooks/queries/useGovernanceFieldRules';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import type { ChallengeData, LegalDocDetail, EscrowRecord } from '@/lib/cogniblend/curationTypes';
import type { GovernanceMode } from '@/lib/governanceMode';

export interface OrgData {
  organization_name: string | null;
  organization_type_id: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  organization_description: string | null;
  tagline: string | null;
  organization_types: { name: string } | null;
}

export interface DigestData {
  id: string;
  digest_text: string;
  key_facts: unknown;
  source_count: number;
  generated_at: string;
}

export interface PreviewAttachment {
  id: string;
  file_name: string | null;
  display_name: string | null;
  storage_path: string | null;
  section_key: string;
  source_type: string;
  source_url: string | null;
  url_title: string | null;
  extraction_quality: string | null;
  discovery_status: string;
}

export function usePreviewData(challengeId: string | undefined) {
  const challengeQuery = useQuery({
    queryKey: ['challenge-preview', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, problem_statement, scope, hook, description,
          deliverables, expected_outcomes, evaluation_criteria,
          reward_structure, phase_schedule, ip_model, maturity_level,
          domain_tags, currency_code, operating_model, governance_profile,
          governance_mode_override, current_phase, phase_status,
          organization_id, curation_lock_status, curation_frozen_at,
          extended_brief, creator_legal_instructions, ai_section_reviews,
          visibility, evaluation_method, evaluator_count, solver_audience,
          complexity_score, complexity_level, complexity_parameters,
          complexity_locked, solver_expertise_requirements,
          eligibility, solution_types, data_resources_provided,
          success_metrics_kpis, master_status, submission_guidelines,
          lc_compliance_complete, fc_compliance_complete,
          seeker_organizations!inner(
            organization_name, organization_type_id, website_url,
            linkedin_url, twitter_url, organization_description, tagline,
            organization_types(name)
          )
        `)
        .eq('id', challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const govMode = challengeQuery.data
    ? resolveGovernanceMode(
        challengeQuery.data.governance_mode_override ?? challengeQuery.data.governance_profile
      )
    : null;

  const fieldRulesQuery = useGovernanceFieldRules(govMode as GovernanceMode | null);

  const legalQuery = useQuery({
    queryKey: ['preview-legal-docs', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, content_summary, lc_status, status, tier')
        .eq('challenge_id', challengeId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as LegalDocDetail[];
    },
    enabled: !!challengeId,
    staleTime: 0,
  });

  const escrowQuery = useQuery({
    queryKey: ['preview-escrow', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_records')
        .select('id, escrow_status, deposit_amount, remaining_amount, bank_name, bank_branch, bank_address, currency, deposit_date, deposit_reference, fc_notes')
        .eq('challenge_id', challengeId!)
        .maybeSingle();
      if (error) return null;
      return data as unknown as EscrowRecord | null;
    },
    enabled: !!challengeId,
    staleTime: 0,
  });

  const digestQuery = useQuery({
    queryKey: ['preview-digest', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_context_digest')
        .select('id, digest_text, key_facts, source_count, generated_at')
        .eq('challenge_id', challengeId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as DigestData | null;
    },
    enabled: !!challengeId,
    staleTime: 0,
  });

  // P5 FIX: Only show accepted sources in preview, include quality + title
  const attachmentsQuery = useQuery({
    queryKey: ['preview-attachments', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('id, file_name, display_name, storage_path, section_key, source_type, source_url, url_title, extraction_quality, discovery_status')
        .eq('challenge_id', challengeId!)
        .eq('discovery_status', 'accepted')
        .order('display_order');
      if (error) throw new Error(error.message);
      return (data ?? []) as PreviewAttachment[];
    },
    enabled: !!challengeId,
    staleTime: 0,
  });

  const isLoading = challengeQuery.isLoading || legalQuery.isLoading || escrowQuery.isLoading;
  const isError = challengeQuery.isError;
  const error = challengeQuery.error;

  const orgData = challengeQuery.data?.seeker_organizations as unknown as OrgData | null;

  return {
    challenge: challengeQuery.data as unknown as ChallengeData | null,
    orgData,
    legalDetails: legalQuery.data ?? [],
    escrowRecord: escrowQuery.data ?? null,
    digest: digestQuery.data ?? null,
    attachments: attachmentsQuery.data ?? [],
    fieldRules: fieldRulesQuery.data ?? null,
    governanceMode: govMode,
    isLoading,
    isError,
    error,
  };
}
