/**
 * review-challenge-sections — Role-aware per-section AI review.
 * Returns granular pass/warning/needs_revision per section with comments.
 * Supports single-section mode via optional `section_key` parameter.
 * Supports role contexts: 'curation', 'legal', 'finance', 'evaluation'.
 * Loads config from ai_review_section_config DB table; falls back to hardcoded defaults.
 * Persists results to challenges.ai_section_reviews.
 *
 * TWO-PASS ARCHITECTURE:
 * Pass 1 (Analyze): Generate comments, status, guidelines, cross-section issues. No suggestion.
 * Pass 2 (Rewrite): Receive Pass 1 comments as input. Generate ONLY improved content.
 * Pass 2 is skipped entirely when all sections pass with only strength/best_practice comments.
 *
 * Batching: splits sections into batches of MAX_BATCH_SIZE to prevent LLM output truncation.
 * Master data: injects allowed option codes into prompt for master-data-backed sections.
 *
 * CHANGES:
 * - Change 1: Pass 2 uses enriched buildPass2SystemPrompt with section-specific config
 * - Change 2: getModelForRequest routes critical sections to critical_model
 * - Change 3: skip_analysis + provided_comments for re-refine (Pass 2 only)
 * - Change 4: cleanAIOutput sanitizes literal \n in LLM output
 * - FIX 1: Cross-section dependency injection in Pass 2
 * - FIX 3: Curated Pass 1 user prompt (no raw JSON dump)
 * - FIX 4: Enriched Pass 2 context header
 * - FIX 8: Batch size optimization with solo sections
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildConfiguredBatchPrompt, buildSmartBatchPrompt, buildPass2SystemPrompt, getSuggestionFormatInstruction, getSectionFormatType, sanitizeTableSuggestion, detectDomainFrameworks, buildContextIntelligence, SECTION_WAVE_CONTEXT, resolveIndustryCode, countryToRegion, buildIndustryIntelligence, buildGeographyContext, type SectionConfig } from "./promptTemplate.ts";
import { fetchMasterDataOptions, MASTER_DATA_SECTION_TABLES, STATIC_MASTER_DATA } from "./masterData.ts";
import { callAIPass1Analyze, callAIPass2Rewrite, callAIBatchTwoPass, cleanAIOutput, SECTION_FIELD_ALIASES, SECTION_DEPENDENCIES, DEPENDENCY_REASONING } from "./aiCalls.ts";
import { callComplexityAI, executeComplexityAssessment } from "./complexity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/* ── FIX 8: Reduced batch size + solo sections ── */
const MAX_BATCH_SIZE = 6;
const SOLO_SECTIONS = new Set([
  'evaluation_criteria', 'reward_structure', 'deliverables', 'solver_expertise',
]);

/* ── Change 2: Critical sections for model routing ── */
const CRITICAL_SECTIONS = new Set([
  'problem_statement', 'deliverables', 'evaluation_criteria',
  'phase_schedule', 'complexity', 'reward_structure',
]);

/** Change 2: Select model based on section importance */
function getModelForRequest(sectionKeys: string[], globalConfig: any): string {
  const hasCritical = sectionKeys.some(key => CRITICAL_SECTIONS.has(key));
  if (hasCritical && globalConfig?.critical_model) {
    return globalConfig.critical_model;
  }
  return globalConfig?.default_model || 'google/gemini-3-flash-preview';
}


/* ── FIX 3: Helper functions for curated prompts ── */

function stripHtml(s: any): string {
  if (!s) return '(empty)';
  const t = String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.substring(0, 3000) || '(empty)';
}

function jsonBrief(v: any): string {
  if (!v) return '(empty)';
  if (typeof v === 'string' && v.trim().length === 0) return '(empty)';
  const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  return s.substring(0, 2000) || '(empty)';
}


/* ── Hardcoded fallback section definitions ──────────────── */

