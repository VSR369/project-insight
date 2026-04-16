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

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

      const isSoloBatch = sectionsNeedingSuggestion.length === 1;
      const fewAttachments = sectionAtts.length <= 2;

      for (const a of sectionAtts) {
        const typeTag = a.sourceType === 'url' ? 'WEB PAGE' : 'DOCUMENT';
        const shareTag = a.sharedWithSolver ? 'SHARED WITH SOLVERS' : 'AI-ONLY';
        block += `--- [${typeTag}] ${a.name} [${shareTag}] ---\n`;
        if (a.sourceUrl) block += `Source: ${a.sourceUrl}\n`;
        if (a.resourceType) block += `Type: ${a.resourceType}\n`;

        if (a.summary) block += `KEY POINTS:\n${a.summary}\n`;
        if (a.keyData && Object.keys(a.keyData).length > 0) block += `VERIFIED DATA: ${JSON.stringify(a.keyData)}\n`;

        const includeFull = !useContextIntelligence || isSoloBatch || fewAttachments || !a.summary;
        if (includeFull) {
          const maxContentLen = 30000 * 4;
          const contentToInclude = a.content.length > maxContentLen
            ? a.content.substring(0, maxContentLen) + '\n[... content truncated for token budget ...]'
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

    pass2SystemPrompt = pass2Configs.length > 0
      ? buildPass2SystemPrompt(pass2Configs, enrichedContext, masterDataOptions)
      : buildPass2SystemPrompt([], enrichedContext, masterDataOptions);
  } else {
    pass2SystemPrompt = buildPass2SystemPrompt([], clientContext, masterDataOptions);
  }

  const contextIntel = buildContextIntelligence(challengeData, clientContext, orgContext);
  pass2SystemPrompt = pass2SystemPrompt + '\n\n' + contextIntel + (contextDigestText || '');

  // Build request body with optional reasoning_effort
  const requestBody: Record<string, unknown> = {
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
    console.error("AI gateway error (Pass 2):", response.status, errText);
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
    reasoning_effort: reasoningEffort || 'default',
    timestamp: new Date().toISOString(),
  }));

  // Detect finish_reason: 'length' (output truncation)
  const finishReason = result.choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    console.warn(JSON.stringify({
      event: 'ai_review_truncated',
      pass: 'pass2_rewrite',
      sectionKeys: sectionsNeedingSuggestion.map((s: any) => s.section_key),
      model: result.model || model,
      timestamp: new Date().toISOString(),
    }));
    if (sectionsNeedingSuggestion.length > 1) {
      console.error("Pass 2 output truncated with multiple sections — retry with smaller batches");
      return new Map();
    }
  }

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error("Pass 2: AI did not return structured output");
    return new Map();
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  const suggestionMap = new Map<string, string>();

  const resultSections = parsed.sections ?? parsed;
  if (Array.isArray(resultSections)) {
    for (const s of resultSections) {
      if (s.section_key && s.suggestion) {
        // Log self-validation metadata for observability
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
