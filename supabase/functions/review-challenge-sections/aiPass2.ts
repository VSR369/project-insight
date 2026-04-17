/**
 * aiPass2.ts — Pass 2 (Rewrite) AI call.
 * Extracted from aiCalls.ts for decomposition.
 * 
 * PROMPT 4: Enhanced tool schema with self-validation forcing:
 * - issues_addressed: list of issue indices the rewrite addresses
 * - changes_summary: what was changed and why
 * - confidence_score: 0-100 rewrite quality self-assessment
 * - preserved_strengths: what good content was kept intact
 * + reasoning_effort parameter support
 */

import { buildPass2SystemPrompt, getSuggestionFormatInstruction, getSectionFormatType, sanitizeTableSuggestion, buildContextIntelligence, SECTION_WAVE_CONTEXT, type SectionConfig } from "./promptTemplate.ts";
import { SECTION_FIELD_ALIASES, SECTION_DEPENDENCIES, DEPENDENCY_REASONING } from "./aiCalls.ts";

import { callAIWithFallback } from "../_shared/aiModelConfig.ts";

/**
 * Per-section Pass 2 failure marker. Surfaced to caller so the invoker / UI
 * can distinguish a TRUNCATED / MALFORMED / MISSING suggestion from a genuine
 * "no suggestion needed" outcome. Caller reads via the `__failures` side-channel
 * on the returned Map.
 */
export type Pass2FailureCode = 'TRUNCATED' | 'MALFORMED' | 'MISSING';
export interface Pass2SectionFailure {
  section_key: string;
  code: Pass2FailureCode;
  reason: string;
}

/** Output token cap for Pass 2 — prevents silent truncation under HIGH reasoning. */
const PASS2_MAX_TOKENS = 32768;

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