const CURATION_SECTIONS = [
  // Wave 1: Foundation
  { key: "problem_statement", desc: "Our core business challenge — clear, specific, quantified, understandable by external solvers with no internal context" },
  { key: "scope", desc: "What we need addressed (in scope) and what we explicitly exclude (out of scope)" },
  { key: "expected_outcomes", desc: "The measurable results we expect from the winning solution" },
  { key: "context_and_background", desc: "Our organizational and operational context that external solvers need to understand our environment" },
  // Wave 2: Analysis
  { key: "root_causes", desc: "The underlying causes of our problem — why it exists, not just what it is" },
  { key: "affected_stakeholders", desc: "Who in our organization is impacted and what adoption challenges they will face" },
  { key: "current_deficiencies", desc: "What our current state looks like — factual gaps, limitations, and measurable baselines" },
  { key: "preferred_approach", desc: "Our strategic preferences and direction for the solution — seeker-authored, must be preserved as-is" },
  { key: "approaches_not_of_interest", desc: "Approaches we have tried or rejected — solvers should avoid these" },
  // Wave 3: Specification
  { key: "solution_type", desc: "The type(s) of solution we are seeking — determines which solver pool is targeted" },
  { key: "deliverables", desc: "Exactly what we expect solvers to produce — each with acceptance criteria and format" },
  { key: "maturity_level", desc: "The depth of solution we need — Blueprint (strategy), POC (prototype), or Pilot (production)" },
  { key: "data_resources_provided", desc: "Datasets, APIs, documentation, and tools we will provide to solvers" },
  { key: "success_metrics_kpis", desc: "How we will measure whether the solution achieves our expected outcomes" },
  // Wave 4: Assessment
  { key: "complexity", desc: "How complex our challenge is across multiple dimensions — drives timeline and reward sizing" },
  { key: "solver_expertise", desc: "The specific expertise, certifications, and domain knowledge we require from solvers" },
  { key: "eligibility", desc: "Which solver tiers (individual, team, organization) are eligible to participate" },
  // Wave 5: Execution
  { key: "phase_schedule", desc: "Our timeline — registration, submission, evaluation, and winner announcement phases" },
  { key: "evaluation_criteria", desc: "How we will score submissions — criteria, weights (must sum to 100%), methods, and evaluator roles" },
  { key: "submission_guidelines", desc: "What solvers must submit — format, structure, required sections, and size limits" },
  { key: "reward_structure", desc: "What we offer — monetary prize tiers and non-monetary incentives for solvers" },
  { key: "ip_model", desc: "How intellectual property ownership transfers between solver and our organization" },
  // Wave 6: Presentation & Compliance
  { key: "legal_docs", desc: "Required legal agreements — NDA, Terms, IP assignment documents" },
  { key: "escrow_funding", desc: "Prize fund escrow status and funding confirmation" },
  { key: "hook", desc: "Our challenge headline — the first thing solvers see, must compel them to read further" },
  { key: "visibility", desc: "Whether solver identities are visible or anonymous during evaluation" },
  { key: "domain_tags", desc: "Tags that help the right solvers discover our challenge on the platform" },
];

// INTAKE_SECTIONS and SPEC_SECTIONS removed — deprecated role contexts
// Legacy challenges with 'intake'/'spec' context fall back to 'curation' via resolvedContext

type RoleContext = "curation" | "legal" | "finance" | "evaluation";

const VALID_CONTEXTS: RoleContext[] = ["curation", "legal", "finance", "evaluation"];

function getFallbackSections(roleContext: RoleContext) {
  switch (roleContext) {
    case "curation": return CURATION_SECTIONS;
    default: return [];
  }
}

function buildFallbackSystemPrompt(sections: { key: string; desc: string }[], roleContext: RoleContext): string {
  const sectionList = sections.map((s, i) => `${i + 1}. ${s.key} - ${s.desc}`).join("\n");

  const roleGuidance = `You are an expert innovation challenge quality reviewer performing a deep, contextual review.
For each section, assess:
- **Content quality**: Is the language clear, specific, unambiguous?
- **Completeness**: Are all required aspects covered?
- **Industry-appropriateness**: Does the content fit the stated industry/domain?
- **Cross-section consistency**: Do deliverables align with evaluation criteria?
- **Actionability for solvers**: Would a solver clearly understand what is expected?
- **Maturity-level fit**: Is the depth appropriate for the stated maturity level?`;

  return `${roleGuidance}

For each section provide ANALYSIS ONLY (no suggestion field):
- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has specific issues that must be fixed)
- comments: 1-3 specific, actionable improvement instructions. For "pass" status, provide 1-2 "strength" comments.

Do NOT include a "suggestion" field. Focus entirely on thorough analysis.

Sections to review:
${sectionList}

Every comment MUST be phrased as an actionable improvement instruction.`;
}




serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Change 3: Extract skip_analysis and provided_comments
    const {
      challenge_id, section_key, role_context, context: clientContext,
      preview_mode, current_content, wave_action,
      skip_analysis, provided_comments,
      pass1_only,
    } = await req.json();
    const isPreviewMode = preview_mode === true && challenge_id === 'test-preview';

    if (!challenge_id && !isPreviewMode) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedContext: RoleContext = (VALID_CONTEXTS.includes(role_context) ? role_context : "curation") as RoleContext;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── Load config from DB ──────────────────────────────────
    const [configResult, globalConfigResult] = await Promise.all([
      adminClient
        .from("ai_review_section_config")
        .select("*")
        .eq("role_context", resolvedContext)
        .eq("is_active", true),
      adminClient
        .from("ai_review_global_config")
        .select("*")
        .eq("id", 1)
        .single(),
    ]);

    const dbConfigs: SectionConfig[] = (configResult.data ?? []) as SectionConfig[];
    const globalConfig = globalConfigResult.data;
    const useDbConfig = dbConfigs.length > 0;
    const useContextIntelligence = globalConfig?.use_context_intelligence === true;

    // Build section list — from DB config or fallback
    let sectionsToReview: { key: string; desc: string }[];
    let dbConfigMap: Map<string, SectionConfig> | null = null;

    if (useDbConfig) {
      dbConfigMap = new Map(dbConfigs.map(c => [c.section_key, c]));
      const allKeys = dbConfigs.map(c => ({ key: c.section_key, desc: c.section_description || c.section_label }));
      sectionsToReview = section_key
        ? allKeys.filter(s => s.key === section_key)
        : allKeys;

      // Fallback: if a specific section_key was requested but not found in DB config,
      // check the hardcoded fallback list before returning an error
      if (section_key && sectionsToReview.length === 0) {
        const fallback = getFallbackSections(resolvedContext);
        sectionsToReview = fallback.filter(s => s.key === section_key);
      }
    } else {
      const fallback = getFallbackSections(resolvedContext);
      sectionsToReview = section_key
        ? fallback.filter(s => s.key === section_key)
        : fallback;
    }

    if (section_key && sectionsToReview.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: `Unknown section_key: ${section_key}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Preview mode: skip challenge DB lookup, use mock data ──
    let challengeData: any;
    let additionalData = "";
    let resultIdx = 1;
    let orgContext: {
      orgType?: string; orgName?: string; tradeBrand?: string; orgDescription?: string;
      websiteUrl?: string; linkedinUrl?: string; twitterUrl?: string; tagline?: string;
      hqCountry?: string; hqCity?: string;
      annualRevenue?: string; employeeCount?: string; foundingYear?: number;
      isEnterprise?: boolean; functionalAreas?: string[];
      industries?: { name: string; isPrimary: boolean }[];
    } = {};

    if (isPreviewMode) {
      challengeData = {
        title: "Preview Test Challenge",
        problem_statement: current_content || "Test content for prompt preview.",
        scope: "Preview scope",
        ai_section_reviews: [],
        ...(clientContext || {}),
      };
      if (section_key) {
        challengeData[section_key] = current_content || "Test content for this section.";
      }
    } else {
      // ── Fetch challenge data based on context ─────────────────
      const challengeFields = resolvedContext === "intake"
        ? "title, problem_statement, scope, reward_structure, phase_schedule, extended_brief, ai_section_reviews"
        : resolvedContext === "legal"
        ? "title, ip_model, maturity_level, eligibility, ai_section_reviews"
        : resolvedContext === "finance"
        ? "title, reward_structure, phase_schedule, ai_section_reviews"
        : resolvedContext === "evaluation"
        ? "title, evaluation_criteria, deliverables, complexity_level, ai_section_reviews"
        : "title, problem_statement, scope, description, deliverables, expected_outcomes, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, eligibility_model, visibility, challenge_visibility, phase_schedule, complexity_score, complexity_level, complexity_parameters, ai_section_reviews, hook, extended_brief, domain_tags, solver_expertise_requirements, solver_eligibility_types, solver_visibility_types, success_metrics_kpis, data_resources_provided, solution_type, currency_code, organization_id, submission_guidelines, operating_model, industry_segment_id";

      const fetchPromises: Promise<any>[] = [
        adminClient.from("challenges").select(challengeFields).eq("id", challenge_id).single(),
      ];

      // Context-specific data fetching
      if (resolvedContext === "curation" || resolvedContext === "legal") {
        fetchPromises.push(
          adminClient
            .from("challenge_legal_docs")
            .select("document_type, tier, status, lc_status, lc_review_notes, document_name")
            .eq("challenge_id", challenge_id)
        );
      }
      if (resolvedContext === "curation" || resolvedContext === "finance") {
        fetchPromises.push(
          adminClient
            .from("escrow_records")
            .select("escrow_status, deposit_amount, currency, remaining_amount, rejection_fee_percentage, fc_notes, bank_name")
            .eq("challenge_id", challenge_id)
            .maybeSingle()
        );
      }
      if (resolvedContext === "evaluation") {
        fetchPromises.push(
          adminClient
            .from("evaluation_records")
            .select("rubric_scores, commentary, individual_score, conflict_declared, conflict_action")
            .eq("challenge_id", challenge_id)
            .order("created_at", { ascending: false })
            .limit(10),
          adminClient
            .from("solutions")
            .select("id", { count: "exact", head: true })
            .eq("challenge_id", challenge_id)
        );
      }

      const results = await Promise.all(fetchPromises);
      const challengeResult = results[0];

      if (challengeResult.error || !challengeResult.data) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      challengeData = challengeResult.data;

      // ── Fetch organization context for intelligence layer ──
      if (challengeData.organization_id) {
        try {
          const { data: org } = await adminClient
            .from('seeker_organizations')
            .select('organization_name, trade_brand_name, organization_description, website_url, linkedin_url, twitter_url, tagline, functional_areas, hq_country_id, hq_city, annual_revenue_range, employee_count_range, founding_year, is_enterprise, organization_type_id')
            .eq('id', challengeData.organization_id)
            .single();
          if (org) {
            orgContext.orgName = org.organization_name;
            orgContext.tradeBrand = org.trade_brand_name ?? undefined;
            orgContext.orgDescription = org.organization_description ?? undefined;
            orgContext.websiteUrl = org.website_url ?? undefined;
            orgContext.linkedinUrl = org.linkedin_url ?? undefined;
            orgContext.hqCity = org.hq_city ?? undefined;
            orgContext.annualRevenue = org.annual_revenue_range ?? undefined;
            orgContext.employeeCount = org.employee_count_range ?? undefined;
            orgContext.foundingYear = org.founding_year ?? undefined;
            orgContext.isEnterprise = org.is_enterprise;
            orgContext.twitterUrl = org.twitter_url ?? undefined;
            orgContext.tagline = org.tagline ?? undefined;
            orgContext.functionalAreas = org.functional_areas ?? [];

            if (org.hq_country_id) {
              const { data: ctry } = await adminClient.from('countries').select('name, code').eq('id', org.hq_country_id).single();
              if (ctry) {
                orgContext.hqCountry = ctry.name;
                orgContext.hqCountryCode = ctry.code;
              }
            }
            if (org.organization_type_id) {
              const { data: ot } = await adminClient.from('organization_types').select('name').eq('id', org.organization_type_id).single();
              if (ot) orgContext.orgType = ot.name;
            }
            const { data: orgIndustries } = await adminClient
              .from('seeker_org_industries').select('industry_id, is_primary')
              .eq('organization_id', challengeData.organization_id);
            if (orgIndustries?.length) {
              const ids = orgIndustries.map((oi: any) => oi.industry_id);
              const { data: segs } = await adminClient.from('industry_segments').select('id, name, code').in('id', ids);
              if (segs) {
                orgContext.industries = segs.map((s: any) => ({
                  name: s.name,
                  code: s.code,
                  isPrimary: orgIndustries.find((oi: any) => oi.industry_id === s.id)?.is_primary ?? false,
                }));
              }
            }
          }
        } catch (err) { console.warn('Org intel fetch failed:', err); }
      }

      // ── Phase 11: Fetch industry knowledge pack + geography context ──
      let industryPack: any = null;
      let geoContext: any = null;
      let regionCode: string | null = null;

      try {
        const rawIndustryCode = orgContext?.industries?.[0]?.code || null;
        const industryCode = resolveIndustryCode(rawIndustryCode);

        if (industryCode) {
          const { data } = await adminClient
            .from('industry_knowledge_packs')
            .select('*')
            .eq('industry_code', industryCode)
            .eq('is_active', true)
            .maybeSingle();
          industryPack = data;
        }

        const countryCode = orgContext?.hqCountryCode || null;
        regionCode = countryToRegion(countryCode);

        if (regionCode) {
          const { data } = await adminClient
            .from('geography_context')
            .select('*')
            .eq('region_code', regionCode)
            .single();
          geoContext = data;
        }
      } catch (e) {
        console.warn('Industry/geography fetch failed (non-blocking):', e);
      }

      // Attach to clientContext so prompt builders can access them
      if (clientContext) {
        clientContext._industryPack = industryPack;
        clientContext._geoContext = geoContext;
        clientContext._regionCode = regionCode;
      }

      // Extract extended_brief fields for intake/spec
      if ((resolvedContext === "intake" || resolvedContext === "spec") && challengeData.extended_brief) {
        const eb = typeof challengeData.extended_brief === "object" ? challengeData.extended_brief : {};
        challengeData = {
          ...challengeData,
          beneficiaries_mapping: (eb as any).beneficiaries_mapping ?? null,
          solution_expectations: (eb as any).solution_expectations ?? challengeData.scope ?? null,
          expected_outcomes: (eb as any).expected_outcomes ?? challengeData.scope ?? null,
        };
      }

      // For curation context: extract extended_brief subsections as individual data fields
      if (resolvedContext === "curation" && challengeData.extended_brief) {
        const eb = typeof challengeData.extended_brief === "object" ? challengeData.extended_brief : {};
        challengeData = {
          ...challengeData,
          context_and_background: (eb as any).context_background ?? null,
          root_causes: (eb as any).root_causes ?? null,
          affected_stakeholders: (eb as any).affected_stakeholders ?? null,
          current_deficiencies: (eb as any).current_deficiencies ?? null,
          preferred_approach: (eb as any).preferred_approach ?? null,
          approaches_not_of_interest: (eb as any).approaches_not_of_interest ?? null,
        };
      }

      // Alias section keys to their actual DB field values for Pass 1 JSON dump
      if (!challengeData.solver_expertise && challengeData.solver_expertise_requirements) {
        challengeData.solver_expertise = challengeData.solver_expertise_requirements;
      }
      if (!challengeData.eligibility || challengeData.eligibility === '') {
        challengeData.eligibility = challengeData.solver_eligibility_types ?? null;
      }
      if (!challengeData.visibility || challengeData.visibility === '') {
        challengeData.visibility = challengeData.solver_visibility_types ?? null;
      }
      if (!challengeData.submission_guidelines) {
        challengeData.submission_guidelines = challengeData.description ?? null;
      }
      if (challengeData.solution_types && !Array.isArray(challengeData.solution_type)) {
        challengeData.solution_type = challengeData.solution_types;
      }

      // If re-review sends current_content for a specific section, overlay onto challengeData
      if (section_key && current_content != null) {
        challengeData[section_key] = current_content;
        const alias = SECTION_FIELD_ALIASES[section_key];
        if (alias) challengeData[alias] = current_content;
      }

      // Build context-specific data sections for user prompt
      if (resolvedContext === "curation") {
        const legalResult = results[resultIdx++];
        const escrowResult = results[resultIdx++];
        if (legalResult?.data) additionalData += `\n\nLEGAL DOCS: ${JSON.stringify(legalResult.data, null, 2)}`;
        if (escrowResult?.data) additionalData += `\n\nESCROW: ${JSON.stringify(escrowResult.data, null, 2)}`;
      } else if (resolvedContext === "legal") {
        const legalResult = results[resultIdx++];
        if (legalResult?.data) additionalData += `\n\nLEGAL DOCS: ${JSON.stringify(legalResult.data, null, 2)}`;
      } else if (resolvedContext === "finance") {
        const escrowResult = results[resultIdx++];
        if (escrowResult?.data) additionalData += `\n\nESCROW: ${JSON.stringify(escrowResult.data, null, 2)}`;
      } else if (resolvedContext === "evaluation") {
        const evalResult = results[resultIdx++];
        const solnResult = results[resultIdx++];
        if (evalResult?.data) additionalData += `\n\nEVALUATION RECORDS: ${JSON.stringify(evalResult.data, null, 2)}`;
        if (solnResult) additionalData += `\n\nSOLUTION COUNT: ${solnResult.count ?? 0}`;
      }
    } // end non-preview branch

    const contextLabel = resolvedContext === "intake" ? "intake brief"
      : resolvedContext === "spec" ? "specification"
      : resolvedContext === "legal" ? "legal documentation"
      : resolvedContext === "finance" ? "financial configuration"
      : resolvedContext === "evaluation" ? "evaluation setup"
      : "challenge";

    // ── Fetch master data for prompt injection ────────────────
    let masterDataOptions: Record<string, { code: string; label: string }[]> = {};
    if (resolvedContext === "curation") {
      masterDataOptions = await fetchMasterDataOptions(adminClient);
    }

    // ── Fetch extracted attachment content (files + URLs) ────────────────
    // Phase 7: Filter out AI-suggested sources that haven't been accepted
    let attachmentsBySection: Record<string, {
      name: string;
      sourceType: 'file' | 'url';
      sourceUrl?: string;
      content: string;
      summary?: string;
      keyData?: Record<string, unknown>;
      resourceType?: string;
      sharedWithSolver: boolean;
    }[]> = {};
    if (resolvedContext === "curation") {
      try {
        const { data: attachments } = await adminClient
          .from('challenge_attachments')
          .select('section_key, file_name, source_type, source_url, url_title, extracted_text, extracted_summary, extracted_key_data, extraction_status, shared_with_solver, discovery_status, resource_type')
          .eq('challenge_id', challenge_id)
          .eq('extraction_status', 'completed')
          .in('discovery_status', ['accepted', 'manual']);

        if (attachments?.length) {
          for (const att of attachments) {
            if (!att.extracted_text) continue;
            if (!attachmentsBySection[att.section_key]) attachmentsBySection[att.section_key] = [];
            attachmentsBySection[att.section_key].push({
              name: att.source_type === 'url'
                ? (att.url_title || att.source_url || 'Web link')
                : (att.file_name || 'Unnamed file'),
              sourceType: att.source_type || 'file',
              sourceUrl: att.source_url ?? undefined,
              content: att.extracted_text.substring(0, 50000),
              summary: att.extracted_summary ?? undefined,
              keyData: att.extracted_key_data as Record<string, unknown> ?? undefined,
              resourceType: att.resource_type ?? undefined,
              sharedWithSolver: att.shared_with_solver ?? false,
            });
          }
        }
      } catch { /* attachments are optional — graceful fallback */ }
    }

    // ── Phase 7: Fetch context digest (gated by feature flag) ──────────────
    let contextDigestText = '';
    if (resolvedContext === "curation" && useContextIntelligence) {
      try {
        const { data: digest } = await adminClient
          .from('challenge_context_digest')
          .select('digest_text, source_count, key_facts')
          .eq('challenge_id', challenge_id)
          .maybeSingle();
        if (digest?.digest_text) {
          contextDigestText = `\n\nCONTEXT DIGEST (synthesized from ${digest.source_count} verified sources):\n${digest.digest_text}`;
          if (digest.key_facts) {
            contextDigestText += `\n\nVERIFIED KEY FACTS:\n${JSON.stringify(digest.key_facts, null, 2)}`;
          }
          contextDigestText += '\n';
        }
      } catch { /* digest is optional */ }
    }

    // ── Separate complexity from standard batch ─────────────
    const complexitySection = sectionsToReview.find(s => s.key === 'complexity');
    const standardSections = sectionsToReview.filter(s => s.key !== 'complexity');

    // ── FIX 8: Smart batching — solo sections get their own batch ──
    const batches: { key: string; desc: string }[][] = [];
    const soloSections = standardSections.filter(s => SOLO_SECTIONS.has(s.key));
    const regularSections = standardSections.filter(s => !SOLO_SECTIONS.has(s.key));

    // Solo sections get individual batches
    for (const solo of soloSections) {
      batches.push([solo]);
    }
    // Regular sections batched normally
    for (let i = 0; i < regularSections.length; i += MAX_BATCH_SIZE) {
      batches.push(regularSections.slice(i, i + MAX_BATCH_SIZE));
    }

    const allNewSections: any[] = [];

    // Change 2: Keep default model for complexity; compute per-batch model inside loop
    const defaultModel = globalConfig?.default_model || 'google/gemini-3-flash-preview';

    // Fire complexity assessment in parallel with standard batches
    const complexityPromise = complexitySection
      ? callComplexityAI(LOVABLE_API_KEY, getModelForRequest(['complexity'], globalConfig), challengeData, adminClient, clientContext, orgContext)
          .then((result) => {
            (result as any).prompt_source = useDbConfig ? "supervisor" : "default";
            allNewSections.push(result);
          })
          .catch((err: any) => {
            if (err.message === "RATE_LIMIT" || err.message === "PAYMENT_REQUIRED") throw err;
            const now = new Date().toISOString();
            allNewSections.push({
              section_key: "complexity",
              status: "warning",
              comments: ["Complexity assessment could not be completed. Please re-review individually."],
              reviewed_at: now,
            });
            console.error("Complexity AI call failed:", err);
          })
      : Promise.resolve();

    // Bug 7: Build context intelligence ONCE before the batch loop
    const contextIntel = buildContextIntelligence(challengeData, clientContext, orgContext);

    for (const batch of batches) {
      // Per-batch model selection: critical sections get premium model
      const batchKeys = batch.map(b => b.key);
      const modelToUse = getModelForRequest(batchKeys, globalConfig);

      // FIX 3: Build curated user prompt instead of raw JSON dump
      let userPromptInstruction: string;
      if (wave_action === 'generate') {
        userPromptInstruction = `The following section(s) are EMPTY. Analyze what content should be generated for each based on the challenge context. Set status to "generated" and provide specific comments about what the generated content should include. Focus on thorough analysis — the actual content generation will happen in a separate step.`;
      } else if (wave_action === 'review_and_enhance') {
        userPromptInstruction = `The following section(s) contain AI-generated content from a previous wave. Review them now that you have more context from later sections. Provide detailed comments on what needs improvement. Focus on thorough analysis — content improvement will happen in a separate step.`;
      } else if (section_key) {
        userPromptInstruction = `You are re-reviewing the "${section_key}" section of this challenge.

BEFORE REVIEWING, THINK:
1. What WAVE does this section belong to? What sections were established before it? What depends on it?
2. What ARCHETYPE is this challenge? (Data/ML, Enterprise Integration, Process Redesign, Strategic Advisory, Product/UX, Cybersecurity)
3. What would a TOP SOLVER need from this section to produce an excellent submission?
4. What is the BIGGEST RISK if this section is wrong or incomplete?

Then review for quality, consistency, correctness, and completeness — through the lens of "will this produce a winning challenge?"`;
      } else {
        userPromptInstruction = `You are performing a comprehensive review of this challenge for publication readiness.

BEFORE REVIEWING INDIVIDUAL SECTIONS, BUILD YOUR MENTAL MODEL:
1. **CHALLENGE ARCHETYPE**: What type of challenge is this? (Data/ML Pipeline, Enterprise Integration, Process Redesign, Strategic Advisory, Product/UX Innovation, Cybersecurity Assessment)
2. **MATURITY-COMPLEXITY PROFILE**: ${challengeData.maturity_level || 'unknown'} maturity at ${challengeData.complexity_level || 'unknown'} complexity → what does "good" look like for this profile?
3. **TARGET SOLVER**: Who would solve this? Individual expert? Small team? Organization? What domain expertise? What geography?
4. **STRATEGIC NARRATIVE**: Does the challenge tell a coherent story? Problem → Cause → Scope → Deliverables → Evaluation → Reward
5. **COMPETITIVE POSITION**: Would a top solver choose THIS challenge over alternatives on InnoCentive/HeroX/Kaggle?
6. **PUBLICATION RISK**: What is the single biggest risk to this challenge's success?

Carry these answers through every section review. Each comment should reflect your understanding of the whole, not just the part.`;
      }

      // FIX 3: Curated challenge data — strip irrelevant fields, structure clearly
      const { ai_section_reviews, targeting_filters, lc_review_required, ...relevantData } = challengeData;

      const eb = relevantData.extended_brief && typeof relevantData.extended_brief === 'object' ? relevantData.extended_brief : {};

      let userPrompt = `${userPromptInstruction}

BEFORE REVIEWING INDIVIDUAL SECTIONS, scan the entire challenge and answer these internally:
1. What ARCHETYPE is this challenge? (Data/ML, Enterprise Integration, Process Redesign, Strategic Advisory, Product/UX, Cybersecurity, Other)
2. What is the MATURITY-COMPLEXITY profile? (e.g., "POC at L3 complexity" → expect working prototypes, moderate timeline, mid-range rewards)
3. Who is the TARGET SOLVER? (Individual expert? Small team? Organization? What domain expertise?)
4. What is the STRATEGIC STORY? (Problem → Cause → Solution approach → Deliverables → Measurement → Reward)
5. Where are the BIGGEST RISKS to challenge success? (Scope creep? Unclear evaluation? Insufficient data? Unrealistic timeline?)

Use these answers to inform the DEPTH and FOCUS of your section-by-section review.

CHALLENGE DATA:
Title: ${relevantData.title || '(untitled)'}
Solution Type: ${relevantData.solution_type || '(not set)'}
Maturity Level: ${relevantData.maturity_level || '(not set)'}
Complexity: ${relevantData.complexity_level || '(not set)'} (Score: ${relevantData.complexity_score ?? 'N/A'})

Problem Statement:
${stripHtml(relevantData.problem_statement)}

Scope:
${stripHtml(relevantData.scope)}

Deliverables:
${jsonBrief(relevantData.deliverables)}

Expected Outcomes:
${jsonBrief(relevantData.expected_outcomes)}

Evaluation Criteria:
${jsonBrief(relevantData.evaluation_criteria)}

Phase Schedule:
${jsonBrief(relevantData.phase_schedule)}

Reward Structure:
${jsonBrief(relevantData.reward_structure)}

IP Model: ${relevantData.ip_model || '(not set)'}

Solver Expertise Requirements:
${jsonBrief(relevantData.solver_expertise || relevantData.solver_expertise_requirements)}

Eligibility: ${jsonBrief(relevantData.eligibility || relevantData.solver_eligibility_types)}
Visibility: ${jsonBrief(relevantData.visibility || relevantData.solver_visibility_types)}

Success Metrics & KPIs:
${jsonBrief(relevantData.success_metrics_kpis)}

Data & Resources:
${jsonBrief(relevantData.data_resources_provided)}

Domain Tags: ${jsonBrief(relevantData.domain_tags)}
Challenge Hook: ${stripHtml(relevantData.hook)}

Context & Background:
${stripHtml(relevantData.context_and_background || (eb as any).context_background)}

Root Causes: ${jsonBrief(relevantData.root_causes || (eb as any).root_causes)}
Affected Stakeholders: ${jsonBrief(relevantData.affected_stakeholders || (eb as any).affected_stakeholders)}
Current Deficiencies: ${jsonBrief(relevantData.current_deficiencies || (eb as any).current_deficiencies)}
Preferred Approach: ${jsonBrief(relevantData.preferred_approach || (eb as any).preferred_approach)}
Approaches NOT of Interest: ${jsonBrief(relevantData.approaches_not_of_interest || (eb as any).approaches_not_of_interest)}
Submission Guidelines: ${jsonBrief(relevantData.submission_guidelines)}
Solution Type: ${jsonBrief(relevantData.solution_type)}

${additionalData}`;

      // Phase 7: Inject context digest before reference materials
      if (contextDigestText) {
        userPrompt += contextDigestText;
      }

      // Gap 8: When context intelligence flag is ON, Pass 1 gets digest-only (no per-section attachments).
      // Attachments are reserved for Pass 2 with tiered injection.
      if (!useContextIntelligence && Object.keys(attachmentsBySection).length > 0) {
        let attachmentBlock = '\n\nREFERENCE MATERIALS (documents and web links provided by the seeking organization):\n';
        const batchKeySet = new Set(batch.map(b => b.key));
        for (const [sk, refs] of Object.entries(attachmentsBySection)) {
          if (!batchKeySet.has(sk)) continue;
          for (const ref of refs) {
            const typeTag = ref.sourceType === 'url' ? 'WEB PAGE' : 'DOCUMENT';
            const shareTag = ref.sharedWithSolver ? 'SHARED WITH SOLVERS' : 'AI-ONLY (solvers cannot see this)';
            attachmentBlock += `\n--- [${typeTag}] ${ref.name} [${sk}] [${shareTag}] ---\n`;
            if (ref.sourceType === 'url' && ref.sourceUrl) {
              attachmentBlock += `Source: ${ref.sourceUrl}\n`;
            }
            if (ref.summary) {
              attachmentBlock += `AI Summary: ${ref.summary}\n`;
            }
            if (ref.keyData && Object.keys(ref.keyData).length > 0) {
              attachmentBlock += `Key Data: ${JSON.stringify(ref.keyData)}\n`;
            }
            attachmentBlock += ref.content + '\n';
          }
        }
        attachmentBlock += `
REFERENCE MATERIAL USAGE RULES:
- Use ALL materials (files, web pages, shared and private) to inform your review and suggestions.
- SHARED materials: Solvers will also see these. You may reference them directly in section content.
- AI-ONLY materials: Solvers will NOT see these. Extract key data INTO the section text itself.
- WEB PAGES: These represent the org's public presence, industry context, or technical documentation.

GROUNDING RULE (CRITICAL):
- When your suggestion includes a specific claim, data point, or statistic, it MUST be traceable to the Context Digest, a Reference Material, or the challenge's own content.
- If you infer or estimate a value that is NOT directly stated in any source, you MUST tag it with [INFERENCE].
- Never fabricate statistics, benchmarks, or proper nouns.
`;
        userPrompt += attachmentBlock;
      }


      let systemPrompt: string;
      // Build context intelligence preamble
      // Bug 7: contextIntel is now built once before the batch loop (see below line ~1559)
      // It is still used here per-batch for system prompt construction
      if (useDbConfig && dbConfigMap) {
        const batchConfigs = batch.map(b => dbConfigMap!.get(b.key)!).filter(Boolean);
        systemPrompt = contextIntel + '\n\n' + buildSmartBatchPrompt(batchConfigs, resolvedContext, masterDataOptions, clientContext, challengeData);
      } else {
        systemPrompt = contextIntel + '\n\n' + buildFallbackSystemPrompt(batch, resolvedContext);
        // Append master data constraints for fallback mode too
        if (Object.keys(masterDataOptions).length > 0) {
          const mdLines: string[] = ["\n\n## Master Data Constraints"];
          for (const key of batch.map(b => b.key)) {
            const opts = masterDataOptions[key];
            if (opts?.length) {
              mdLines.push(`For "${key}": allowed values are [${opts.map(o => `"${o.code}" (${o.label})`).join(", ")}]. You MUST only suggest values from this list.`);
            }
          }
          if (mdLines.length > 1) {
            systemPrompt += mdLines.join("\n");
          }
        }
      }

      // Inject client-provided challenge context (todaysDate, rateCard, solutionType)
      if (clientContext && typeof clientContext === 'object') {
        const contextLines: string[] = ["\n\n## Challenge Context (Client-Provided)"];
        if (clientContext.todaysDate) contextLines.push(`Today's date: ${clientContext.todaysDate}. All dates in phase schedules MUST be in the future relative to this date.`);
        if (clientContext.solutionType) contextLines.push(`Solution type: ${clientContext.solutionType}`);
        if (clientContext.maturityLevel) contextLines.push(`Maturity level: ${clientContext.maturityLevel}`);
        if (clientContext.complexityLevel) contextLines.push(`Complexity level: ${clientContext.complexityLevel}`);
        if (clientContext.seekerSegment) contextLines.push(`Seeker segment: ${clientContext.seekerSegment}`);
        if (clientContext.rateCard) {
          const rc = clientContext.rateCard;
          contextLines.push(`Rate card: effort rate floor $${rc.effortRateFloor}/hr, reward floor $${rc.rewardFloorAmount}, Big4 multiplier ${rc.big4BenchmarkMultiplier}x`);
          if (rc.rewardCeiling) contextLines.push(`Reward ceiling: $${rc.rewardCeiling}`);
        }
        if (clientContext.totalPrizePool) contextLines.push(`Total prize pool: $${clientContext.totalPrizePool}`);
        if (clientContext.estimatedEffortHours) {
          contextLines.push(`Estimated effort: ${clientContext.estimatedEffortHours.min}–${clientContext.estimatedEffortHours.max} hours`);
        }
        if (contextLines.length > 1) {
          systemPrompt += contextLines.join("\n");
        }
      }

      // Get batch-specific configs for Pass 2 enrichment
      const batchSectionConfigs = useDbConfig && dbConfigMap
        ? batch.map(b => dbConfigMap!.get(b.key)!).filter(Boolean)
        : [];

      const promptSource = useDbConfig ? "supervisor" : "default";
      try {
        // ═══ TWO-PASS: Pass 1 (Analyze) + Pass 2 (Rewrite) ═══
        const batchResults = await callAIBatchTwoPass(
          LOVABLE_API_KEY,
          modelToUse,
          systemPrompt,
          userPrompt,
          batch.map(s => s.key),
          challengeData,
          wave_action || 'review',
          clientContext,
          batchSectionConfigs,
          skip_analysis === true,
          provided_comments,
          masterDataOptions,
          orgContext,
          attachmentsBySection,
          contextDigestText,
          useContextIntelligence,
        );
        // Tag each result with prompt source
        for (const r of batchResults) {
          (r as any).prompt_source = promptSource;
        }
        // pass1_only: strip suggestion field and tag with phase: 'triage'
        if (pass1_only === true) {
          for (const r of batchResults) {
            delete (r as any).suggestion;
            (r as any).phase = 'triage';
          }
        }
        allNewSections.push(...batchResults);
      } catch (err: any) {
        if (err.message === "RATE_LIMIT") {
          return new Response(
            JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded." } }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (err.message === "PAYMENT_REQUIRED") {
          return new Response(
            JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // If a batch fails, mark all its sections as warning
        const now = new Date().toISOString();
        for (const sec of batch) {
          allNewSections.push({
            section_key: sec.key,
            status: "warning",
            comments: [{ text: "Review could not be completed. Please re-review individually.", type: "warning", field: null, reasoning: null }],
            reviewed_at: now,
          });
        }
        console.error("Batch AI call failed:", err);
      }
    }

    // Wait for complexity to finish
    await complexityPromise;

    // Merge with existing reviews and persist (skip in preview mode)
    let merged = allNewSections;
    if (!isPreviewMode) {
      const existingReviews: any[] = Array.isArray(challengeData.ai_section_reviews)
        ? challengeData.ai_section_reviews
        : [];

      const newKeys = new Set(allNewSections.map((s: any) => s.section_key));
      merged = [
        ...existingReviews.filter((r: any) => !newKeys.has(r.section_key)),
        ...allNewSections,
      ];

      const { error: updateError } = await adminClient
        .from("challenges")
        .update({ ai_section_reviews: merged })
        .eq("id", challenge_id);

      if (updateError) {
        console.error("Failed to persist AI reviews:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { sections: allNewSections, all_reviews: merged } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("review-challenge-sections error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
