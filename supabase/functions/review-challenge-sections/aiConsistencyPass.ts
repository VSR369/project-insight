/**
 * aiConsistencyPass.ts — Post-batch Cross-Section Consistency Pass.
 *
 * Runs AFTER all individual section batches complete (Pass 1 + Pass 2).
 * Takes ALL section results together and performs a single AI call to find
 * cross-section inconsistencies that per-batch reviews cannot detect.
 *
 * Findings are merged back into affected sections as additional
 * cross_section_issues and comments.
 */

import { DEFAULT_PLATFORM_PREAMBLE } from './promptConstants.ts';
import { SECTION_DEPENDENCIES, DEPENDENCY_REASONING } from './aiCalls.ts';

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface ConsistencyFinding {
  source_section: string;
  target_section: string;
  inconsistency: string;
  severity: 'error' | 'warning';
  resolution: string;
  evidence: string;
}

export interface ConsistencyPassResult {
  findings: ConsistencyFinding[];
  overall_coherence_score: number;
  narrative_gaps: string[];
  solver_readiness: string;
}

/**
 * Summarise a section's Pass 1 result for the consistency prompt.
 * Keeps token usage low while giving enough signal.
 */
function summariseSection(r: Record<string, unknown>): string {
  const key = r.section_key as string;
  const status = r.status as string;
  const score = typeof r.quality_score === 'number' ? r.quality_score : 'N/A';
  const blocker = r.publication_blocker === true ? ' [BLOCKER]' : '';
  const missing = Array.isArray(r.missing_elements) && (r.missing_elements as string[]).length > 0
    ? `Missing: ${(r.missing_elements as string[]).join('; ')}`
    : '';
  const impact = r.solver_impact ? `Solver impact: ${r.solver_impact}` : '';
  const comments = Array.isArray(r.comments)
    ? (r.comments as Array<{ type?: string; text?: string }>)
        .filter(c => c.type === 'error' || c.type === 'warning')
        .map(c => `- [${(c.type ?? 'warning').toUpperCase()}] ${(c.text ?? '').substring(0, 200)}`)
        .join('\n')
    : '';

  return `### ${key} — status: ${status}, score: ${score}/100${blocker}
${impact}
${missing}
${comments}`.trim();
}

/**
 * Build the list of dependency rules that the consistency pass should verify.
 */
function buildDependencyMatrix(): string {
  const lines: string[] = [];
  for (const [section, deps] of Object.entries(SECTION_DEPENDENCIES)) {
    if (deps.length === 0) continue;
    const reasoning = DEPENDENCY_REASONING[section] || {};
    for (const dep of deps) {
      const rule = reasoning[dep] || 'Check for consistency and alignment.';
      lines.push(`- ${section} ↔ ${dep}: ${rule}`);
    }
  }
  return lines.join('\n');
}

