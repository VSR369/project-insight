/**
 * complexity.ts — AI complexity assessment functions.
 * Extracted from index.ts (Phase D2.2).
 */

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Call AI gateway for complexity assessment — separate from batch review.
 * Uses full challenge context + master complexity params to produce per-parameter ratings.
 */
export async function callComplexityAI(
  apiKey: string,
  model: string,
  challengeData: any,
  adminClient: any,
  clientContext?: any,
  orgContext?: any,
): Promise<any> {
  // Resolve solution type — REQUIRE explicit type, no arbitrary fallback
  const solutionType = challengeData.solution_type || clientContext?.solutionType || null;

  if (!solutionType) {
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

  return await executeComplexityAssessment(apiKey, model, challengeData, dimensions, clientContext, orgContext);
}

export async function executeComplexityAssessment(
  apiKey: string,
  model: string,
  challengeData: any,
  dimensions: any[],
  clientContext?: any,
  orgContext?: any,
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
- Consider MATURITY: Blueprint = more uncertainty/innovation. Pilot = more integration/scalability.
${orgContext?.orgName ? `\nORGANIZATION CONTEXT: This challenge is from ${orgContext.orgName}${orgContext.hqCountry ? ` (${orgContext.hqCountry})` : ''}${orgContext.industries?.[0]?.name ? ` in ${orgContext.industries[0].name}` : ''}. Calibrate complexity ratings for this industry and geography.\n` : ''}`;

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
