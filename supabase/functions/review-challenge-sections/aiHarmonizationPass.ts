/**
 * aiHarmonizationPass.ts — Pass 2 Suggestion Harmonization.
 *
 * Runs ONCE after all Pass-2 per-section suggestions are generated, BEFORE the
 * curator clicks Accept All. Reads ALL cluster suggestions in a single AI call,
 * detects cross-section inconsistencies (e.g. deliverables suggests 5 items but
 * evaluation_criteria only covers 3), and returns ONLY corrected sections.
 *
 * Single AI call, no batching. Reasoning: high. Expected wall-time 60-90s.
 */

import { DEFAULT_PLATFORM_PREAMBLE, getSuggestionFormatInstruction } from './promptConstants.ts';
import { SECTION_DEPENDENCIES, DEPENDENCY_REASONING } from './aiCalls.ts';
import { callAIWithFallback } from '../_shared/aiModelConfig.ts';

export interface HarmonizationCorrection {
  section_key: string;
  reason: string;
  corrected_suggestion: unknown;
}

export interface HarmonizationPassResult {
  corrections: HarmonizationCorrection[];
  cross_section_score: number;
  issues_found: number;
  issues_fixed: number;
}

const TRUNCATE_SUGGESTION_CHARS = 1800;

function summariseSuggestion(sectionKey: string, suggestion: unknown): string {
  let text: string;
  if (suggestion == null) text = '(empty)';
  else if (typeof suggestion === 'string') text = suggestion;
  else {
    try { text = JSON.stringify(suggestion, null, 2); }
    catch { text = String(suggestion); }
  }
  if (text.length > TRUNCATE_SUGGESTION_CHARS) {
    text = text.substring(0, TRUNCATE_SUGGESTION_CHARS) + '\n…[truncated]';
  }
  return `### ${sectionKey}\n${text}`;
}

function summariseChallengeOriginal(challengeData: Record<string, unknown>): string {
  const lines: string[] = [];
  if (challengeData.title) lines.push(`Title: ${challengeData.title}`);
  if (challengeData.maturity_level) lines.push(`Maturity: ${challengeData.maturity_level}`);
  if (challengeData.complexity_level) lines.push(`Complexity: ${challengeData.complexity_level}`);
  if (challengeData.currency_code) lines.push(`Currency: ${challengeData.currency_code}`);
  if (challengeData.ip_model) lines.push(`IP Model: ${challengeData.ip_model}`);
  return lines.join('\n');
}

/** Build a focused dependency matrix for the cluster sections only. */
function buildClusterDependencyMatrix(clusterKeys: string[]): string {
  const set = new Set(clusterKeys);
  const lines: string[] = [];
  for (const section of clusterKeys) {
    const deps = SECTION_DEPENDENCIES[section] ?? [];
    const reasoning = DEPENDENCY_REASONING[section] || {};
    for (const dep of deps) {
      if (!set.has(dep)) continue;
      const rule = reasoning[dep] || 'Verify alignment and consistency.';
      lines.push(`- ${section} ↔ ${dep}: ${rule}`);
    }
  }
  return lines.join('\n');
}

function buildFormatHints(clusterKeys: string[]): string {
  const hints: string[] = [];
  for (const key of clusterKeys) {
    try {
      const instr = getSuggestionFormatInstruction(key);
      if (instr) hints.push(`### ${key}\n${instr}`);
    } catch {
      /* section may not have a format instruction — fine */
    }
  }
  return hints.join('\n\n');
}

