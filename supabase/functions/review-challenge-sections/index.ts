/**
 * review-challenge-sections — Role-aware per-section AI review.
 * Returns granular pass/warning/needs_revision per section with comments.
 * Supports single-section mode via optional `section_key` parameter.
 * Supports role contexts: 'intake', 'spec', 'curation', 'legal', 'finance', 'evaluation'.
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
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildConfiguredBatchPrompt, buildSmartBatchPrompt, buildPass2SystemPrompt, getSuggestionFormatInstruction, getSectionFormatType, sanitizeTableSuggestion, type SectionConfig } from "./promptTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_BATCH_SIZE = 12;

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

/* ── Change 4: Clean literal escape sequences from AI output ── */
function cleanAIOutput(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/* ── Hardcoded fallback section definitions ──────────────── */

const CURATION_SECTIONS = [
  // Wave 1: Foundation
  { key: "problem_statement", desc: "Clarity, specificity, context, why it matters, what has been tried" },
  { key: "scope", desc: "Bounded, in-scope vs out-of-scope clarity, no ambiguity" },
  { key: "expected_outcomes", desc: "Clear, measurable outcomes solvers should deliver" },
  { key: "context_and_background", desc: "Comprehensive context for external solvers — operational setting, prior attempts" },
  { key: "success_metrics_kpis", desc: "Quantitative KPIs aligned with expected outcomes and deliverables" },
  // Wave 2: Enrichment
  { key: "solution_type", desc: "Multi-select solution types from md_solution_types — return JSON array of matching codes" },
  { key: "root_causes", desc: "Discrete root causes inferred from problem statement — phrase labels, max 8" },
  { key: "affected_stakeholders", desc: "Stakeholder table with name, role, impact, adoption challenge" },
  { key: "current_deficiencies", desc: "Current-state observation phrases — factual, not aspirational, max 10" },
  { key: "preferred_approach", desc: "Seeker's strategic preferences — never rewrite human content" },
  { key: "approaches_not_of_interest", desc: "Human-only section — approaches to exclude" },
  // Wave 3: Complexity
  { key: "deliverables", desc: "Measurable, concrete, complete list with acceptance criteria" },
  { key: "maturity_level", desc: "Set and consistent with challenge depth" },
  { key: "complexity", desc: "Properly assessed with justified parameter values" },
  { key: "data_resources_provided", desc: "Datasets, APIs, documentation, and resources available to solvers" },
  // Wave 4: Solvers & Timeline
  { key: "solver_expertise", desc: "Required solver expertise areas, sub-domains, and specialities" },
  { key: "eligibility", desc: "Specific qualifications, no overly broad or restrictive criteria" },
  { key: "phase_schedule", desc: "Realistic timelines, sufficient for the scope and complexity" },
  { key: "submission_guidelines", desc: "Clear format, content, and process requirements" },
  // Wave 5: Evaluation & Commercial
  { key: "evaluation_criteria", desc: "Clear criteria with proper weights summing to 100%, aligned with deliverables" },
  { key: "reward_structure", desc: "Fair, well-structured, matches challenge complexity" },
  { key: "ip_model", desc: "Clear IP ownership, licensing, and transfer terms" },
  { key: "legal_docs", desc: "Required legal documents attached and reviewed" },
  { key: "escrow_funding", desc: "Escrow funded (if required)" },
  // Wave 6: Presentation
  { key: "hook", desc: "Engaging, concise challenge hook that motivates solvers" },
  { key: "visibility", desc: "Solver visibility types properly configured" },
  { key: "domain_tags", desc: "Relevant domain tags for discoverability and solver matching" },
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

For each section provide ANALYSIS ONLY (no suggestion field):
- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has specific issues that must be fixed)
- comments: 1-3 specific, actionable improvement instructions. For "pass" status, provide 1-2 "strength" comments.

Do NOT include a "suggestion" field. Focus entirely on thorough analysis.

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

/* ══════════════════════════════════════════════════════════════
 * PASS 1: ANALYZE — Generate comments, status, guidelines.
 * No suggestion field in the tool schema.
 * ══════════════════════════════════════════════════════════════ */

async function callAIPass1Analyze(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  sectionKeys: string[],
): Promise<{ section_key: string; status: string; comments: any[]; reviewed_at: string; guidelines: string[]; cross_section_issues: any[] }[]> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "review_sections",
            description: "Return per-section analysis: status, typed comments, guidelines, cross-section issues. Do NOT include a suggestion field — improved content will be generated in a separate step.",
            parameters: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_key: { type: "string", description: "The section identifier" },
                      status: {
                        type: "string",
                        enum: ["pass", "warning", "needs_revision", "generated"],
                        description: "pass = content is good, warning = minor issues, needs_revision = errors found, generated = section was empty and needs content creation",
                      },
                      comments: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string", description: "Clear, specific comment referencing challenge details" },
                            type: {
                              type: "string",
                              enum: ["error", "warning", "suggestion", "best_practice", "strength"],
                              description: "error = must fix, warning = should improve, suggestion = nice-to-have, best_practice = industry standard reference, strength = positive reinforcement",
                            },
                            field: { type: "string", description: "Specific field name this comment applies to, or null for general" },
                            reasoning: { type: "string", description: "Why this matters, referencing other sections for cross-consistency" },
                          },
                          required: ["text", "type"],
                        },
                        description: "Multi-tier feedback: errors, warnings, suggestions, best practices, AND strengths. For 'pass' sections, include 1-2 strength comments.",
                      },
                      guidelines: {
                        type: "array",
                        items: { type: "string" },
                        description: "1-3 domain-specific guidelines based on challenge context and solution type.",
                      },
                      cross_section_issues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            related_section: { type: "string" },
                            issue: { type: "string" },
                            suggested_resolution: { type: "string" },
                          },
                        },
                        description: "Cross-section consistency issues found during review.",
                      },
                    },
                    required: ["section_key", "status", "comments"],
                  },
                },
              },
              required: ["sections"],
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
    console.error("AI gateway error (Pass 1):", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();

  // Token usage logging — Pass 1
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'pass1_analyze',
    sectionKeys,
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output (Pass 1)");

  const parsed = JSON.parse(toolCall.function.arguments);
  const now = new Date().toISOString();
  const sections = (parsed.sections ?? []).map((s: any) => {
    // Normalize comments
    const rawComments = Array.isArray(s.comments) ? s.comments : [];
    const comments = rawComments.map((c: any) => {
      if (typeof c === 'string') return { text: c, type: 'warning' as const, field: null, reasoning: null };
      return {
        text: c.text || c.comment || String(c),
        type: c.type || (c.severity === 'error' ? 'error' : c.severity === 'suggestion' ? 'suggestion' : 'warning'),
        field: c.field || null,
        reasoning: c.reasoning || null,
      };
    });

    // Normalize status
    const hasHighSeverity = comments.some((c: any) => c.type === 'error' || c.type === 'warning');
    const normalizedStatus = (s.status === 'pass' && hasHighSeverity) ? 'warning' : s.status;

    return {
      section_key: s.section_key,
      status: normalizedStatus,
      comments,
      guidelines: Array.isArray(s.guidelines) ? s.guidelines : [],
      cross_section_issues: Array.isArray(s.cross_section_issues) ? s.cross_section_issues : [],
      reviewed_at: now,
    };
  });

  // Backfill skipped sections
  const returnedKeys = new Set(sections.map((s: any) => s.section_key));
  for (const key of sectionKeys) {
    if (!returnedKeys.has(key)) {
      sections.push({
        section_key: key,
        status: "warning",
        comments: [{ text: "Review could not be completed for this section. Please re-review individually.", type: "warning", field: null, reasoning: null }],
        guidelines: [],
        cross_section_issues: [],
        reviewed_at: now,
      });
    }
  }

  return sections;
}