export async function callConsistencyPass(
  apiKey: string,
  model: string,
  allPass1Results: Array<Record<string, unknown>>,
  challengeData: Record<string, unknown>,
  reasoningEffort?: string,
): Promise<ConsistencyPassResult> {
  // Need at least 2 sections to check consistency
  if (allPass1Results.length < 2) {
    return { findings: [], overall_coherence_score: 100, narrative_gaps: [], solver_readiness: 'N/A — single section reviewed' };
  }

  const sectionSummaries = allPass1Results.map(summariseSection).join('\n\n');
  const dependencyMatrix = buildDependencyMatrix();

  const systemPrompt = `${DEFAULT_PLATFORM_PREAMBLE}

## YOUR TASK: CROSS-SECTION CONSISTENCY AUDIT

You have just received the results of individual section reviews for an innovation challenge.
Your job is to find **inconsistencies BETWEEN sections** that the per-section reviewers could not detect because they reviewed sections in separate batches.

Focus on:
1. **Data Conflicts**: Numbers, dates, amounts, or counts that contradict between sections (e.g., deliverables lists 5 items but evaluation criteria only covers 3).
2. **Scope Misalignment**: Sections that promise or require things outside the stated scope.
3. **Timeline Impossibility**: Phase schedule that doesn't allow enough time for the stated deliverables at the stated complexity.
4. **Reward-Effort Mismatch**: Reward structure that doesn't match the effort implied by deliverables and complexity.
5. **Terminology Drift**: Key terms defined differently or used inconsistently across sections.
6. **Narrative Breaks**: The challenge story (Problem → Cause → Solution → Deliverables → Measurement → Reward) has logical gaps.
7. **Solver Perspective Gaps**: A solver reading all sections together would be confused by contradictions.

## DEPENDENCY RULES TO VERIFY
${dependencyMatrix}

## SCORING
- overall_coherence_score: 0-100 rating of how well sections work together as a whole.
  90+ = publication-ready coherence. 70-89 = minor inconsistencies. 50-69 = significant gaps. <50 = major contradictions.

IMPORTANT: Only report GENUINE inconsistencies with specific evidence. Do NOT repeat issues already found in individual section reviews — focus on CROSS-SECTION problems only.`;

  const userPrompt = `## CHALLENGE OVERVIEW
Title: ${challengeData.title || '(untitled)'}
Maturity: ${challengeData.maturity_level || 'unknown'}
Complexity: ${challengeData.complexity_level || 'unknown'} (Score: ${challengeData.complexity_score ?? 'N/A'})
IP Model: ${challengeData.ip_model || 'not set'}
Currency: ${challengeData.currency_code || 'USD'}

## INDIVIDUAL SECTION REVIEW RESULTS
${sectionSummaries}

Analyze the above section results for cross-section inconsistencies. Return findings via the check_consistency tool.`;

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
          name: 'check_consistency',
          description: 'Return cross-section consistency findings, overall coherence score, narrative gaps, and solver readiness assessment.',
          parameters: {
            type: 'object',
            properties: {
              findings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_section: { type: 'string', description: 'Section where the inconsistency originates or is most visible.' },
                    target_section: { type: 'string', description: 'The other section involved in the inconsistency.' },
                    inconsistency: { type: 'string', description: 'Specific description of the contradiction or misalignment. Must reference concrete data from both sections.' },
                    severity: { type: 'string', enum: ['error', 'warning'], description: 'error = must fix before publication, warning = should improve.' },
                    resolution: { type: 'string', description: 'Specific action to resolve: which section to change, and how.' },
                    evidence: { type: 'string', description: 'Quote or reference the specific data points from each section that conflict.' },
                  },
                  required: ['source_section', 'target_section', 'inconsistency', 'severity', 'resolution', 'evidence'],
                },
                description: 'Cross-section inconsistencies found. Empty array if sections are consistent.',
              },
              overall_coherence_score: {
                type: 'number',
                description: '0-100 score for how well all sections work together. 90+ = excellent coherence.',
              },
              narrative_gaps: {
                type: 'array',
                items: { type: 'string' },
                description: 'Logical gaps in the challenge narrative (Problem → Solution → Measurement). Each gap is a sentence describing what is missing from the story.',
              },
              solver_readiness: {
                type: 'string',
                description: 'One paragraph: would a top solver reading ALL sections together have enough consistent information to decide whether to participate and produce a quality submission? Cite specific strengths and weaknesses.',
              },
            },
            required: ['findings', 'overall_coherence_score', 'narrative_gaps', 'solver_readiness'],
          },
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'check_consistency' } },
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
    console.error('AI gateway error (Consistency Pass):', response.status, errText);
    throw new Error(`Consistency pass failed: ${response.status}`);
  }

  const result = await response.json();

  // Token usage logging
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'consistency_pass',
    sectionCount: allPass1Results.length,
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error('Consistency pass: AI did not return structured output');
    return { findings: [], overall_coherence_score: 0, narrative_gaps: [], solver_readiness: 'Consistency check could not be completed.' };
  }

  const parsed = JSON.parse(toolCall.function.arguments);

  return {
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    overall_coherence_score: typeof parsed.overall_coherence_score === 'number' ? parsed.overall_coherence_score : 0,
    narrative_gaps: Array.isArray(parsed.narrative_gaps) ? parsed.narrative_gaps : [],
    solver_readiness: parsed.solver_readiness || '',
  };
}

/**
 * Merge consistency findings back into section results.
 * Adds findings as cross_section_issues and injects consistency comments.
 */
export function mergeConsistencyFindings(
  sectionResults: Array<Record<string, unknown>>,
  consistencyResult: ConsistencyPassResult,
): void {
  if (consistencyResult.findings.length === 0) return;

  const resultMap = new Map<string, Record<string, unknown>>();
  for (const r of sectionResults) {
    resultMap.set(r.section_key as string, r);
  }

  for (const finding of consistencyResult.findings) {
    // Add to both source and target sections
    for (const sectionKey of [finding.source_section, finding.target_section]) {
      const section = resultMap.get(sectionKey);
      if (!section) continue;

      // Add as cross_section_issue
      if (!Array.isArray(section.cross_section_issues)) {
        section.cross_section_issues = [];
      }
      (section.cross_section_issues as Array<Record<string, string>>).push({
        related_section: sectionKey === finding.source_section ? finding.target_section : finding.source_section,
        issue: finding.inconsistency,
        suggested_resolution: finding.resolution,
        source: 'consistency_pass',
      });

      // Add as a comment
      if (!Array.isArray(section.comments)) {
        section.comments = [];
      }
      (section.comments as Array<Record<string, unknown>>).push({
        text: `[CONSISTENCY] ${finding.inconsistency}`,
        type: finding.severity,
        field: null,
        reasoning: `Cross-section conflict with ${sectionKey === finding.source_section ? finding.target_section : finding.source_section}. Evidence: ${finding.evidence}. Resolution: ${finding.resolution}`,
        confidence: 'high',
        evidence_basis: finding.evidence,
        source: 'consistency_pass',
      });

      // Escalate status if error-level finding on a passing section
      if (finding.severity === 'error' && section.status === 'pass') {
        section.status = 'warning';
      }
    }
  }

  // Log consistency summary
  console.log(JSON.stringify({
    event: 'consistency_pass_summary',
    findings_count: consistencyResult.findings.length,
    error_count: consistencyResult.findings.filter(f => f.severity === 'error').length,
    warning_count: consistencyResult.findings.filter(f => f.severity === 'warning').length,
    overall_coherence_score: consistencyResult.overall_coherence_score,
    narrative_gaps_count: consistencyResult.narrative_gaps.length,
    timestamp: new Date().toISOString(),
  }));
}
