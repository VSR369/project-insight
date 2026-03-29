/**
 * review-challenge-sections — Role-aware per-section AI review.
 * Returns granular pass/warning/needs_revision per section with comments.
 * Supports single-section mode via optional `section_key` parameter.
 * Supports role contexts: 'intake', 'spec', 'curation', 'legal', 'finance', 'evaluation'.
 * Loads config from ai_review_section_config DB table; falls back to hardcoded defaults.
 * Persists results to challenges.ai_section_reviews.
 *
 * Batching: splits sections into batches of MAX_BATCH_SIZE to prevent LLM output truncation.
 * Master data: injects allowed option codes into prompt for master-data-backed sections.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildConfiguredBatchPrompt, type SectionConfig } from "./promptTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_BATCH_SIZE = 12;

/* ── Hardcoded fallback section definitions ──────────────── */

const CURATION_SECTIONS = [
  { key: "problem_statement", desc: "Clarity, specificity, context, why it matters, what has been tried" },
  { key: "scope", desc: "Bounded, in-scope vs out-of-scope clarity, no ambiguity" },
  { key: "deliverables", desc: "Measurable, concrete, complete list with acceptance criteria" },
  { key: "evaluation_criteria", desc: "Clear criteria with proper weights summing to 100%, aligned with deliverables" },
  { key: "reward_structure", desc: "Fair, well-structured, matches challenge complexity" },
  { key: "phase_schedule", desc: "Realistic timelines, sufficient for the scope and complexity" },
  { key: "submission_guidelines", desc: "Clear format, content, and process requirements" },
  { key: "eligibility", desc: "Specific qualifications, no overly broad or restrictive criteria" },
  { key: "complexity", desc: "Properly assessed with justified parameter values" },
  { key: "ip_model", desc: "Clear IP ownership, licensing, and transfer terms" },
  { key: "legal_docs", desc: "Required legal documents attached and reviewed" },
  { key: "escrow_funding", desc: "Escrow funded (if required)" },
  { key: "maturity_level", desc: "Set and consistent with challenge depth" },
  { key: "hook", desc: "Engaging, concise challenge hook that motivates solvers" },
  { key: "domain_tags", desc: "Relevant domain tags for discoverability and solver matching" },
  { key: "domain_tags", desc: "Relevant domain tags for discoverability and solver matching" },
  { key: "visibility", desc: "Solver visibility types properly configured" },
  { key: "solver_expertise", desc: "Required solver expertise areas, sub-domains, and specialities" },
  // Extended Brief subsections
  { key: "context_and_background", desc: "Comprehensive context for external solvers — operational setting, prior attempts" },
  { key: "root_causes", desc: "Discrete root causes inferred from problem statement — phrase labels, max 8" },
  { key: "affected_stakeholders", desc: "Stakeholder table with name, role, impact, adoption challenge" },
  { key: "current_deficiencies", desc: "Current-state observation phrases — factual, not aspirational, max 10" },
  { key: "preferred_approach", desc: "Seeker's strategic preferences — never rewrite human content" },
  { key: "approaches_not_of_interest", desc: "Human-only section — approaches to exclude" },
];

const INTAKE_SECTIONS = [
  { key: "problem_statement", desc: "Clarity of the business problem: is it specific, well-bounded, and understandable?" },
  { key: "scope", desc: "Solution expectations: are the desired outcomes clearly described?" },
  { key: "beneficiaries_mapping", desc: "Stakeholder mapping: are affected parties and expected benefits identified?" },
  { key: "budget_reasonableness", desc: "Budget range: is it reasonable for the described problem scope?" },
];

const SPEC_SECTIONS = [
  { key: "problem_statement", desc: "Clarity, specificity, solver-readiness — would a solver understand the problem?" },
  { key: "expected_outcomes", desc: "Clear, measurable outcomes solvers should deliver" },
  { key: "scope", desc: "Bounded, in-scope vs out-of-scope clarity for solvers" },
  { key: "beneficiaries_mapping", desc: "Stakeholders and beneficiaries clearly identified" },
  { key: "description", desc: "Detailed enough for solvers to understand context and constraints" },
  { key: "deliverables", desc: "Measurable, concrete, complete list with acceptance criteria" },
  { key: "evaluation_criteria", desc: "Clear criteria with proper weights summing to 100%, aligned with deliverables" },
  { key: "hook", desc: "Engaging, concise, motivating for potential solvers" },
  { key: "ip_model", desc: "Clear IP ownership, licensing, and transfer terms" },
];

