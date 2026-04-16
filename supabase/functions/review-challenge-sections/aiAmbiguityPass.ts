/**
 * aiAmbiguityPass.ts — Post-batch Ambiguity Detection Pass.
 *
 * Runs AFTER all individual section batches complete (Pass 1 + Pass 2).
 * Scans ALL section content for language that would confuse solvers:
 * vague terms, undefined acronyms, unmeasurable criteria, unclear scope
 * boundaries, and implicit assumptions.
 *
 * Findings are merged back into affected sections as [AMBIGUITY] comments.
 */

import { DEFAULT_PLATFORM_PREAMBLE } from './promptConstants.ts';

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface AmbiguityFinding {
  section_key: string;
  ambiguous_text: string;
  ambiguity_type: 'vague_term' | 'undefined_acronym' | 'unmeasurable_criterion' | 'unclear_scope' | 'implicit_assumption' | 'missing_definition';
  severity: 'error' | 'warning';
  solver_confusion_risk: string;
  clarified_alternative: string;
}

export interface AmbiguityPassResult {
  findings: AmbiguityFinding[];
  overall_clarity_score: number;
  top_solver_questions: string[];
}

/**
 * Build a compact content summary for each section to feed the ambiguity detector.
 */
function buildSectionContent(
  sectionResults: Array<Record<string, unknown>>,
  challengeSections: Record<string, unknown>,
): string {
  const lines: string[] = [];
  for (const r of sectionResults) {
    const key = r.section_key as string;
    if (key.startsWith('_')) continue; // skip synthetic sections

    // Use the suggestion (post-rewrite) if available, otherwise original content
    const content = (r as Record<string, unknown>).suggestion
      ?? challengeSections[key]
      ?? '(no content)';

    const contentStr = typeof content === 'string'
      ? content.substring(0, 1500)
      : JSON.stringify(content).substring(0, 1500);

    lines.push(`### ${key}\n${contentStr}`);
  }
  return lines.join('\n\n');
}

export async function callAmbiguityPass(
  apiKey: string,
  model: string,
  allPass1Results: Array<Record<string, unknown>>,
  challengeData: Record<string, unknown>,
  challengeSections: Record<string, unknown>,
  reasoningEffort?: string,
): Promise<AmbiguityPassResult> {
  if (allPass1Results.length < 1) {
    return { findings: [], overall_clarity_score: 100, top_solver_questions: [] };
  }

  const sectionContent = buildSectionContent(allPass1Results, challengeSections);

  const systemPrompt = `${DEFAULT_PLATFORM_PREAMBLE}

## YOUR TASK: AMBIGUITY DETECTION FOR SOLVER CLARITY

You are reviewing an innovation challenge brief from the perspective of a **first-time solver** who has never spoken to the challenge creator. Your goal is to find language that would cause a solver to:
1. Misinterpret what is being asked
2. Submit a solution that technically meets stated criteria but misses the creator's intent
3. Waste time asking clarifying questions before starting work
4. Under- or over-scope their effort

## AMBIGUITY TYPES TO DETECT

1. **vague_term**: Subjective or undefined qualifiers ("innovative", "best practices", "state-of-the-art", "reasonable", "appropriate", "significant", "comprehensive", "robust") used without measurable definition.
2. **undefined_acronym**: Acronyms, abbreviations, or jargon used without definition on first use.
3. **unmeasurable_criterion**: Evaluation criteria or success metrics that cannot be objectively measured ("high quality", "user-friendly", "scalable", "well-documented") without a rubric or threshold.
4. **unclear_scope**: Boundaries of what is in-scope vs out-of-scope are not explicit. Solvers cannot tell where to stop.
5. **implicit_assumption**: The text assumes domain knowledge, context, or constraints that are not stated. A solver from a different background would miss this.
6. **missing_definition**: A key concept is used repeatedly but never defined. Different solvers would interpret it differently.

## SCORING
- overall_clarity_score: 0-100 rating of how unambiguously a solver can understand the full brief.
  90+ = crystal clear, solver can start immediately. 70-89 = minor clarifications needed. 50-69 = significant ambiguity. <50 = solver would need extensive Q&A before starting.

## RULES
- Only flag genuinely ambiguous language. Technical terms with standard industry definitions are NOT ambiguous.
- Every finding MUST include a specific clarified_alternative that removes the ambiguity.
- Focus on ambiguity that would change solver behavior — not stylistic preferences.
- Do NOT repeat issues already flagged in individual section reviews.`;

  const userPrompt = `## CHALLENGE OVERVIEW
Title: ${challengeData.title || '(untitled)'}
Industry: ${challengeData.industry_segment_id || 'unspecified'}
Complexity: ${challengeData.complexity_level || 'unknown'}

## SECTION CONTENT (post-review)
${sectionContent}

Analyze the above for solver-facing ambiguity. Return findings via the detect_ambiguity tool.`;

  const requestBody: Record<string, unknown> = {
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'detect_ambiguity',
          description: 'Return ambiguity findings, overall clarity score, and top solver questions.',
          parameters: {
            type: 'object',
            properties: {
              findings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    section_key: { type: 'string', description: 'Section containing the ambiguous language.' },
                    ambiguous_text: { type: 'string', description: 'The exact phrase or sentence that is ambiguous. Quote it verbatim.' },
                    ambiguity_type: {
                      type: 'string',
                      enum: ['vague_term', 'undefined_acronym', 'unmeasurable_criterion', 'unclear_scope', 'implicit_assumption', 'missing_definition'],
                    },
                    severity: { type: 'string', enum: ['error', 'warning'], description: 'error = solver would likely misinterpret, warning = could cause confusion.' },
                    solver_confusion_risk: { type: 'string', description: 'One sentence: what would a solver get wrong because of this ambiguity?' },
                    clarified_alternative: { type: 'string', description: 'Rewritten text that removes the ambiguity. Must be drop-in replacement quality.' },
                  },
                  required: ['section_key', 'ambiguous_text', 'ambiguity_type', 'severity', 'solver_confusion_risk', 'clarified_alternative'],
                },
              },
              overall_clarity_score: {
                type: 'number',
                description: '0-100 score for how unambiguously solvers can understand the brief.',
              },
              top_solver_questions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Top 3-5 questions a solver would ask after reading all sections. Each is one sentence.',
              },
            },
            required: ['findings', 'overall_clarity_score', 'top_solver_questions'],
          },
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'detect_ambiguity' } },
  };

  if (reasoningEffort && reasoningEffort !== 'default') {
    requestBody.reasoning_effort = reasoningEffort;
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 402) throw new Error('PAYMENT_REQUIRED');
    const errText = await response.text();
    console.error('AI gateway error (Ambiguity Pass):', response.status, errText);
    throw new Error(`Ambiguity pass failed: ${response.status}`);
  }

  const result = await response.json();

  // Token usage logging
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'ambiguity_pass',
    sectionCount: allPass1Results.length,
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error('Ambiguity pass: AI did not return structured output');
    return { findings: [], overall_clarity_score: 0, top_solver_questions: [] };
  }

  const parsed = JSON.parse(toolCall.function.arguments);

  return {
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    overall_clarity_score: typeof parsed.overall_clarity_score === 'number' ? parsed.overall_clarity_score : 0,
    top_solver_questions: Array.isArray(parsed.top_solver_questions) ? parsed.top_solver_questions : [],
  };
}