export async function callHarmonizationPass(
  apiKey: string,
  model: string,
  suggestions: Record<string, unknown>,
  challengeData: Record<string, unknown>,
  reasoningEffort: string = 'high',
): Promise<HarmonizationPassResult> {
  const clusterKeys = Object.keys(suggestions).filter((k) => suggestions[k] != null);

  if (clusterKeys.length < 2) {
    return { corrections: [], cross_section_score: 100, issues_found: 0, issues_fixed: 0 };
  }

  const suggestionSummaries = clusterKeys
    .map((k) => summariseSuggestion(k, suggestions[k]))
    .join('\n\n');

  const dependencyMatrix = buildClusterDependencyMatrix(clusterKeys);
  const formatHints = buildFormatHints(clusterKeys);
  const challengeOverview = summariseChallengeOriginal(challengeData);

  const systemPrompt = `${DEFAULT_PLATFORM_PREAMBLE}

## YOUR TASK: SUGGESTION HARMONIZATION (PASS 2 FINAL REVIEW)

You are a Principal Consultant performing the final cross-section consistency review of AI-generated SUGGESTIONS before a curator accepts them.

The suggestions below were each generated independently and have NEVER been compared against each other. Your job is to find cross-section inconsistencies BETWEEN suggestions and return CORRECTED versions for ONLY the sections that need changes.

## WHAT TO CHECK

1. **Counts and References**: deliverables count vs evaluation_criteria coverage; expected_outcomes vs success_metrics_kpis mapping; phase_schedule duration vs deliverables effort.
2. **Scale Alignment**: reward_structure vs complexity vs solver_expertise vs maturity. Premium expertise + low reward = mismatch.
3. **Scope Consistency**: every cross-cutting claim must agree across sections.
4. **Terminology**: same concept must use the same term across all suggestions.
5. **Timeline Feasibility**: phase_schedule must allow time for all deliverables and evaluation_criteria assessment.

## DEPENDENCY RULES TO VERIFY (cluster only)
${dependencyMatrix}

## FORMAT REQUIREMENTS FOR CORRECTED CONTENT
Each \`corrected_suggestion\` MUST follow the exact format the original suggestion used. Format hints per section:
${formatHints}

## CRITICAL RULES
- Return ONLY sections that need changes. If a section is consistent with all others, do NOT include it in corrections.
- The \`corrected_suggestion\` MUST be the FULL replacement content — not a diff, not a comment.
- Match the exact structural format (string / array / object) of the original suggestion for that section.
- Do NOT introduce information not present in the suggestions or original challenge data.
- If suggestions are already cross-consistent, return an empty corrections array.`;

  const userPrompt = `## ORIGINAL CHALLENGE DATA
${challengeOverview}

## PROPOSED SUGGESTIONS (Pass 2 generated, awaiting curator acceptance)
${suggestionSummaries}

Audit the SUGGESTIONS above for cross-section inconsistencies. Return harmonized corrections via the harmonize_suggestions tool. Only include sections that need changes.`;

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
          name: 'harmonize_suggestions',
          description: 'Return cross-section harmonization corrections for AI-generated suggestions.',
          parameters: {
            type: 'object',
            properties: {
              corrections: {
                type: 'array',
                description: 'Sections that require changes for cross-section consistency. Empty if all suggestions are consistent.',
                items: {
                  type: 'object',
                  properties: {
                    section_key: { type: 'string', description: 'Section key being corrected (must match an input suggestion key).' },
                    reason: { type: 'string', description: 'Specific cross-section inconsistency this correction resolves. Cite the conflicting sections.' },
                    corrected_suggestion: {
                      description: 'Full replacement suggestion content. MUST match the structural format (string / array / object) used by the original suggestion for this section.',
                    },
                  },
                  required: ['section_key', 'reason', 'corrected_suggestion'],
                },
              },
              cross_section_score: {
                type: 'number',
                description: '0-100 score: how well the (post-correction) suggestion set works together. 90+ = excellent.',
              },
              issues_found: { type: 'number', description: 'Total cross-section inconsistencies detected.' },
              issues_fixed: { type: 'number', description: 'Number of inconsistencies the corrections resolve.' },
            },
            required: ['corrections', 'cross_section_score', 'issues_found', 'issues_fixed'],
          },
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'harmonize_suggestions' } },
  };

  if (reasoningEffort && reasoningEffort !== 'default') {
    requestBody.reasoning_effort = reasoningEffort;
  }

  const response = await callAIWithFallback(apiKey, requestBody, model);

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 402) throw new Error('PAYMENT_REQUIRED');
    const errText = await response.text();
    console.error('AI gateway error (Harmonization Pass):', response.status, errText);
    throw new Error(`Harmonization pass failed: ${response.status}`);
  }

  const result = await response.json();

  // Token usage logging
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'harmonization_pass',
    cluster_section_count: clusterKeys.length,
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error('Harmonization pass: AI did not return structured output');
    return { corrections: [], cross_section_score: 0, issues_found: 0, issues_fixed: 0 };
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  const correctionsRaw = Array.isArray(parsed.corrections) ? parsed.corrections : [];
  const corrections: HarmonizationCorrection[] = correctionsRaw
    .filter((c: unknown): c is HarmonizationCorrection => {
      if (!c || typeof c !== 'object') return false;
      const obj = c as Record<string, unknown>;
      return typeof obj.section_key === 'string'
        && typeof obj.reason === 'string'
        && obj.corrected_suggestion !== undefined;
    });

  return {
    corrections,
    cross_section_score: typeof parsed.cross_section_score === 'number' ? parsed.cross_section_score : 0,
    issues_found: typeof parsed.issues_found === 'number' ? parsed.issues_found : corrections.length,
    issues_fixed: typeof parsed.issues_fixed === 'number' ? parsed.issues_fixed : corrections.length,
  };
}
