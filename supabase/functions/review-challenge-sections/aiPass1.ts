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
                        },
                        required: ["text", "type", "confidence", "evidence_basis"],
                      },
                      description: "Multi-tier feedback with evidence. Every comment must have confidence level and evidence basis. For 'pass' sections, include 1-2 strength comments.",
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
      if (typeof c === 'string') return { text: c, type: 'warning' as const, field: null, reasoning: null, confidence: 'medium', evidence_basis: null };
      return {
        text: c.text || c.comment || String(c),
        type: c.type || (c.severity === 'error' ? 'error' : c.severity === 'suggestion' ? 'suggestion' : 'warning'),
        field: c.field || null,
        reasoning: c.reasoning || null,
        confidence: c.confidence || 'medium',
        evidence_basis: c.evidence_basis || null,
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
        comments: [{ text: "Review could not be completed for this section. Please re-review individually.", type: "warning", field: null, reasoning: null, confidence: 'low', evidence_basis: 'Section was not returned by AI model' }],
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

  return sections;
}
