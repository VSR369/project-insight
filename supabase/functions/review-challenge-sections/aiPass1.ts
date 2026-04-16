/**
 * aiPass1.ts — Pass 1 (Analyze) AI call.
 * Extracted from aiCalls.ts for decomposition.
 * 
 * PROMPT 3: Enhanced tool schema with principal-grade forcing functions:
 * - confidence_score per comment (how certain is this finding)
 * - evidence_basis per comment (what data/source supports it)
 * - solver_impact per section (how this affects solver decision-making)
 * - publication_blocker per section (is this a hard stop for publishing)
 * - quality_score per section (0-100 overall quality rating)
 * - missing_elements per section (specific items that are absent)
 */

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callAIPass1Analyze(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  sectionKeys: string[],
  reasoningEffort?: string,
): Promise<{ section_key: string; status: string; comments: any[]; reviewed_at: string; guidelines: string[]; cross_section_issues: any[]; solver_impact?: string; publication_blocker?: boolean; quality_score?: number; missing_elements?: string[] }[]> {
  const requestBody: Record<string, unknown> = {
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
          description: "Return per-section principal-grade analysis: status, typed comments with evidence and confidence, guidelines, cross-section issues, solver impact assessment, and publication readiness. Do NOT include a suggestion field — improved content will be generated in a separate step.",
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
                          text: { type: "string", description: "Clear, specific comment referencing challenge details. Must be actionable — state what to fix and how." },
                          type: {
                            type: "string",
                            enum: ["error", "warning", "suggestion", "best_practice", "strength"],
                            description: "error = must fix before publication, warning = should improve, suggestion = nice-to-have, best_practice = industry standard reference, strength = positive reinforcement",
                          },
                          field: { type: "string", description: "Specific field name this comment applies to, or null for general" },
                          reasoning: { type: "string", description: "Why this matters — reference other sections, solver perspective, or industry standards" },
                          confidence: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                            description: "How certain you are about this finding. high = clear evidence in the content, medium = reasonable inference, low = possible issue needing human judgment",
                          },
                          evidence_basis: {
                            type: "string",
                            description: "What specific data, content, or absence supports this finding. E.g., 'The deliverables section lists 5 items but evaluation_criteria only covers 3' or 'No timeline mentioned despite Pilot maturity level'",
                          },
                          quantification: {
                            type: "string",
                            description: "PRINCIPAL FORCING FUNCTION. Concrete number, range, percentage, or unit grounding the finding. E.g., '5 deliverables vs 3 criteria — 40% gap', '$25K reward vs L4 complexity — 60% below market', '6-week schedule vs typical 12-16 for Pilot'. Use null if a number is genuinely not applicable.",
                          },
                          framework_applied: {
                            type: "string",
                            description: "PRINCIPAL FORCING FUNCTION. Named framework, methodology, or industry standard invoked (e.g., 'SCQA', 'Pyramid Principle', 'MoSCoW', 'Kano Model', 'ISO 27001', 'OECD AI Principles', 'NIST CSF'). Use null if no formal framework applies.",
                          },
                          evidence_source: {
                            type: "string",
                            enum: ["challenge_content", "context_digest", "industry_pack", "geo_pack", "framework_library", "cross_section_inference", "general_knowledge"],
                            description: "PRINCIPAL FORCING FUNCTION. Where the evidence comes from. 'general_knowledge' is allowed but should be the LAST resort — prefer retrieved sources.",
                          },
                          cross_reference_verified: {
                            type: "array",
                            items: { type: "string" },
                            description: "PRINCIPAL FORCING FUNCTION. Other section_keys cross-checked when forming this finding. Empty array if the finding is purely intra-section.",
                          },
                        },
                        required: ["text", "type", "confidence", "evidence_basis"],
                      },
                      description: "Multi-tier feedback with evidence. Every comment must have confidence level and evidence basis. For 'pass' sections, include 1-2 strength comments. Quantification, framework_applied, evidence_source, cross_reference_verified are STRONGLY recommended for principal-grade output.",
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
                    solver_impact: {
                      type: "string",
                      description: "One sentence: How would this section's current state affect a top solver's decision to participate? E.g., 'A solver would skip this challenge because the deliverables are too vague to estimate effort.' or 'Strong — clear scope and attractive reward would draw qualified solvers.'",
                    },
                    publication_blocker: {
                      type: "boolean",
                      description: "true if this section has issues that MUST be resolved before the challenge can be published. false if issues are improvements only.",
                    },
                    quality_score: {
                      type: "number",
                      description: "Overall quality rating 0-100 for this section. 90+ = excellent, 70-89 = good, 50-69 = needs work, <50 = significant issues. Score must be consistent with status and comments.",
                    },
                    missing_elements: {
                      type: "array",
                      items: { type: "string" },
                      description: "Specific elements that are absent from this section but should be present. E.g., 'acceptance criteria for deliverable #3', 'baseline metric for KPI comparison', 'out-of-scope exclusions'.",
                    },
                  },
                  required: ["section_key", "status", "comments", "solver_impact", "publication_blocker", "quality_score"],
                },
              },
            },
            required: ["sections"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "review_sections" } },
  };

  // Add reasoning_effort if configured
  if (reasoningEffort && reasoningEffort !== 'default') {
    requestBody.reasoning_effort = reasoningEffort;
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
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
      if (typeof c === 'string') {
        return {
          text: c, type: 'warning' as const, field: null, reasoning: null,
          confidence: 'medium', evidence_basis: null,
          quantification: null, framework_applied: null,
          evidence_source: 'general_knowledge', cross_reference_verified: [],
        };
      }
      return {
        text: c.text || c.comment || String(c),
        type: c.type || (c.severity === 'error' ? 'error' : c.severity === 'suggestion' ? 'suggestion' : 'warning'),
        field: c.field || null,
        reasoning: c.reasoning || null,
        confidence: c.confidence || 'medium',
        evidence_basis: c.evidence_basis || null,
        quantification: typeof c.quantification === 'string' && c.quantification.trim() ? c.quantification.trim() : null,
        framework_applied: typeof c.framework_applied === 'string' && c.framework_applied.trim() ? c.framework_applied.trim() : null,
        evidence_source: typeof c.evidence_source === 'string' ? c.evidence_source : null,
        cross_reference_verified: Array.isArray(c.cross_reference_verified) ? c.cross_reference_verified.filter((x: unknown) => typeof x === 'string') : [],
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
      solver_impact: s.solver_impact || null,
      publication_blocker: typeof s.publication_blocker === 'boolean' ? s.publication_blocker : (normalizedStatus === 'needs_revision'),
      quality_score: typeof s.quality_score === 'number' ? s.quality_score : null,
      missing_elements: Array.isArray(s.missing_elements) ? s.missing_elements : [],
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
        comments: [{
          text: "Review could not be completed for this section. Please re-review individually.",
          type: "warning", field: null, reasoning: null,
          confidence: 'low', evidence_basis: 'Section was not returned by AI model',
          quantification: null, framework_applied: null,
          evidence_source: 'general_knowledge', cross_reference_verified: [],
        }],
        guidelines: [],
        cross_section_issues: [],
        solver_impact: null,
        publication_blocker: false,
        quality_score: null,
        missing_elements: [],
        reviewed_at: now,
      });
    }
  }

  /* ── Principal-grade artifact coverage telemetry ── */
  const allComments = sections.flatMap((s: any) => Array.isArray(s.comments) ? s.comments : []);
  const total = allComments.length;
  const withQuantification = allComments.filter((c: any) => !!c.quantification).length;
  const withFramework = allComments.filter((c: any) => !!c.framework_applied).length;
  const withEvidenceSource = allComments.filter((c: any) => typeof c.evidence_source === 'string' && c.evidence_source && c.evidence_source !== 'general_knowledge').length;
  const withCrossRef = allComments.filter((c: any) => Array.isArray(c.cross_reference_verified) && c.cross_reference_verified.length > 0).length;

  /* ── Principal-grade enforcement (substantive comments only) ──
   * For error/warning/suggestion comments only, classify as:
   *   'principal' if ≥2 of 4 forcing fields are present
   *   'junior'    if 0–1 forcing fields are present
   * Strength/best_practice comments are NOT classified (forcing fields would
   * fabricate noise). Result attached as `principal_grade` on each comment
   * and aggregated as `principal_compliance_pct` for the run.
   */
  const SUBSTANTIVE_TYPES = new Set(['error', 'warning', 'suggestion']);
  let principalCount = 0;
  let juniorCount = 0;
  for (const section of sections) {
    if (!Array.isArray(section.comments)) continue;
    for (const c of section.comments as any[]) {
      if (!SUBSTANTIVE_TYPES.has(c.type)) {
        c.principal_grade = null;
        continue;
      }
      let presentCount = 0;
      if (c.quantification) presentCount++;
      if (c.framework_applied) presentCount++;
      if (c.evidence_source && c.evidence_source !== 'general_knowledge') presentCount++;
      if (Array.isArray(c.cross_reference_verified) && c.cross_reference_verified.length > 0) presentCount++;

      if (presentCount >= 2) {
        c.principal_grade = 'principal';
        principalCount++;
      } else {
        c.principal_grade = 'junior';
        juniorCount++;
      }
    }
  }
  const totalSubstantive = principalCount + juniorCount;
  const principalCompliancePct = totalSubstantive > 0
    ? Math.round((principalCount / totalSubstantive) * 100)
    : null;

  // Expose compliance pct to caller via non-enumerable side-channel for telemetry insert.
  // (Plain property — caller reads `(sections as any).__principalCompliancePct`.)
  Object.defineProperty(sections, '__principalCompliancePct', {
    value: principalCompliancePct,
    enumerable: false,
    writable: false,
  });

  console.log(JSON.stringify({
    event: 'ai_principal_artifact_coverage',
    pass: 'pass1_analyze',
    sectionKeys,
    total_comments: total,
    with_quantification: withQuantification,
    with_framework: withFramework,
    with_evidence_source: withEvidenceSource,
    with_cross_reference: withCrossRef,
    coverage_pct: total > 0 ? {
      quantification: Math.round((withQuantification / total) * 100),
      framework: Math.round((withFramework / total) * 100),
      evidence_source: Math.round((withEvidenceSource / total) * 100),
      cross_reference: Math.round((withCrossRef / total) * 100),
    } : null,
    principal_enforcement: {
      total_substantive: totalSubstantive,
      principal_count: principalCount,
      junior_count: juniorCount,
      compliance_pct: principalCompliancePct,
    },
    timestamp: new Date().toISOString(),
  }));

  return sections;
}