/* ══════════════════════════════════════════════════════════════
 * PASS 2: REWRITE — Generate suggestions for sections that need them.
 * Receives Pass 1 comments as explicit input. LLM focuses 100% on rewriting.
 * Now uses enriched buildPass2SystemPrompt with section-specific config (Change 1).
 * ══════════════════════════════════════════════════════════════ */

async function callAIPass2Rewrite(
  apiKey: string,
  model: string,
  pass1Results: any[],
  challengeData: any,
  waveAction: string,
  clientContext?: any,
  sectionConfigs?: SectionConfig[],
): Promise<Map<string, string>> {
  // Filter to sections that need suggestions
  const sectionsNeedingSuggestion = pass1Results.filter((r: any) => {
    const hasActionableComments = r.comments.some(
      (c: any) => c.type === 'error' || c.type === 'warning' || c.type === 'suggestion'
    );
    // Include sections that: have actionable comments, need generation, need revision,
    // OR are in a 'warning'/'pass' state but have no current content (empty sections needing generation)
    const sectionContent = challengeData[r.section_key];
    const isEmpty = !sectionContent || (typeof sectionContent === 'string' && sectionContent.trim().length === 0);
    return hasActionableComments || r.status === 'generated' || r.status === 'needs_revision' || r.status === 'warning' || waveAction === 'generate' || (isEmpty && r.status !== 'pass');
  });

  if (sectionsNeedingSuggestion.length === 0) {
    return new Map();
  }

  // Extended brief subsection keys and field map for nested content lookup
  const EXTENDED_BRIEF_KEYS = new Set([
    'context_and_background', 'root_causes', 'affected_stakeholders',
    'current_deficiencies', 'preferred_approach', 'approaches_not_of_interest',
  ]);
  const EB_FIELD_MAP: Record<string, string> = {
    context_and_background: 'context_background',
    root_causes: 'root_causes',
    affected_stakeholders: 'affected_stakeholders',
    current_deficiencies: 'current_deficiencies',
    preferred_approach: 'preferred_approach',
    approaches_not_of_interest: 'approaches_not_of_interest',
  };

  // Build per-section rewrite instructions
  const sectionPrompts = sectionsNeedingSuggestion.map((r: any) => {
    // Look up content — for extended brief subsections, check inside challengeData.extended_brief
    let originalContent = challengeData[r.section_key];
    if (!originalContent && EXTENDED_BRIEF_KEYS.has(r.section_key) && challengeData.extended_brief) {
      try {
        const ebField = EB_FIELD_MAP[r.section_key] || r.section_key;
        const eb = typeof challengeData.extended_brief === 'string'
          ? JSON.parse(challengeData.extended_brief)
          : challengeData.extended_brief;
        originalContent = eb?.[ebField];
      } catch { /* ignore parse errors */ }
    }
    const contentStr = originalContent
      ? (typeof originalContent === 'string' ? originalContent : JSON.stringify(originalContent, null, 2))
      : '(EMPTY — generate from scratch based on challenge context)';

    const actionableComments = r.comments
      .filter((c: any) => c.type === 'error' || c.type === 'warning' || c.type === 'suggestion')
      .map((c: any, i: number) => `${i + 1}. [${c.type.toUpperCase()}] ${c.text}${c.field ? ` (field: ${c.field})` : ''}`)
      .join('\n');

    const bestPractices = r.comments
      .filter((c: any) => c.type === 'best_practice')
      .map((c: any) => `- ${c.text}`)
      .join('\n');

    const formatInstruction = getSuggestionFormatInstruction(r.section_key);
    const formatType = getSectionFormatType(r.section_key);

    return `### Section: ${r.section_key}
${r.status === 'generated' ? 'ACTION: Generate new content from scratch based on challenge context.' : 'ACTION: Revise the existing content to address all issues below.'}

FORMAT: ${formatType}. ${formatInstruction}

ORIGINAL CONTENT:
${contentStr}

ISSUES TO ADDRESS (${actionableComments ? actionableComments.split('\n').length : 0} items):
${actionableComments || '(No specific issues — generate fresh content based on challenge context)'}

${bestPractices ? `BEST PRACTICES TO INCORPORATE:\n${bestPractices}` : ''}

${r.guidelines?.length > 0 ? `GUIDELINES:\n- ${r.guidelines.join('\n- ')}` : ''}

Produce the REVISED/GENERATED content now. Return it in the "suggestion" field for this section_key.`;
  });

  const pass2UserPrompt = `Rewrite/generate content for the following ${sectionPrompts.length} section(s).

CHALLENGE CONTEXT:
${JSON.stringify(challengeData, null, 2)}

${clientContext?.todaysDate ? `Today's date: ${clientContext.todaysDate}. All dates must be in the future relative to this date.` : ''}
${clientContext?.maturityLevel ? `Maturity level: ${clientContext.maturityLevel}` : ''}
${clientContext?.solutionType ? `Solution type: ${clientContext.solutionType}` : ''}

SECTIONS TO REWRITE:
${sectionPrompts.join('\n\n---\n\n')}`;

  // Change 1: Build enriched Pass 2 system prompt if section configs are available
  let pass2SystemPrompt: string;
  if (sectionConfigs && sectionConfigs.length > 0) {
    // Extract configs for sections that need suggestions
    const pass2ConfigKeys = sectionsNeedingSuggestion.map((r: any) => r.section_key);
    const pass2Configs = pass2ConfigKeys
      .map((key: string) => sectionConfigs.find((c: SectionConfig) => c.section_key === key))
      .filter(Boolean) as SectionConfig[];

    // Build challenge context with section content for cross-references
    const enrichedContext = {
      ...clientContext,
      sections: challengeData,
    };

    pass2SystemPrompt = pass2Configs.length > 0
      ? buildPass2SystemPrompt(pass2Configs, enrichedContext)
      : buildPass2SystemPrompt([], enrichedContext);
  } else {
    // Fallback to inline prompt when no configs available
    pass2SystemPrompt = buildPass2SystemPrompt([], clientContext);
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: pass2SystemPrompt },
        { role: "user", content: pass2UserPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_content",
            description: "Return revised/generated content for each section that needs improvement. Each suggestion MUST address ALL issues listed in the review comments.",
            parameters: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_key: { type: "string", description: "The section identifier" },
                      suggestion: {
                        type: "string",
                        description: "The complete revised/generated content. Must address ALL issues listed. Must be in the section's native format (HTML for rich_text, JSON array for line_items, etc.).",
                      },
                    },
                    required: ["section_key", "suggestion"],
                  },
                },
              },
              required: ["sections"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "suggest_content" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    const errText = await response.text();
    console.error("AI gateway error (Pass 2):", response.status, errText);
    // Don't throw — return empty map so Pass 1 results are still usable
    console.error("Pass 2 failed, returning Pass 1 results without suggestions");
    return new Map();
  }

  const result = await response.json();

  // Token usage logging — Pass 2
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'pass2_rewrite',
    sectionKeys: sectionsNeedingSuggestion.map((s: any) => s.section_key),
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error("Pass 2: AI did not return structured output");
    return new Map();
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  const suggestionMap = new Map<string, string>();

  const sections = parsed.sections ?? parsed;
  if (Array.isArray(sections)) {
    for (const s of sections) {
      if (s.section_key && s.suggestion) {
        const fmt = getSectionFormatType(s.section_key);
        if (fmt === 'table' || fmt === 'schedule_table') {
          // Sanitize table suggestions: extract JSON array from prose if needed
          const sanitized = sanitizeTableSuggestion(s.suggestion);
          suggestionMap.set(s.section_key, sanitized);
        } else {
          suggestionMap.set(s.section_key, s.suggestion);
        }
      }
    }
  }

  return suggestionMap;
}

/* ══════════════════════════════════════════════════════════════
 * TWO-PASS ORCHESTRATOR
 * Calls Pass 1, filters, conditionally calls Pass 2, merges.
 * Change 1: Now accepts sectionConfigs for enriched Pass 2.
 * Change 3: Supports skip_analysis mode (Pass 2 only).
 * Change 4: Applies cleanAIOutput to all output fields.
 * ══════════════════════════════════════════════════════════════ */

async function callAIBatchTwoPass(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  sectionKeys: string[],
  challengeData: any,
  waveAction: string,
  clientContext?: any,
  sectionConfigs?: SectionConfig[],
  skipAnalysis?: boolean,
  providedComments?: any[],
): Promise<{ section_key: string; status: string; comments: any[]; reviewed_at: string; suggestion?: string | null; cross_section_issues?: any[]; guidelines?: string[] }[]> {

  let pass1Results: any[];

  // Change 3: Skip Pass 1 when skip_analysis is true
  if (skipAnalysis && providedComments && providedComments.length > 0) {
    pass1Results = providedComments;
    console.log(`Skip-analysis mode: using ${providedComments.length} provided comment(s) for Pass 2 only`);
  } else {
    // ═══ PASS 1: Analyze ═══
    pass1Results = await callAIPass1Analyze(apiKey, model, systemPrompt, userPrompt, sectionKeys);
  }

  // ═══ PASS 2: Rewrite (conditional) ═══
  let suggestionMap: Map<string, string>;
  try {
    suggestionMap = await callAIPass2Rewrite(apiKey, model, pass1Results, challengeData, waveAction, clientContext, sectionConfigs);
  } catch (err: any) {
    // Pass 2 failure is non-fatal — return Pass 1 results without suggestions
    if (err.message === "RATE_LIMIT" || err.message === "PAYMENT_REQUIRED") throw err;
    console.error("Pass 2 failed, continuing with Pass 1 results:", err);
    suggestionMap = new Map();
  }

  // ═══ MERGE: Combine Pass 1 analysis + Pass 2 suggestions ═══
  // Change 4: Apply cleanAIOutput to all output fields
  return pass1Results.map((r: any) => {
    const suggestion = suggestionMap.get(r.section_key) || null;
    const cleanedComments = Array.isArray(r.comments)
      ? r.comments.map((c: any) => ({
          ...c,
          text: cleanAIOutput(c.text) || c.text,
          reasoning: cleanAIOutput(c.reasoning),
        }))
      : r.comments;
    const cleanedGuidelines = Array.isArray(r.guidelines)
      ? r.guidelines.map((g: string) => cleanAIOutput(g)).filter(Boolean)
      : r.guidelines;

    return {
      ...r,
      comments: cleanedComments,
      guidelines: cleanedGuidelines,
      // Skip cleanAIOutput for table/schedule_table sections — they use sanitizeTableSuggestion
      suggestion: (() => {
        const fmt = getSectionFormatType(r.section_key);
        return (fmt === 'table' || fmt === 'schedule_table') ? suggestion : cleanAIOutput(suggestion);
      })(),
    };
  });
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
  clientContext?: any,
): Promise<any> {
  // Resolve solution type — REQUIRE explicit type, no arbitrary fallback
  const solutionType = challengeData.solution_type || clientContext?.solutionType || null;

  if (!solutionType) {
    // Return a structured error result instead of scoring with wrong dimensions
    console.warn("Complexity assessment skipped: no solution_type set on challenge");
    const now = new Date().toISOString();
    return {
      section_key: "complexity",
      status: "needs_revision",
      comments: [{
        text: "Cannot assess complexity: Solution Type is not set. Please select a Solution Type in the challenge configuration before running AI complexity assessment.",
        type: "error",
        field: "solution_type",
        reasoning: "Complexity dimensions are solution-type-specific. Without a defined type, the AI cannot select the correct rating dimensions, leading to inconsistent and unreliable scores.",
      }],
      reviewed_at: now,
      suggested_complexity: null,
    };
  }

  const { data: dimensions, error: dimError } = await adminClient
    .from("complexity_dimensions")
    .select("*")
    .eq("is_active", true)
    .eq("solution_type", solutionType)
    .order("display_order");

  if (dimError || !dimensions?.length) {
    console.error("No complexity dimensions found for solution_type:", solutionType);
    const now = new Date().toISOString();
    return {
      section_key: "complexity",
      status: "needs_revision",
      comments: [{
        text: `No complexity dimensions configured for solution type "${solutionType}". Please contact an admin to configure dimensions for this type.`,
        type: "error",
        field: "solution_type",
        reasoning: "The complexity_dimensions table has no active rows for this solution type.",
      }],
      reviewed_at: now,
      suggested_complexity: null,
    };
  }

  return await executeComplexityAssessment(apiKey, model, challengeData, dimensions, clientContext);
}

async function executeComplexityAssessment(
  apiKey: string,
  model: string,
  challengeData: any,
  dimensions: any[],
  clientContext?: any,
): Promise<any> {
  const paramDescriptions = dimensions.map((d: any) =>
    `- ${d.dimension_key} (${d.dimension_name}): Level 1 = "${d.level_1_description}", Level 3 = "${d.level_3_description}", Level 5 = "${d.level_5_description}"`
  ).join('\n');

  const dimHints: Record<string, string> = {
    technical_novelty: 'Focus on: problem_statement, deliverables. Look for: novel algorithms, cutting-edge tech, research requirements.',
    solution_maturity: 'Focus on: maturity_level, deliverables, phase_schedule. Look for: POC vs production, prototype complexity.',
    domain_breadth: 'Focus on: domain_tags, solver_expertise_requirements, scope. Look for: multi-domain, cross-functional.',
    evaluation_complexity: 'Focus on: evaluation_criteria, deliverables. Look for: subjective criteria, multi-dimensional scoring.',
    ip_sensitivity: 'Focus on: ip_model, deliverables. Look for: proprietary IP, patents, data sensitivity.',
    timeline_urgency: 'Focus on: phase_schedule, deliverables. Look for: compressed timelines, hard deadlines.',
    data_complexity: 'Focus on: data_resources_provided, success_metrics_kpis. Look for: data volume, quality issues.',
    integration_depth: 'Focus on: deliverables, scope. Look for: API integrations, system dependencies.',
    stakeholder_complexity: 'Focus on: affected_stakeholders, evaluation_criteria. Look for: conflicting interests.',
    regulatory_compliance: 'Focus on: deliverables, ip_model. Look for: HIPAA, GDPR, SOX, audit needs.',
    scalability_requirements: 'Focus on: expected_outcomes, success_metrics_kpis. Look for: performance targets.',
    innovation_level: 'Focus on: problem_statement, root_causes, current_deficiencies. Look for: novelty of problem.',
  };

  const dimGuidance = dimensions.map((d: any) =>
    `- ${d.dimension_key}: ${dimHints[d.dimension_key] || 'Analyze all relevant sections holistically.'}`
  ).join('\n');

  const systemPrompt = `You are an expert challenge complexity assessor for an enterprise open innovation platform.

COMPLEXITY DIMENSIONS:
${paramDescriptions}

WHICH SECTIONS TO ANALYZE FOR EACH DIMENSION:
${dimGuidance}

RATING RULES:
- Rate each dimension 1-10. Use the full range — do NOT cluster around 5.
  1-2 = Trivial, off-the-shelf. 3-4 = Standard. 5-6 = Moderate. 7-8 = High, specialized. 9-10 = Extreme, research-grade.
- Justification MUST reference SPECIFIC challenge content — quote values, cite numbers, name sections.
- If a relevant section is empty, state that and rate conservatively (lower, not default 5).
- DIFFERENTIATE ratings — dimensions should differ unless the challenge is truly uniform.
- Consider MATURITY: Blueprint = more uncertainty/innovation. Pilot = more integration/scalability.`;

  const strip = (s: any): string => {
    if (!s) return '(empty)';
    const t = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
    return t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000) || '(empty)';
  };
  const eb = typeof challengeData.extended_brief === 'object' ? (challengeData.extended_brief ?? {}) : {};

  const userPrompt = `Assess the complexity of this challenge.

TITLE: ${challengeData.title || '(untitled)'}
SOLUTION TYPE: ${clientContext?.solutionType || challengeData.solution_type || '(not set)'}
MATURITY LEVEL: ${clientContext?.maturityLevel || challengeData.maturity_level || '(not set)'}

PROBLEM STATEMENT:
${strip(challengeData.problem_statement)}

SCOPE:
${strip(challengeData.scope)}

DELIVERABLES:
${strip(challengeData.deliverables)}

EXPECTED OUTCOMES:
${strip(challengeData.expected_outcomes)}

EVALUATION CRITERIA:
${strip(challengeData.evaluation_criteria)}

PHASE SCHEDULE:
${strip(challengeData.phase_schedule)}

IP MODEL: ${challengeData.ip_model || '(not set)'}

DATA & RESOURCES:
${strip(challengeData.data_resources_provided)}

SUCCESS METRICS:
${strip(challengeData.success_metrics_kpis)}

SOLVER EXPERTISE REQUIRED:
${strip(challengeData.solver_expertise_requirements)}

DOMAIN TAGS: ${strip(challengeData.domain_tags)}

CONTEXT & BACKGROUND:
${strip(eb.context_background || challengeData.context_and_background)}

ROOT CAUSES:
${strip(eb.root_causes || challengeData.root_causes)}
`;

  const paramProperties: Record<string, any> = {};
  for (const d of dimensions) {
    paramProperties[d.dimension_key] = {
      type: "object",
      properties: {
        rating: { type: "number", minimum: 1, maximum: 10, description: `Rating for ${d.dimension_name} (1-10). Level 1 description = score 1-2, Level 3 = score 5-6, Level 5 = score 9-10.` },
        justification: { type: "string", description: `Why this rating was chosen, referencing specific challenge details` },
      },
      required: ["rating", "justification"],
    };
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "assess_complexity",
            description: "Return per-parameter complexity ratings with justifications.",
            parameters: {
              type: "object",
              properties: paramProperties,
              required: dimensions.map((d: any) => d.dimension_key),
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
    console.error("AI gateway error (Complexity):", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();

  // Token usage logging — Complexity
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'complexity_assessment',
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured complexity output");

  const ratings = JSON.parse(toolCall.function.arguments);
  const now = new Date().toISOString();

  // Build comments from ratings
  const guidelineComments = dimensions.map((d: any) => {
    const rating = ratings[d.dimension_key];
    if (!rating) return { text: `${d.dimension_name}: not rated`, type: 'warning' as const, field: d.dimension_key, reasoning: null };
    return {
      text: `${d.dimension_name}: ${rating.rating}/10 — ${rating.justification}`,
      type: (rating.rating >= 4 ? 'warning' : 'strength') as string,
      field: d.dimension_key,
      reasoning: rating.justification,
    };
  });

  return {
    section_key: "complexity",
    status: "pass",
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

    // Change 3: Extract skip_analysis and provided_comments
    const {
      challenge_id, section_key, role_context, context: clientContext,
      preview_mode, current_content, wave_action,
      skip_analysis, provided_comments,
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
        : "title, problem_statement, scope, description, deliverables, expected_outcomes, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, eligibility_model, visibility, challenge_visibility, phase_schedule, complexity_score, complexity_level, complexity_parameters, ai_section_reviews, hook, extended_brief, domain_tags, solver_expertise_requirements, solver_eligibility_types, solver_visibility_types, success_metrics_kpis, data_resources_provided, solution_type, currency_code, organization_id, submission_guidelines";

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

    // ── Separate complexity from standard batch ─────────────
    const complexitySection = sectionsToReview.find(s => s.key === 'complexity');
    const standardSections = sectionsToReview.filter(s => s.key !== 'complexity');

    // ── Batch-split standard sections for AI calls ───────────
    const batches: { key: string; desc: string }[][] = [];
    for (let i = 0; i < standardSections.length; i += MAX_BATCH_SIZE) {
      batches.push(standardSections.slice(i, i + MAX_BATCH_SIZE));
    }

    const allNewSections: any[] = [];

    // Change 2: Keep default model for complexity; compute per-batch model inside loop
    const defaultModel = globalConfig?.default_model || 'google/gemini-3-flash-preview';

    // Fire complexity assessment in parallel with standard batches
    const complexityPromise = complexitySection
      ? callComplexityAI(LOVABLE_API_KEY, getModelForRequest(['complexity'], globalConfig), challengeData, adminClient, clientContext)
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
      // Per-batch model selection: critical sections get premium model
      const batchKeys = batch.map(b => b.key);
      const modelToUse = getModelForRequest(batchKeys, globalConfig);
      // Build action-aware user prompt instruction for Pass 1 (analysis only)
      let userPromptInstruction: string;
      if (wave_action === 'generate') {
        userPromptInstruction = `The following section(s) are EMPTY. Analyze what content should be generated for each based on the challenge context. Set status to "generated" and provide specific comments about what the generated content should include. Focus on thorough analysis — the actual content generation will happen in a separate step.`;
      } else if (wave_action === 'review_and_enhance') {
        userPromptInstruction = `The following section(s) contain AI-generated content from a previous wave. Review them now that you have more context from later sections. Provide detailed comments on what needs improvement. Focus on thorough analysis — content improvement will happen in a separate step.`;
      } else if (section_key) {
        userPromptInstruction = `Review ONLY the "${section_key}" section of this ${contextLabel} for quality, consistency, correctness, and completeness. Provide thorough analysis with specific, actionable comments. Focus entirely on identifying issues — improved content will be generated separately based on your analysis.`;
      } else {
        userPromptInstruction = `Review each section of this ${contextLabel} for quality, consistency, correctness, and completeness. Provide thorough analysis with specific, actionable comments for each section. Focus entirely on identifying issues — improved content will be generated separately based on your analysis.`;
      }

      const userPrompt = `${userPromptInstruction}\n\nDATA: ${JSON.stringify(challengeData, null, 2)}${additionalData}`;

      let systemPrompt: string;
      if (useDbConfig && dbConfigMap) {
        const batchConfigs = batch.map(b => dbConfigMap!.get(b.key)!).filter(Boolean);
        systemPrompt = buildSmartBatchPrompt(batchConfigs, resolvedContext, masterDataOptions, clientContext, challengeData);
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
        // Change 1: Pass sectionConfigs for enriched Pass 2
        // Change 3: Pass skip_analysis and provided_comments
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
