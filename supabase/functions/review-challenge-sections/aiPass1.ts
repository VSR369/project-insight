/**
 * aiPass1.ts — Pass 1 (Analyze) AI call.
 * Extracted from aiCalls.ts for decomposition.
 */

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callAIPass1Analyze(
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