export async function callAIPass2Rewrite(
  apiKey: string,
  model: string,
  pass1Results: any[],
  challengeData: any,
  waveAction: string,
  clientContext?: any,
  sectionConfigs?: SectionConfig[],
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  orgContext?: any,
  attachmentsBySection?: Record<string, { name: string; sourceType: string; sourceUrl?: string; content: string; summary?: string; keyData?: Record<string, unknown>; resourceType?: string; sharedWithSolver: boolean }[]>,
  contextDigestText?: string,
  useContextIntelligence?: boolean,
  reasoningEffort?: string,
): Promise<Map<string, string>> {
  // All sections get suggestions — the curator decides what to accept
  const sectionsNeedingSuggestion = pass1Results;

  if (sectionsNeedingSuggestion.length === 0) {
    return new Map();
  }

  // Build per-section rewrite instructions
  const sectionPrompts = sectionsNeedingSuggestion.map((r: any) => {
    const aliasedFieldLookup = SECTION_FIELD_ALIASES[r.section_key] || r.section_key;
    let originalContent = challengeData[aliasedFieldLookup] ?? challengeData[r.section_key];
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

    // Number issues for traceability in issues_addressed
    const actionableComments = r.comments
      .filter((c: any) => c.type === 'error' || c.type === 'warning' || c.type === 'suggestion')
      .map((c: any, i: number) => `${i + 1}. [${c.type.toUpperCase()}${c.confidence ? ` | ${c.confidence} confidence` : ''}] ${c.text}${c.field ? ` (field: ${c.field})` : ''}${c.evidence_basis ? ` — Evidence: ${c.evidence_basis}` : ''}`)
      .join('\n');

    const bestPractices = r.comments
      .filter((c: any) => c.type === 'best_practice')
      .map((c: any) => `- ${c.text}`)
      .join('\n');

    const strengths = r.comments
      .filter((c: any) => c.type === 'strength')
      .map((c: any) => `- ✅ ${c.text}`)
      .join('\n');
    const strengthBlock = strengths
      ? `\nSTRENGTHS TO PRESERVE (these are GOOD — keep them intact while improving other areas):\n${strengths}\n`
      : '';

    const crossIssues = pass1Results
      .flatMap((p1: any) => (p1.cross_section_issues || []))
      .filter((issue: any) =>
        issue.related_section === r.section_key ||
        issue.source_section === r.section_key
      )
      .map((issue: any, i: number) => `${i + 1}. [CROSS-SECTION] ${issue.issue}${issue.suggested_resolution ? ` → Resolution: ${issue.suggested_resolution}` : ''}`)
      .join('\n');
    const crossIssueBlock = crossIssues
      ? `\nCROSS-SECTION ISSUES INVOLVING THIS SECTION (from analysis — MUST be addressed in your rewrite):\n${crossIssues}\n`
      : '';

    // Include missing_elements from Pass 1 if available
    const missingElements = Array.isArray(r.missing_elements) && r.missing_elements.length > 0
      ? `\nMISSING ELEMENTS (must be added in rewrite):\n${r.missing_elements.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n')}\n`
      : '';

    // Include quality_score context for calibration
    const qualityContext = typeof r.quality_score === 'number'
      ? `\nPASS 1 QUALITY SCORE: ${r.quality_score}/100 — your rewrite should achieve 85+ for this section.\n`
      : '';

    const formatInstruction = getSuggestionFormatInstruction(r.section_key);
    const formatType = getSectionFormatType(r.section_key);

    const deps = SECTION_DEPENDENCIES[r.section_key] || [];
    const reasoningMap = DEPENDENCY_REASONING[r.section_key] || {};
    const depParts: string[] = [];
    for (const depKey of deps) {
      const af = SECTION_FIELD_ALIASES[depKey] || depKey;
      let content = challengeData[af] ?? challengeData[depKey];
      if (!content && EXTENDED_BRIEF_KEYS.has(depKey) && challengeData.extended_brief) {
        try {
          const ebField = EB_FIELD_MAP[depKey] || depKey;
          const eb = typeof challengeData.extended_brief === 'string'
            ? JSON.parse(challengeData.extended_brief)
            : challengeData.extended_brief;
          content = eb?.[ebField];
        } catch { /* ignore */ }
      }
      if (!content) continue;
      const str = typeof content === 'string' ? content : JSON.stringify(content);
      if (str.length < 5) continue;
      const cleaned = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const reasoning = reasoningMap[depKey] || 'REVIEW for consistency and alignment.';
      depParts.push(`${depKey} [${reasoning}]:\n${cleaned.substring(0, 1500)}`);
    }
    const depBlock = depParts.length > 0
      ? `\nRELATED SECTIONS — CHECK EACH FOR THE STATED REASON:\n${depParts.join('\n\n')}\n`
      : '';

    const waveCtx = SECTION_WAVE_CONTEXT[r.section_key];
    const waveBlock = waveCtx
      ? `\nWAVE POSITION: ${waveCtx.wave} (${waveCtx.waveName}). ${waveCtx.strategicRole}\n${waveCtx.downstreamSections.length > 0 ? `Your output will affect: ${waveCtx.downstreamSections.join(', ')}. Ensure consistency.\n` : ''}`
      : '';

    return `### Section: ${r.section_key}
${r.status === 'generated' ? `ACTION: Generate new content from scratch. Follow this generation strategy:
1. DERIVE from upstream sections: Extract relevant details from problem_statement, scope, deliverables, and other established sections listed in RELATED SECTIONS below.
2. APPLY DOMAIN EXPERTISE: What would a ${challengeData.maturity_level || 'POC'}-level challenge in this domain typically include for this section? Use industry standards and your consulting experience.
3. REFERENCE ATTACHED MATERIALS: If reference materials (files/URLs) are provided for this section, extract specific data points and incorporate them.
4. QUANTIFY: Include specific numbers, metrics, ranges, and benchmarks — not vague qualifiers.
5. STRUCTURE: Follow the exact format instruction below. Every field must be populated with meaningful content, not placeholders.` : 'ACTION: Revise the existing content to address all issues below while preserving identified strengths.'}
${waveBlock}

FORMAT: ${formatType}. ${formatInstruction}
${qualityContext}
ORIGINAL CONTENT:
${contentStr}
${depBlock}
    ${(() => {
      const sectionAtts = (attachmentsBySection || {})[r.section_key] || [];
      if (sectionAtts.length === 0) return '';
      let block = '\nREFERENCE MATERIALS for this section:\n';

      for (const a of sectionAtts) {
        const typeTag = a.sourceType === 'url' ? 'WEB PAGE' : 'DOCUMENT';
        const shareTag = a.sharedWithSolver ? 'SHARED WITH SOLVERS' : 'AI-ONLY';
        block += `--- [${typeTag}] ${a.name} [${shareTag}] ---\n`;
        if (a.sourceUrl) block += `Source: ${a.sourceUrl}\n`;
        if (a.resourceType) block += `Type: ${a.resourceType}\n`;

        if (a.summary) block += `KEY POINTS:\n${a.summary}\n`;
        if (a.keyData && Object.keys(a.keyData).length > 0) block += `VERIFIED DATA: ${JSON.stringify(a.keyData)}\n`;

        // Include full attachment content ONLY when no summary exists.
        // Cap at 4K chars to prevent a single large file from blowing the prompt budget.
        const includeFull = !a.summary;
        if (includeFull) {
          const maxContentLen = 4000;
          const contentToInclude = a.content.length > maxContentLen
            ? a.content.substring(0, maxContentLen) + '\n[... content truncated for token budget — see KEY POINTS / VERIFIED DATA above ...]'
            : a.content;
          block += `CONTENT:\n${contentToInclude}\n`;
        }
      }
      block += `\nUse these to inform your rewrite. For AI-ONLY items, embed key data into section content directly.`;
      block += `\n\nGROUNDING RULE: Every factual claim, statistic, or benchmark MUST trace to the VERIFIED CONTEXT DIGEST or a REFERENCE MATERIAL. If a claim is NOT from these sources, prefix it with [INFERENCE] so the Curator can verify independently.\n`;
      return block;
    })()}
${strengthBlock}${missingElements}
ISSUES TO ADDRESS (${actionableComments ? actionableComments.split('\n').length : 0} items):
${actionableComments || '(No specific issues — generate fresh content based on challenge context)'}
${crossIssueBlock}
${bestPractices ? `BEST PRACTICES TO INCORPORATE:\n${bestPractices}` : ''}

${r.guidelines?.length > 0 ? `GUIDELINES:\n- ${r.guidelines.join('\n- ')}` : ''}

Produce the REVISED/GENERATED content now. In your response, list which numbered issues you addressed in issues_addressed, and summarize your key changes.`;
  });

  const pass2UserPrompt = `Rewrite/generate content for the following ${sectionPrompts.length} section(s).

CHALLENGE CONTEXT:
Title: ${challengeData.title || '(untitled)'}
Solution Type: ${clientContext?.solutionType || challengeData.solution_type || 'not set'}
Maturity Level: ${clientContext?.maturityLevel || challengeData.maturity_level || 'not set'}
Complexity: ${clientContext?.complexityLevel || challengeData.complexity_level || 'not set'} (Score: ${challengeData.complexity_score || 'N/A'})
Operating Model: ${challengeData.operating_model || 'marketplace'}
Currency: ${challengeData.currency_code || 'USD'}
${clientContext?.rateCard ? `Rate Card: Floor $${clientContext.rateCard.effortRateFloor}/hr, Reward floor $${clientContext.rateCard.rewardFloorAmount}` : ''}
Today's Date: ${clientContext?.todaysDate || new Date().toISOString().split('T')[0]}

CHALLENGE SUMMARY (for cross-referencing — detailed per-section content is provided below):
Problem: ${(challengeData.problem_statement || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 300)}...
Scope: ${(challengeData.scope || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 300)}...
Domain Tags: ${JSON.stringify(challengeData.domain_tags || [])}
Deliverable Count: ${Array.isArray(challengeData.deliverables) ? challengeData.deliverables.length : 'N/A'}
IP Model: ${challengeData.ip_model || 'not set'}

SECTIONS TO REWRITE:
${sectionPrompts.join('\n\n---\n\n')}`;

  let pass2SystemPrompt: string;
  if (sectionConfigs && sectionConfigs.length > 0) {
    const pass2ConfigKeys = sectionsNeedingSuggestion.map((r: any) => r.section_key);
    const pass2Configs = pass2ConfigKeys
      .map((key: string) => sectionConfigs.find((c: SectionConfig) => c.section_key === key))
      .filter(Boolean) as SectionConfig[];

    const enrichedContext = {
      ...clientContext,
      sections: challengeData,
    };

    const correctionsBlock = enrichedContext?._correctionsBlock || undefined;

    pass2SystemPrompt = pass2Configs.length > 0
      ? buildPass2SystemPrompt(pass2Configs, enrichedContext, masterDataOptions, correctionsBlock)
      : buildPass2SystemPrompt([], enrichedContext, masterDataOptions, correctionsBlock);
  } else {
    const correctionsBlock = clientContext?._correctionsBlock || undefined;
    pass2SystemPrompt = buildPass2SystemPrompt([], clientContext, masterDataOptions, correctionsBlock);
  }

  const contextIntel = buildContextIntelligence(challengeData, clientContext, orgContext);
  pass2SystemPrompt = pass2SystemPrompt + '\n\n' + contextIntel + (contextDigestText || '');

  // Build request body with optional reasoning_effort
  const requestBody: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_tokens: PASS2_MAX_TOKENS,
    messages: [
      { role: "system", content: pass2SystemPrompt },
      { role: "user", content: pass2UserPrompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "suggest_content",
          description: "Return revised/generated content for each section. Every suggestion MUST address ALL issues listed. Include self-validation: which issues were addressed, what changed, and confidence in the result.",
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
                    issues_addressed: {
                      type: "array",
                      items: { type: "number" },
                      description: "List of issue numbers (from ISSUES TO ADDRESS) that this rewrite resolves. If you addressed all 5 issues, return [1,2,3,4,5]. Missing numbers indicate unaddressed issues — explain why in changes_summary.",
                    },
                    changes_summary: {
                      type: "string",
                      description: "Brief summary of key changes made and WHY. E.g., 'Added acceptance criteria to deliverables 2 and 4 (issues #1, #3), quantified timeline from vague \"soon\" to specific 12-week phases (issue #5). Issue #2 (budget alignment) not addressed — requires seeker input on budget range.'",
                    },
                    confidence_score: {
                      type: "number",
                      description: "Self-assessed quality score 0-100 for this rewrite. 90+ = publication-ready, addresses all issues, matches format perfectly. 70-89 = good but may need curator polish. <70 = significant gaps remain. Be honest — overconfidence is worse than underconfidence.",
                    },
                    preserved_strengths: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of specific strengths from the original content that were intentionally kept. E.g., 'Kept the quantified baseline metric of 23% MAPE', 'Preserved the seeker-authored preferred approach language'.",
                    },
                  },
                  required: ["section_key", "suggestion", "issues_addressed", "changes_summary", "confidence_score"],
                },
              },
            },
            required: ["sections"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "suggest_content" } },
  };

  // Add reasoning_effort if configured (supported by compatible models)
  if (reasoningEffort && reasoningEffort !== 'default') {
    (requestBody as any).reasoning_effort = reasoningEffort;
  }

  const inputKeys = sectionsNeedingSuggestion.map((s: any) => s.section_key as string);
  const failures: Pass2SectionFailure[] = [];
  const suggestionMap = await runPass2Call(
    apiKey,
    requestBody,
    model,
    inputKeys,
    sectionsNeedingSuggestion,
    pass2SystemPrompt,
    failures,
    /* allowSplit */ true,
  );

  // Backfill MISSING markers for any input key the AI silently skipped
  for (const key of inputKeys) {
    if (!suggestionMap.has(key) && !failures.some((f) => f.section_key === key)) {
      failures.push({
        section_key: key,
        code: 'MISSING',
        reason: 'AI did not return a suggestion for this section.',
      });
      console.warn(JSON.stringify({
        event: 'pass2_missing_suggestion',
        section_key: key,
        model: model || 'unknown',
        timestamp: new Date().toISOString(),
      }));
    }
  }

  // Side-channel: expose failures to caller without changing return type.
  if (failures.length > 0) {
    Object.defineProperty(suggestionMap, '__failures', {
      value: failures,
      enumerable: false,
      writable: false,
    });
  }

  return suggestionMap;
}