type RoleContext = "intake" | "spec" | "curation" | "legal" | "finance" | "evaluation";

const VALID_CONTEXTS: RoleContext[] = ["intake", "spec", "curation", "legal", "finance", "evaluation"];

function getFallbackSections(roleContext: RoleContext) {
  switch (roleContext) {
    case "intake": return INTAKE_SECTIONS;
    case "spec": return SPEC_SECTIONS;
    case "curation": return CURATION_SECTIONS;
    default: return [];
  }
}

function buildFallbackSystemPrompt(sections: { key: string; desc: string }[], roleContext: RoleContext): string {
  const sectionList = sections.map((s, i) => `${i + 1}. ${s.key} - ${s.desc}`).join("\n");

  const roleGuidance = roleContext === "intake"
    ? `You are reviewing an intake brief submitted by an Account Manager or Challenge Requestor.
Focus on:
- **Clarity for downstream creators**: Will a Challenge Creator/Architect understand the problem well enough to draft a full specification?
- **Completeness**: Are the key business parameters (problem, expectations, budget, stakeholders) adequately described?
- **Actionability**: Can the next team member start working without needing clarification?`
    : roleContext === "spec"
    ? `You are reviewing an AI-generated challenge specification from the Creator/Architect perspective.
Focus on:
- **Solver readiness**: Would a solver clearly understand what is expected?
- **Technical accuracy**: Are deliverables, evaluation criteria, and scope well-defined?
- **Consistency**: Do sections align with each other (deliverables match criteria, scope matches problem)?`
    : `You are an expert innovation challenge quality reviewer performing a deep, contextual review.
For each section, assess:
- **Content quality**: Is the language clear, specific, unambiguous?
- **Completeness**: Are all required aspects covered?
- **Industry-appropriateness**: Does the content fit the stated industry/domain?
- **Cross-section consistency**: Do deliverables align with evaluation criteria?
- **Actionability for solvers**: Would a solver clearly understand what is expected?
- **Maturity-level fit**: Is the depth appropriate for the stated maturity level?`;

  return `${roleGuidance}

For each section provide:
- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has specific issues that must be fixed)
- comments: 1-3 specific, actionable improvement instructions. For "pass" status, provide 0-1 optional enhancement suggestions.

Sections to review:
${sectionList}

Every comment MUST be phrased as an actionable improvement instruction.`;
}

/* ── Master data definitions for prompt injection ──────── */

/** Sections that need master data options injected into the prompt */
const MASTER_DATA_SECTION_TABLES: Record<string, string> = {
  eligibility: "md_solver_eligibility",
  complexity: "md_challenge_complexity",
};

/** Static master data for sections that don't have DB tables */
const STATIC_MASTER_DATA: Record<string, { code: string; label: string }[]> = {
  visibility: [
    { code: "anonymous", label: "Anonymous" },
    { code: "named", label: "Named" },
    { code: "verified", label: "Verified" },
  ],
  ip_model: [
    { code: "IP-EA", label: "Full IP Transfer (Exclusive Assignment)" },
    { code: "IP-NEL", label: "Non-Exclusive License" },
    { code: "IP-EL", label: "Exclusive License" },
    { code: "IP-JO", label: "Joint Ownership" },
    { code: "IP-SR", label: "Solver Retains IP" },
  ],
  maturity_level: [
    { code: "BLUEPRINT", label: "Blueprint / Concept" },
    { code: "POC", label: "Proof of Concept" },
    { code: "PROTOTYPE", label: "Prototype" },
    { code: "PILOT", label: "Pilot" },
    { code: "PRODUCTION", label: "Production-Ready" },
  ],
  challenge_visibility: [
    { code: "public", label: "Public" },
    { code: "private", label: "Private" },
    { code: "invite_only", label: "Invite Only" },
  ],
};