/**
 * Merge ambiguity findings back into section results.
 * Adds findings as [AMBIGUITY] comments with clarified alternatives.
 */
export function mergeAmbiguityFindings(
  sectionResults: Array<Record<string, unknown>>,
  ambiguityResult: AmbiguityPassResult,
): void {
  if (ambiguityResult.findings.length === 0) return;

  const resultMap = new Map<string, Record<string, unknown>>();
  for (const r of sectionResults) {
    resultMap.set(r.section_key as string, r);
  }

  for (const finding of ambiguityResult.findings) {
    const section = resultMap.get(finding.section_key);
    if (!section) continue;

    if (!Array.isArray(section.comments)) {
      section.comments = [];
    }

    const AMBIGUITY_TYPE_LABELS: Record<string, string> = {
      vague_term: 'Vague Term',
      undefined_acronym: 'Undefined Acronym',
      unmeasurable_criterion: 'Unmeasurable Criterion',
      unclear_scope: 'Unclear Scope',
      implicit_assumption: 'Implicit Assumption',
      missing_definition: 'Missing Definition',
    };

    (section.comments as Array<Record<string, unknown>>).push({
      text: `[AMBIGUITY: ${AMBIGUITY_TYPE_LABELS[finding.ambiguity_type] || finding.ambiguity_type}] "${finding.ambiguous_text}" — ${finding.solver_confusion_risk}`,
      type: finding.severity,
      field: null,
      reasoning: `Clarified alternative: ${finding.clarified_alternative}`,
      confidence: 'high',
      evidence_basis: `Ambiguous text: "${finding.ambiguous_text}"`,
      source: 'ambiguity_pass',
    });

    // Escalate status if error-level finding on a passing section
    if (finding.severity === 'error' && section.status === 'pass') {
      section.status = 'warning';
    }
  }

  console.log(JSON.stringify({
    event: 'ambiguity_pass_summary',
    findings_count: ambiguityResult.findings.length,
    error_count: ambiguityResult.findings.filter(f => f.severity === 'error').length,
    warning_count: ambiguityResult.findings.filter(f => f.severity === 'warning').length,
    overall_clarity_score: ambiguityResult.overall_clarity_score,
    top_questions_count: ambiguityResult.top_solver_questions.length,
    timestamp: new Date().toISOString(),
  }));
}