/**
 * runPass2Call — Issues one Pass 2 request with the given input keys.
 * On `finish_reason === 'length'` and batch size > 1, recursively splits in
 * half and retries each half. On single-section truncation or JSON parse
 * failure, records a per-section failure marker. Always returns a Map of
 * successfully extracted suggestions; never returns empty for whole-batch
 * failures unless every retry path failed.
 */
async function runPass2Call(
  apiKey: string,
  baseRequestBody: Record<string, unknown>,
  model: string,
  inputKeys: string[],
  pass1ResultsForBatch: any[],
  pass2SystemPrompt: string,
  failures: Pass2SectionFailure[],
  allowSplit: boolean,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const response = await callAIWithFallback(apiKey, baseRequestBody, model);

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    const errText = await response.text();
    console.error("AI gateway error (Pass 2):", response.status, errText);
    for (const k of inputKeys) {
      failures.push({ section_key: k, code: 'MALFORMED', reason: `AI gateway error ${response.status}.` });
    }
    return map;
  }

  const result = await response.json();

  // Token usage logging — Pass 2
  const tokenUsage = result.usage || {};
  console.log(JSON.stringify({
    event: 'ai_review_tokens',
    pass: 'pass2_rewrite',
    sectionKeys: inputKeys,
    model: result.model || model || 'unknown',
    prompt_tokens: tokenUsage.prompt_tokens || 0,
    completion_tokens: tokenUsage.completion_tokens || 0,
    total_tokens: tokenUsage.total_tokens || 0,
    timestamp: new Date().toISOString(),
  }));

  const finishReason = result.choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    console.warn(JSON.stringify({
      event: 'ai_review_truncated',
      pass: 'pass2_rewrite',
      sectionKeys: inputKeys,
      batch_size: inputKeys.length,
      model: result.model || model,
      timestamp: new Date().toISOString(),
    }));
    if (inputKeys.length > 1 && allowSplit) {
      // Split-and-retry: halve the batch and re-issue Pass 2 for each half.
      const mid = Math.ceil(inputKeys.length / 2);
      const leftKeys = inputKeys.slice(0, mid);
      const rightKeys = inputKeys.slice(mid);
      const leftBatch = pass1ResultsForBatch.filter((r: any) => leftKeys.includes(r.section_key));
      const rightBatch = pass1ResultsForBatch.filter((r: any) => rightKeys.includes(r.section_key));

      const buildSplitBody = (subset: any[]) => {
        // Rebuild the user prompt with only the subset of section blocks
        const subsetBody = { ...baseRequestBody };
        const messages = (baseRequestBody.messages as any[]).slice();
        const userMsg = messages[messages.length - 1];
        const newUserContent = (userMsg?.content as string ?? '').split('SECTIONS TO REWRITE:')[0]
          + 'SECTIONS TO REWRITE:\n'
          + subset.map((r: any) => `### Section: ${r.section_key}\n[Pass 2 split-retry — see Pass 1 issues for ${r.section_key}]`).join('\n\n---\n\n');
        subsetBody.messages = [
          messages[0],
          { role: 'user', content: newUserContent },
        ];
        return subsetBody;
      };

      const [leftMap, rightMap] = await Promise.all([
        runPass2Call(apiKey, buildSplitBody(leftBatch), model, leftKeys, leftBatch, pass2SystemPrompt, failures, /* allowSplit */ false),
        runPass2Call(apiKey, buildSplitBody(rightBatch), model, rightKeys, rightBatch, pass2SystemPrompt, failures, /* allowSplit */ false),
      ]);
      for (const [k, v] of leftMap.entries()) map.set(k, v);
      for (const [k, v] of rightMap.entries()) map.set(k, v);
      return map;
    }
    // Single-section or split exhausted — mark every key as TRUNCATED
    for (const k of inputKeys) {
      failures.push({
        section_key: k,
        code: 'TRUNCATED',
        reason: 'AI output was truncated (max_tokens reached). Re-run this section individually with a tighter prompt.',
      });
    }
    return map;
  }

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error("Pass 2: AI did not return structured output");
    for (const k of inputKeys) {
      failures.push({ section_key: k, code: 'MALFORMED', reason: 'AI did not return a tool call.' });
    }
    return map;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    console.error("Pass 2: tool_call JSON parse failed:", err);
    for (const k of inputKeys) {
      failures.push({ section_key: k, code: 'MALFORMED', reason: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}` });
    }
    return map;
  }

  const resultSections = parsed.sections ?? parsed;
  if (Array.isArray(resultSections)) {
    for (const s of resultSections) {
      if (s.section_key && s.suggestion) {
        if (s.changes_summary || s.confidence_score != null) {
          console.log(JSON.stringify({
            event: 'pass2_self_validation',
            section_key: s.section_key,
            issues_addressed: s.issues_addressed || [],
            confidence_score: s.confidence_score ?? null,
            preserved_strengths_count: (s.preserved_strengths || []).length,
            changes_summary: (s.changes_summary || '').substring(0, 200),
            timestamp: new Date().toISOString(),
          }));
        }
        const fmt = getSectionFormatType(s.section_key);
        if (fmt === 'table' || fmt === 'schedule_table') {
          map.set(s.section_key, sanitizeTableSuggestion(s.suggestion));
        } else {
          map.set(s.section_key, s.suggestion);
        }
      }
    }
  }

  return map;
}