/**
 * Fetch dynamic master data from DB for sections that need it.
 */
async function fetchMasterDataOptions(
  adminClient: any,
): Promise<Record<string, { code: string; label: string }[]>> {
  const result: Record<string, { code: string; label: string }[]> = { ...STATIC_MASTER_DATA };

  // Fetch solver eligibility tiers
  const { data: eligibilityData } = await adminClient
    .from("md_solver_eligibility")
    .select("code, name")
    .eq("is_active", true)
    .order("display_order");
  if (eligibilityData?.length) {
    result.eligibility = eligibilityData.map((r: any) => ({ code: r.code, label: r.name }));
  }

  // Fetch complexity levels
  const { data: complexityData } = await adminClient
    .from("md_challenge_complexity")
    .select("code, name")
    .eq("is_active", true)
    .order("display_order");
  if (complexityData?.length) {
    result.complexity = complexityData.map((r: any) => ({ code: r.code, label: r.name }));
  }

  return result;
}

/**
 * Call AI gateway for a batch of sections.
 */
async function callAIBatch(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  sectionKeys: string[],
): Promise<{ section_key: string; status: string; comments: string[]; reviewed_at: string }[]> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "review_sections",
            description: "Return per-section review results.",
            parameters: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_key: { type: "string" },
                      status: { type: "string", enum: ["pass", "warning", "needs_revision"] },
                      comments: { type: "array", items: { type: "string" } },
                    },
                    required: ["section_key", "status", "comments"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["sections"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "review_sections" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

  const parsed = JSON.parse(toolCall.function.arguments);
  const now = new Date().toISOString();
  const sections = (parsed.sections ?? []).map((s: any) => {
    // Normalize: pass with comments → warning (prevent confusing UI)
    const hasComments = Array.isArray(s.comments) && s.comments.length > 0;
    const normalizedStatus = (s.status === 'pass' && hasComments) ? 'warning' : s.status;
    return {
      ...s,
      status: normalizedStatus,
      comments: Array.isArray(s.comments) ? s.comments : [],
      reviewed_at: now,
    };
  });

  // Backfill skipped sections as "warning" (not misleading "pass")
  const returnedKeys = new Set(sections.map((s: any) => s.section_key));
  for (const key of sectionKeys) {
    if (!returnedKeys.has(key)) {
      sections.push({
        section_key: key,
        status: "warning",
        comments: ["Review could not be completed for this section. Please re-review individually."],
        reviewed_at: now,
      });
    }
  }

  return sections;
}

/**
 * Call AI gateway for complexity assessment — separate from batch review.
 * Uses full challenge context + master complexity params to produce per-parameter ratings.
 */
async function callComplexityAI(
  apiKey: string,
  model: string,
  challengeData: any,
  adminClient: any,
): Promise<{ section_key: string; status: string; comments: string[]; reviewed_at: string; suggested_complexity: Record<string, { rating: number; justification: string; evidence_sections: string[] }> }> {
  // Fetch master complexity params
  const { data: paramsData, error: paramsError } = await adminClient
    .from("master_complexity_params")
    .select("param_key, name, weight, description")
    .eq("is_active", true)
    .order("display_order");

  if (paramsError || !paramsData?.length) {
    const now = new Date().toISOString();
    return {
      section_key: "complexity",
      status: "warning",
      comments: ["No complexity parameters configured. Please set up master_complexity_params."],
      reviewed_at: now,
      suggested_complexity: {},
    };
  }

  const COMPLEXITY_SYSTEM_PROMPT = `You are an expert innovation challenge complexity assessor. Your job is to analyze the full content of an innovation challenge and rate its complexity across multiple dimensions.

For each complexity parameter, you must:
1. Carefully read the problem statement, scope, deliverables, evaluation criteria, reward structure, IP model, maturity level, eligibility requirements, domain tags, and phase schedule.
2. Consider the SPECIFIC content — not generic defaults. Each parameter must be rated independently based on what the challenge actually requires.
3. Rate each parameter on a scale of 1-10 where:
   - 1-2: Very Low complexity — straightforward, well-understood domain, minimal risk
   - 3-4: Low complexity — some nuance but largely standard approaches apply
   - 5-6: Medium complexity — requires meaningful expertise, moderate uncertainty
   - 7-8: High complexity — significant technical depth, cross-domain challenges, tight constraints
   - 9-10: Very High complexity — cutting-edge, high uncertainty, extreme constraints

CRITICAL RULES:
- Do NOT give the same rating to all parameters. Each parameter measures a DIFFERENT dimension and must be assessed independently.
- Base your ratings on EVIDENCE from the challenge content, not assumptions.
- If a section is missing or empty, factor that into your assessment (e.g., missing scope increases uncertainty).
- Consider cross-section interactions: tight timelines + high technical novelty = amplified complexity.
- For each rating, cite which challenge sections (e.g., problem_statement, deliverables, phase_schedule) informed your assessment.
- Frame guideline_comments as helpful guidance for curators, e.g. "Consider rating technical_novelty 3-4 because..."`;

  const paramDescriptions = paramsData.map(
    (p: any) => `- **${p.param_key}** (${p.name}): ${p.description ?? "No description"} [weight: ${(p.weight * 100).toFixed(0)}%]`
  ).join("\n");

  const userPrompt = `Analyze this innovation challenge and rate each complexity parameter independently (1-10).

COMPLEXITY PARAMETERS TO RATE:
${paramDescriptions}

FULL CHALLENGE CONTENT:
${JSON.stringify(challengeData, null, 2)}

Rate each parameter based on the actual challenge content. Do NOT give the same score to all parameters — each dimension is different.
For each parameter, cite which sections of the challenge data informed your rating in the evidence_sections array.
Also provide 2-4 guideline_comments that help curators understand the key complexity drivers.`;

  // Build tool schema dynamically
  const paramProperties: Record<string, any> = {};
  const requiredParams: string[] = [];
  for (const p of paramsData) {
    paramProperties[p.param_key] = {
      type: "object",
      properties: {
        rating: { type: "integer", minimum: 1, maximum: 10, description: `Complexity rating for ${p.name} (1=very low, 10=very high)` },
        justification: { type: "string", description: `Brief justification for the ${p.name} rating based on challenge content` },
        evidence_sections: { type: "array", items: { type: "string" }, description: `Challenge sections that informed this rating (e.g. "problem_statement", "deliverables")` },
      },
      required: ["rating", "justification", "evidence_sections"],
      additionalProperties: false,
    };
    requiredParams.push(p.param_key);
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: COMPLEXITY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "assess_complexity",
            description: "Return per-parameter complexity ratings with justifications and evidence.",
            parameters: {
              type: "object",
              properties: {
                ...paramProperties,
                guideline_comments: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-4 guideline comments helping curators understand complexity drivers. Each should reference specific parameters and suggest rating ranges.",
                },
              },
              required: [...requiredParams, "guideline_comments"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "assess_complexity" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    const errText = await response.text();
    console.error("Complexity AI gateway error:", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured complexity output");

  const parsed = JSON.parse(toolCall.function.arguments);
  const now = new Date().toISOString();

  // Extract guideline comments
  const guidelineComments: string[] = Array.isArray(parsed.guideline_comments) ? parsed.guideline_comments : [];

  // Extract per-parameter ratings
  const ratings: Record<string, { rating: number; justification: string; evidence_sections: string[] }> = {};
  for (const p of paramsData) {
    const r = parsed[p.param_key];
    if (r) {
      ratings[p.param_key] = {
        rating: Math.max(1, Math.min(10, r.rating ?? 5)),
        justification: r.justification ?? "",
        evidence_sections: Array.isArray(r.evidence_sections) ? r.evidence_sections : [],
      };
    }
  }

  return {
    section_key: "complexity",
    status: guidelineComments.length > 0 ? "warning" : "pass",
    comments: guidelineComments,
    reviewed_at: now,
    suggested_complexity: ratings,
  };
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

    const { challenge_id, section_key, role_context, context: clientContext } = await req.json();
    if (!challenge_id) {
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
    const modelToUse = globalConfig?.default_model || "google/gemini-3-flash-preview";
    const useDbConfig = dbConfigs.length > 0;

    // Build section list — from DB config or fallback
    let sectionsToReview: { key: string; desc: string }[];
    let dbConfigMap: Map<string, SectionConfig> | null = null;

    if (useDbConfig) {
      dbConfigMap = new Map(dbConfigs.map(c => [c.section_key, c]));
      const allKeys = dbConfigs.map(c => ({ key: c.section_key, desc: c.section_description || c.section_label }));
      sectionsToReview = section_key
        ? allKeys.filter(s => s.key === section_key)
        : allKeys;
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

    // ── Fetch challenge data based on context ─────────────────
    const challengeFields = resolvedContext === "intake"
      ? "title, problem_statement, scope, reward_structure, phase_schedule, extended_brief, ai_section_reviews"
      : resolvedContext === "legal"
      ? "title, ip_model, maturity_level, eligibility, ai_section_reviews"
      : resolvedContext === "finance"
      ? "title, reward_structure, phase_schedule, ai_section_reviews"
      : resolvedContext === "evaluation"
      ? "title, evaluation_criteria, deliverables, complexity_level, ai_section_reviews"
      : "title, problem_statement, scope, description, deliverables, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, eligibility_model, visibility, challenge_visibility, phase_schedule, complexity_score, complexity_level, complexity_parameters, ai_section_reviews, hook, extended_brief, domain_tags, solver_expertise_requirements, solver_eligibility_types, solver_visibility_types";

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

    let challengeData = challengeResult.data;

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

    // Build context-specific data sections for user prompt
    let additionalData = "";
    let resultIdx = 1;

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

    // ── Separate complexity from standard batch ─────────────
    const complexitySection = sectionsToReview.find(s => s.key === 'complexity');
    const standardSections = sectionsToReview.filter(s => s.key !== 'complexity');

    // ── Batch-split standard sections for AI calls ───────────
    const batches: { key: string; desc: string }[][] = [];
    for (let i = 0; i < standardSections.length; i += MAX_BATCH_SIZE) {
      batches.push(standardSections.slice(i, i + MAX_BATCH_SIZE));
    }

    const allNewSections: any[] = [];

    // Fire complexity assessment in parallel with standard batches
    const complexityPromise = complexitySection
      ? callComplexityAI(LOVABLE_API_KEY, modelToUse, challengeData, adminClient)
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

    for (const batch of batches) {
      const userPrompt = section_key
        ? `Review ONLY the "${section_key}" section of this ${contextLabel}:\n\nDATA: ${JSON.stringify(challengeData, null, 2)}${additionalData}`
        : `Review each section of this ${contextLabel}:\n\nDATA: ${JSON.stringify(challengeData, null, 2)}${additionalData}`;

      let systemPrompt: string;
      if (useDbConfig && dbConfigMap) {
        const activeConfigs = batch
          .map(s => dbConfigMap!.get(s.key))
          .filter((c): c is SectionConfig => !!c);
        systemPrompt = buildConfiguredBatchPrompt(activeConfigs, resolvedContext, masterDataOptions);
      } else {
        systemPrompt = buildFallbackSystemPrompt(batch, resolvedContext);
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

      const promptSource = useDbConfig ? "supervisor" : "default";
      try {
        const batchResults = await callAIBatch(
          LOVABLE_API_KEY,
          modelToUse,
          systemPrompt,
          userPrompt,
          batch.map(s => s.key),
        );
        // Tag each result with prompt source
        for (const r of batchResults) {
          (r as any).prompt_source = promptSource;
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
            comments: ["Review could not be completed. Please re-review individually."],
            reviewed_at: now,
          });
        }
        console.error("Batch AI call failed:", err);
      }
    }

    // Wait for complexity to finish
    await complexityPromise;

    // Merge with existing reviews
    const existingReviews: any[] = Array.isArray(challengeResult.data.ai_section_reviews)
      ? challengeResult.data.ai_section_reviews
      : [];

    const newKeys = new Set(allNewSections.map((s: any) => s.section_key));
    const merged = [
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
