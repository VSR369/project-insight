/**
 * aiCalls.ts — AI Pass 1 (Analyze) and Pass 2 (Rewrite) functions.
 * Extracted from index.ts (Phase D2.2).
 */

import { buildPass2SystemPrompt, getSuggestionFormatInstruction, getSectionFormatType, sanitizeTableSuggestion, buildContextIntelligence, SECTION_WAVE_CONTEXT, type SectionConfig } from "./promptTemplate.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/* ── Change 4: Clean literal escape sequences from AI output ── */
export function cleanAIOutput(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '\"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** Section keys that don't match their DB column names */
export const SECTION_FIELD_ALIASES: Record<string, string> = {
  solver_expertise: 'solver_expertise_requirements',
  eligibility: 'solver_eligibility_types',
  visibility: 'solver_visibility_types',
  submission_guidelines: 'description',
  solution_type: 'solution_types',
};

/* ── FIX 1: Cross-section dependency map ── */
export const SECTION_DEPENDENCIES: Record<string, string[]> = {
  // Wave 1
  problem_statement: [],
  scope: ['problem_statement'],
  expected_outcomes: ['problem_statement', 'scope'],
  context_and_background: ['problem_statement'],
  // Wave 2
  root_causes: ['problem_statement', 'context_and_background'],
  affected_stakeholders: ['problem_statement', 'scope'],
  current_deficiencies: ['problem_statement', 'root_causes'],
  preferred_approach: ['problem_statement', 'root_causes'],
  approaches_not_of_interest: ['preferred_approach'],
  // Wave 3
  solution_type: ['problem_statement', 'scope'],
  deliverables: ['problem_statement', 'scope', 'expected_outcomes', 'solution_type'],
  maturity_level: ['deliverables', 'scope'],
  data_resources_provided: ['deliverables', 'scope'],
  success_metrics_kpis: ['expected_outcomes', 'deliverables'],
  // Wave 4
  complexity: ['solution_type', 'deliverables', 'scope', 'maturity_level', 'data_resources_provided'],
  solver_expertise: ['solution_type', 'deliverables', 'scope', 'domain_tags'],
  eligibility: ['solver_expertise', 'maturity_level', 'complexity'],
  // Wave 5
  phase_schedule: ['deliverables', 'maturity_level', 'complexity'],
  evaluation_criteria: ['deliverables', 'expected_outcomes', 'scope'],
  submission_guidelines: ['deliverables', 'evaluation_criteria', 'phase_schedule'],
  reward_structure: ['complexity', 'maturity_level', 'deliverables', 'phase_schedule', 'solver_expertise'],
  ip_model: ['deliverables', 'maturity_level', 'reward_structure'],
  // Wave 6
  hook: ['problem_statement', 'scope', 'deliverables', 'reward_structure', 'domain_tags'],
  visibility: ['solver_expertise', 'eligibility'],
  domain_tags: ['problem_statement', 'scope', 'deliverables', 'solution_type'],
};

/** What to check FOR when reviewing a section against its dependencies */
export const DEPENDENCY_REASONING: Record<string, Record<string, string>> = {
  evaluation_criteria: {
    deliverables: 'VERIFY: Every criterion can be assessed from at least one deliverable. Every deliverable has at least one criterion evaluating it. Flag orphaned criteria or unevaluated deliverables.',
    expected_outcomes: 'VERIFY: Criteria weights reflect the relative importance of outcomes. The highest-weighted criterion should evaluate the most critical outcome.',
    scope: 'VERIFY: Criteria don\'t assess anything outside scope. No criterion should require deliverables not listed in scope.',
    submission_guidelines: 'VERIFY: Every criterion can be assessed from the submission format specified. If criterion requires a live demo but submission guidelines only mention PDF, flag the gap.',
  },
  reward_structure: {
    complexity: 'SCALE: Higher complexity (L4-L5) justifies higher rewards. L1-L2 challenges with $100K+ rewards are suspicious.',
    maturity_level: 'SCALE: Blueprint $5K-$25K, POC $25K-$100K, Pilot $100K-$500K. Significant deviations need justification.',
    deliverables: 'VERIFY: Reward proportional to deliverable effort. 10 complex deliverables at $5K total is inadequate.',
    phase_schedule: 'VERIFY: Compressed timelines justify premium rewards. 4-week sprints need higher per-week rates than 16-week projects.',
    solver_expertise: 'SCALE: Specialized expertise (niche certifications, PhD-level research) commands premium rewards. If requiring rare expertise at low reward, top solvers will skip this challenge.',
  },
  deliverables: {
    problem_statement: 'VERIFY: Every deliverable addresses some aspect of the problem. No deliverables that solve a different problem.',
    scope: 'VERIFY: Deliverables collectively cover the full scope. No scope items left unaddressed. No deliverables outside scope.',
    expected_outcomes: 'VERIFY: Deliverables, when completed, would achieve the expected outcomes. If outcome says "reduce cost by 30%" but no deliverable includes cost analysis, flag the gap.',
    solution_type: 'VERIFY: Deliverable types match solution type. AI/ML type → model deliverables. Process type → process map deliverables.',
  },
  solver_expertise: {
    solution_type: 'ALIGN: Required expertise must match solution type. AI/ML solutions need ML engineers, not just "data professionals".',
    deliverables: 'ALIGN: Expertise level must match deliverable complexity. Production Kubernetes deployment requires DevOps expertise, not just cloud familiarity.',
    scope: 'ALIGN: Breadth of expertise should match scope breadth. Multi-domain scope needs either broad expertise or team requirement.',
    domain_tags: 'ALIGN: Domain-specific expertise should match domain tags. Supply chain challenge needs supply chain domain knowledge, not just technical skills.',
  },
  phase_schedule: {
    deliverables: 'VERIFY: Total duration is sufficient for all deliverables. 5 complex deliverables in 4 weeks is unrealistic.',
    maturity_level: 'SCALE: Blueprint 4-8 weeks, POC 8-16 weeks, Pilot 16-32 weeks. Compressed schedules increase risk.',
    complexity: 'SCALE: Higher complexity needs longer timelines. L4-L5 complexity with L1-L2 timeline is a red flag.',
    evaluation_criteria: 'VERIFY: Evaluation phase duration is sufficient for the number and complexity of criteria. 5 criteria with expert panel review needs more eval time than 3 automated criteria.',
  },
  submission_guidelines: {
    deliverables: 'VERIFY: Every deliverable has a submission format specified. If deliverable includes code, submission must request repo access.',
    evaluation_criteria: 'VERIFY: Submission format enables assessment of every criterion. Can\'t evaluate "demo quality" without requesting a demo.',
    phase_schedule: 'VERIFY: Submission deadline has sufficient buffer after work period. Evaluation phase has sufficient time for the number of criteria.',
  },
  hook: {
    problem_statement: 'EXTRACT: Pull the most compelling aspect of the problem — the "so what" that makes a solver care.',
    scope: 'EXTRACT: Reference the most exciting or unique aspect of the scope.',
    deliverables: 'EXTRACT: Mention the most tangible deliverable to make the opportunity feel real.',
    reward_structure: 'EXTRACT: Reference the reward to create concrete motivation. "$75K for a working prototype" is better than "competitive rewards".',
    domain_tags: 'REFERENCE: Include domain-specific language that signals to the right solvers. "Edge ML for vibration analysis" attracts different solvers than "AI solution".',
  },
  ip_model: {
    deliverables: 'MATCH: Tangible IP (code, algorithms, designs) → IP-EA or IP-EL. Intangible (advice, analysis) → IP-NONE or IP-NEL.',
    maturity_level: 'MATCH: Blueprint rarely produces transferable IP (use IP-NONE). Pilot always does (use IP-EA or IP-EL).',
    reward_structure: 'BALANCE: Stronger IP transfer demands higher reward. IP-EA with low reward drives away top solvers.',
  },
  scope: {
    problem_statement: 'DERIVE: Every scope item should trace to the problem. If the problem is about customer churn, scope items about employee training are off-topic unless explicitly connected.',
  },
  expected_outcomes: {
    problem_statement: 'DERIVE: Outcomes should directly address the problem. If problem is "high defect rate", outcomes must include defect reduction targets.',
    scope: 'BOUND: Outcomes must be achievable within scope. Promising "50% cost reduction" when scope excludes process changes is misleading.',
  },
  success_metrics_kpis: {
    expected_outcomes: 'MAP: Every KPI must trace to an expected outcome. Orphaned KPIs (no matching outcome) are noise.',
    deliverables: 'FEASIBLE: KPI measurement methods must be implementable with the deliverables provided.',
  },
  root_causes: {
    problem_statement: 'DERIVE: Root causes must explain WHY the problem exists, not restate the problem. "High defect rate" is the problem; "No automated quality inspection at station 3" is a root cause.',
    context_and_background: 'CONSISTENT: Root causes should align with the operational context described. Technical root causes need technical context.',
  },
  maturity_level: {
    deliverables: 'MATCH: If deliverables include working code → not Blueprint. If deliverables are strategy documents → not Pilot.',
    scope: 'MATCH: Narrow, well-defined scope → POC appropriate. Broad, exploratory scope → Blueprint appropriate.',
  },
  visibility: {
    solver_expertise: 'MATCH: Highly specialized expertise → "named" may help evaluators assess credentials. General expertise → "anonymous" reduces bias.',
    eligibility: 'MATCH: Organization-tier eligibility → "named" enables team assessment. Individual-tier → "anonymous" preferred.',
  },
  eligibility: {
    solver_expertise: 'ALIGN: Eligibility tiers must match required expertise. Niche certifications may need TIER_2/TIER_3.',
    maturity_level: 'ALIGN: Pilot challenges typically need teams (TIER_2+). Blueprint can work with individuals (TIER_1).',
    complexity: 'MATCH: L4-L5 complexity typically needs TIER_2 or TIER_3 (teams/orgs). TIER_1 (individuals) for high complexity is risky unless the solver pool has exceptional specialists.',
  },
  data_resources_provided: {
    deliverables: 'VERIFY: Listed resources are sufficient for solvers to produce all deliverables. If deliverables require training data but no datasets are listed, flag the gap.',
    scope: 'VERIFY: Data resources cover the full scope of work. Missing resources for in-scope items block solver progress.',
    solver_expertise: 'MATCH: Data formats and tools should align with expected solver capabilities. Providing raw Spark datasets when targeting individual consultants (TIER_1) may be a mismatch.',
  },
};

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

/* ══════════════════════════════════════════════════════════════
 * PASS 1: ANALYZE — Generate comments, status, guidelines.
 * No suggestion field in the tool schema.
 * ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
 * PASS 2: REWRITE — Generate suggestions for sections that need them.
 * ══════════════════════════════════════════════════════════════ */

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
): Promise<Map<string, string>> {
  // Filter to sections that need suggestions
  const sectionsNeedingSuggestion = pass1Results.filter((r: any) => {
    const hasActionableComments = r.comments.some(
      (c: any) => c.type === 'error' || c.type === 'warning' || c.type === 'suggestion'
    );
    const aliasedField = SECTION_FIELD_ALIASES[r.section_key] || r.section_key;
    const sectionContent = challengeData[aliasedField] ?? challengeData[r.section_key];
    const isEmpty = !sectionContent || (typeof sectionContent === 'string' && sectionContent.trim().length === 0);
    return hasActionableComments || r.status === 'generated' || r.status === 'needs_revision' || r.status === 'warning' || waveAction === 'generate' || (isEmpty && r.status !== 'pass');
  });

  if (sectionsNeedingSuggestion.length === 0) {
    return new Map();
  }

  // Build per-section rewrite instructions
  const sectionPrompts = sectionsNeedingSuggestion.map((r: any) => {
    // Look up content — for extended brief subsections, check inside challengeData.extended_brief
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

    const actionableComments = r.comments
      .filter((c: any) => c.type === 'error' || c.type === 'warning' || c.type === 'suggestion')
      .map((c: any, i: number) => `${i + 1}. [${c.type.toUpperCase()}] ${c.text}${c.field ? ` (field: ${c.field})` : ''}`)
      .join('\n');

    const bestPractices = r.comments
      .filter((c: any) => c.type === 'best_practice')
      .map((c: any) => `- ${c.text}`)
      .join('\n');

    // Gap 3: Preserve strengths — tell LLM what to keep
    const strengths = r.comments
      .filter((c: any) => c.type === 'strength')
      .map((c: any) => `- ✅ ${c.text}`)
      .join('\n');
    const strengthBlock = strengths
      ? `\nSTRENGTHS TO PRESERVE (these are GOOD — keep them intact while improving other areas):\n${strengths}\n`
      : '';

    // Gap 2: Feed cross-section issues into Pass 2
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

    const formatInstruction = getSuggestionFormatInstruction(r.section_key);
    const formatType = getSectionFormatType(r.section_key);

    // FIX 1 + Improvement 2: Inject dependent section content with DIRECTED reasoning
    const deps = SECTION_DEPENDENCIES[r.section_key] || [];
    const reasoningMap = DEPENDENCY_REASONING[r.section_key] || {};
    const depParts: string[] = [];
    for (const depKey of deps) {
      const af = SECTION_FIELD_ALIASES[depKey] || depKey;
      let content = challengeData[af] ?? challengeData[depKey];
      // Also check extended_brief for EB subsections
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
      // Strip HTML for readability, truncate
      const cleaned = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const reasoning = reasoningMap[depKey] || 'REVIEW for consistency and alignment.';
      depParts.push(`${depKey} [${reasoning}]:\n${cleaned.substring(0, 1500)}`);
    }
    const depBlock = depParts.length > 0
      ? `\nRELATED SECTIONS — CHECK EACH FOR THE STATED REASON:\n${depParts.join('\n\n')}\n`
      : '';

    // Wave context injection for Pass 2
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

ORIGINAL CONTENT:
${contentStr}
${depBlock}
    ${(() => {
      const sectionAtts = (attachmentsBySection || {})[r.section_key] || [];
      if (sectionAtts.length === 0) return '';
      let block = '\nREFERENCE MATERIALS for this section:\n';

      // Gap 2: Tiered injection when context intelligence is enabled
      const isSoloBatch = sectionsNeedingSuggestion.length === 1;
      const fewAttachments = sectionAtts.length <= 2;

      for (const a of sectionAtts) {
        const typeTag = a.sourceType === 'url' ? 'WEB PAGE' : 'DOCUMENT';
        const shareTag = a.sharedWithSolver ? 'SHARED WITH SOLVERS' : 'AI-ONLY';
        block += `--- [${typeTag}] ${a.name} [${shareTag}] ---\n`;
        if (a.sourceUrl) block += `Source: ${a.sourceUrl}\n`;
        if (a.resourceType) block += `Type: ${a.resourceType}\n`;

        // TIER 2 (always): summary + keyData
        if (a.summary) block += `KEY POINTS:\n${a.summary}\n`;
        if (a.keyData && Object.keys(a.keyData).length > 0) block += `VERIFIED DATA: ${JSON.stringify(a.keyData)}\n`;

        // TIER 3 (conditional): full content only when solo batch, ≤2 attachments, or no summary
        const includeFull = !useContextIntelligence || isSoloBatch || fewAttachments || !a.summary;
        if (includeFull) {
          // Dynamic budget: truncate if >30K tokens (~120K chars) total
          const maxContentLen = 30000 * 4; // ~30K tokens ≈ 120K chars
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
${strengthBlock}
ISSUES TO ADDRESS (${actionableComments ? actionableComments.split('\n').length : 0} items):
${actionableComments || '(No specific issues — generate fresh content based on challenge context)'}
${crossIssueBlock}
${bestPractices ? `BEST PRACTICES TO INCORPORATE:\n${bestPractices}` : ''}

${r.guidelines?.length > 0 ? `GUIDELINES:\n- ${r.guidelines.join('\n- ')}` : ''}

Produce the REVISED/GENERATED content now. Return it in the "suggestion" field for this section_key.`;
  });

  // FIX 4: Enriched Pass 2 context header
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
      ? buildPass2SystemPrompt(pass2Configs, enrichedContext, masterDataOptions)
      : buildPass2SystemPrompt([], enrichedContext, masterDataOptions);
  } else {
    // Fallback to inline prompt when no configs available
    pass2SystemPrompt = buildPass2SystemPrompt([], clientContext, masterDataOptions);
  }

  // Bug 1: Prepend context intelligence for org/geography/industry awareness in Pass 2
  const contextIntel = buildContextIntelligence(challengeData, clientContext, orgContext);
  pass2SystemPrompt = contextIntel + (contextDigestText || '') + '\n\n' + pass2SystemPrompt;

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

  // Gap 5: Detect finish_reason: 'length' (output truncation)
  const finishReason = result.choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    console.warn(JSON.stringify({
      event: 'ai_review_truncated',
      pass: 'pass2_rewrite',
      sectionKeys: sectionsNeedingSuggestion.map((s: any) => s.section_key),
      model: result.model || model,
      timestamp: new Date().toISOString(),
    }));
    // If more than 1 section, the output was likely truncated — return empty to let batch split retry
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
 * ══════════════════════════════════════════════════════════════ */

export async function callAIBatchTwoPass(
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
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  orgContext?: any,
  attachmentsBySection?: Record<string, { name: string; sourceType: string; sourceUrl?: string; content: string; summary?: string; keyData?: Record<string, unknown>; resourceType?: string; sharedWithSolver: boolean }[]>,
  contextDigestText?: string,
  useContextIntelligence?: boolean,
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
    suggestionMap = await callAIPass2Rewrite(apiKey, model, pass1Results, challengeData, waveAction, clientContext, sectionConfigs, masterDataOptions, orgContext, attachmentsBySection, contextDigestText, useContextIntelligence);
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
