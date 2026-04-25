/**
 * Pure composer that assembles a `CpaPreviewInput` from already-fetched
 * data sources. NO data fetching. Hooks call this with their query results.
 */

import type { CpaPreviewInput } from '@/services/legal/cpaPreviewInterpolator';
import {
  PLATFORM_NAME,
  ROLE_LABELS,
  type RoleLabelKey,
} from '@/constants/legalPreview.constants';

export interface TemplateContextChallenge {
  id?: string | null;
  title?: string | null;
  problem_statement?: string | null;
  scope?: string | null;
  ip_model?: string | null;
  governance_mode_override?: string | null;
  currency_code?: string | null;
  submission_deadline?: string | null;
  evaluation_method?: string | null;
  evaluator_count?: number | null;
  solver_audience?: string | null;
  operating_model?: string | null;
  reward_structure?: Record<string, unknown> | null;
}

export interface TemplateContextOrg {
  organization_name?: string | null;
  legal_entity_name?: string | null;
  preferred_currency?: string | null;
  operating_model?: string | null;
}

export interface TemplateContextUser {
  full_name?: string | null;
  email?: string | null;
}

export interface TemplateContextEscrow {
  required?: boolean;
  payment_mode?: string | null;
  installment_count?: number;
  platform_fee_pct?: number | null;
}

export interface BuildCpaPreviewInputArgs {
  challenge?: TemplateContextChallenge | null;
  org?: TemplateContextOrg | null;
  countryName?: string | null;
  industrySegmentName?: string | null;
  jurisdiction?: string | null;
  governingLaw?: string | null;
  dataPrivacyLaws?: string | null;
  regulatoryFrameworks?: string | null;
  industryName?: string | null;
  industryCertifications?: string | null;
  industryFrameworks?: string | null;
  user?: TemplateContextUser | null;
  roleKey?: RoleLabelKey | null;
  roleLabelOverride?: string | null;
  escrow?: TemplateContextEscrow | null;
  acceptanceDate?: string | null;
}

function readPrize(rs: Record<string, unknown> | null | undefined): number | string | null {
  if (!rs) return null;
  const platinum = rs.platinum_award;
  if (typeof platinum === 'number' || typeof platinum === 'string') return platinum;
  const budgetMax = rs.budget_max;
  if (typeof budgetMax === 'number' || typeof budgetMax === 'string') return budgetMax;
  return null;
}

function readPaymentMode(rs: Record<string, unknown> | null | undefined): string | null {
  if (!rs) return null;
  const mode = rs.payment_mode;
  return typeof mode === 'string' ? mode : null;
}

function readMilestoneCount(rs: Record<string, unknown> | null | undefined): number | null {
  if (!rs) return null;
  const milestones = rs.payment_milestones;
  return Array.isArray(milestones) ? milestones.length : null;
}

export function buildCpaPreviewInput(args: BuildCpaPreviewInputArgs): CpaPreviewInput {
  const {
    challenge,
    org,
    countryName,
    industrySegmentName,
    jurisdiction,
    governingLaw,
    dataPrivacyLaws,
    regulatoryFrameworks,
    industryName,
    industryCertifications,
    industryFrameworks,
    user,
    roleKey,
    roleLabelOverride,
    escrow,
    acceptanceDate,
  } = args;

  const rs = challenge?.reward_structure ?? null;
  const prize = readPrize(rs);
  const paymentMode = escrow?.payment_mode ?? readPaymentMode(rs);
  const installmentCount = escrow?.installment_count ?? readMilestoneCount(rs);
  const roleLabel = roleLabelOverride ?? (roleKey ? ROLE_LABELS[roleKey] : null);

  return {
    challenge_title: challenge?.title ?? null,
    problem_statement: challenge?.problem_statement ?? null,
    scope: challenge?.scope ?? null,
    ip_model: challenge?.ip_model ?? null,
    governance_mode: challenge?.governance_mode_override ?? null,
    operating_model: challenge?.operating_model ?? org?.operating_model ?? null,
    prize_amount: prize,
    currency: challenge?.currency_code ?? org?.preferred_currency ?? null,
    evaluation_method: challenge?.evaluation_method ?? null,
    evaluator_count: challenge?.evaluator_count ?? null,
    solver_audience: challenge?.solver_audience ?? null,
    submission_deadline: challenge?.submission_deadline ?? null,
    seeker_org_name: org?.organization_name ?? null,
    jurisdiction: jurisdiction ?? null,
    governing_law: governingLaw ?? null,
    seeker_legal_entity: org?.legal_entity_name ?? null,
    seeker_country: countryName ?? null,
    seeker_industry: industrySegmentName ?? null,
    data_privacy_laws: dataPrivacyLaws ?? null,
    regulatory_frameworks: regulatoryFrameworks ?? null,
    industry_name: industryName ?? industrySegmentName ?? null,
    industry_certifications: industryCertifications ?? null,
    industry_frameworks: industryFrameworks ?? null,
    user_full_name: user?.full_name ?? null,
    user_email: user?.email ?? null,
    user_role: roleLabel ?? null,
    acceptance_date: acceptanceDate ?? null,
    escrow_required:
      typeof escrow?.required === 'boolean'
        ? escrow.required
          ? 'Yes'
          : 'No'
        : null,
    payment_mode: paymentMode,
    installment_count: installmentCount,
    platform_fee_pct: escrow?.platform_fee_pct ?? null,
    platform_name: PLATFORM_NAME,
  };
}
