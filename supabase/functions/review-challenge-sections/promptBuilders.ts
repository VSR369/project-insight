/**
 * promptBuilders.ts — Batch prompt builders (Pass 1 analysis)
 * extracted from promptTemplate.ts.
 */

import type { SectionConfig } from './promptConstants.ts';
import {
  ROLE_CONTEXT_LABELS,
  SECTION_FORMAT_MAP,
  FORMAT_INSTRUCTIONS,
  EXTENDED_BRIEF_FORMAT_INSTRUCTIONS,
  DEFAULT_PLATFORM_PREAMBLE,
  buildProportionalityAnchor,
  getEffectiveQualityCriteria,
  getSectionName,
  hasStructuredData,
} from './promptConstants.ts';
import { INTELLIGENCE_DIRECTIVE, detectDomainFrameworks, SECTION_WAVE_CONTEXT } from './contextIntelligence.ts';
import { buildIndustryIntelligence, buildGeographyContext } from './industryGeoPrompt.ts';

/* ── Structured batch prompt (Phase 6) — Pass 1: Analysis Only ── */

export function buildStructuredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  clientContext?: any,
  challengeSections?: Record<string, any>,
): string {
  const firstConfig = configs[0];
  const parts: string[] = [];

  // Layer 1: Platform preamble
  parts.push(firstConfig.platform_preamble?.trim() || DEFAULT_PLATFORM_PREAMBLE);
  parts.push('');

  parts.push(INTELLIGENCE_DIRECTIVE);
  parts.push('');

  parts.push(buildProportionalityAnchor(clientContext));
  parts.push('');

  // Domain-specific framework injection
  {
    const frameworks = detectDomainFrameworks(
      challengeSections?.domain_tags,
      challengeSections?.problem_statement,
      challengeSections?.scope,
    );
    if (frameworks.length > 0) {
      parts.push(`## DOMAIN-SPECIFIC FRAMEWORKS FOR THIS CHALLENGE`);
      parts.push(`Based on the challenge domain, reference these frameworks in your comments and suggestions where applicable:`);
      parts.push(frameworks.join(', '));
      parts.push('');
    }
  }

  // Phase 11: Industry + Geography Intelligence
  if (clientContext?._industryPack || clientContext?._geoContext) {
    const industryBlock = buildIndustryIntelligence(
      clientContext._industryPack,
      clientContext._geoContext,
      clientContext._regionCode,
      configs.map(c => c.section_key),
    );
    if (industryBlock) parts.push(industryBlock);

    const geoBlock = buildGeographyContext(clientContext._geoContext);
    if (geoBlock) parts.push(geoBlock);
  }

  parts.push(`## OUTPUT FORMAT (PASS 1 — ANALYSIS ONLY)
For each section, return a JSON object via the review_sections function with:

1. **status**: "pass" | "warning" | "needs_revision" | "generated"
   - "pass" = content is good. STILL include 1-2 "strength" comments confirming what works well.
   - "warning" = minor issues that should be improved.
   - "needs_revision" = critical errors that must be fixed.
   - "generated" = section was empty, new content will be generated in the next step.

2. **comments**: Array of objects, each with:
   - "text": Clear, specific feedback referencing challenge details
   - "type": One of:
     - "error" — Must be fixed before publication. References specific quality criterion violated.
     - "warning" — Should be improved. Explains what would make it stronger.
     - "suggestion" — Nice-to-have enhancement. Optional improvement.
     - "best_practice" — Industry standard, framework reference, or analyst insight. Cite the source where possible.
     - "strength" — What is already good. Positive reinforcement with specific praise. REQUIRED for "pass" sections.
   - "field" (optional): Specific field this comment applies to
   - "reasoning" (optional): Why this matters, referencing other sections

3. **guidelines**: 1-3 domain-specific guidelines for this section.
   - MUST reference THIS challenge's domain, maturity, and solution type.
   - MUST NOT be generic (no "ensure quality" or "follow best practices").

4. **cross_section_issues**: Array of inconsistencies found with other sections.
   - Only include genuine conflicts.
   - Each must specify the related_section, the issue, and a suggested_resolution.

5. **solver_perspective_issues**: For each section, consider: "If I am a globally distributed solver seeing this challenge for the first time, with NO internal context about the seeker organization..."
   - What information is missing that I would need to decide whether to participate?
   - What terms or references are unclear or assume insider knowledge?
   - What is the risk/reward ratio from the solver's perspective — is this worth my time?
   - Where would I get stuck during execution because a requirement is ambiguous?
   
   Express these as comments with type "warning" and prefix the text with "[SOLVER VIEW]". These are among the most valuable comments — they catch problems that insiders are blind to.

IMPORTANT: Do NOT include a "suggestion" field. Your ONLY job in this pass is to provide thorough, specific analysis. Improved content will be generated in a separate step based on your comments.
Focus 100% of your attention on producing the most accurate, specific, and actionable analysis possible.
`);
  parts.push('');

  // Per-section (Layers 2-4)
  configs.forEach((config, i) => {
    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
    const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[config.section_key] || '';

    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);
    parts.push(`Format: ${fmt}. ${ebInstr || fmtInstr}`);

    // Wave context injection
    const waveCtx = SECTION_WAVE_CONTEXT[config.section_key];
    if (waveCtx) {
      parts.push(`POSITION: Wave ${waveCtx.wave} (${waveCtx.waveName}).`);
      parts.push(`STRATEGIC ROLE: ${waveCtx.strategicRole}`);
      if (waveCtx.upstreamSections.length > 0) {
        parts.push(`ESTABLISHED BY EARLIER SECTIONS (rely on these): ${waveCtx.upstreamSections.join(', ')}`);
      }
      if (waveCtx.downstreamSections.length > 0) {
        parts.push(`SECTIONS THAT DEPEND ON THIS (changes here cascade to): ${waveCtx.downstreamSections.join(', ')}`);
      }
    }

    const criteria = getEffectiveQualityCriteria(config);
    if (criteria.length > 0) {
      parts.push('Quality criteria to assess:');
      for (const c of criteria as any[]) {
        let line = `- **${c.name}** (${c.severity}): ${c.description}`;
        if (c.crossReferences?.length > 0) {
          line += ` Cross-check: ${c.crossReferences.map((k: string) => getSectionName(k)).join(', ')}.`;
        }
        parts.push(line);
      }
    }

    // Master data constraints (Layer 2)
    const constraints = config.master_data_constraints ?? [];
    if (constraints.length > 0) {
      for (const c of constraints as any[]) {
        const opts = masterDataOptions?.[config.section_key];
        if (opts?.length) {
          parts.push(`Allowed values for ${c.fieldName}: [${opts.map((o: any) => `"${o.code}" (${o.label})`).join(', ')}]${c.enforceStrictly ? ' (STRICT)' : ''}`);
        }
      }
    } else {
      const opts = masterDataOptions?.[config.section_key];
      if (opts?.length) {
        parts.push(`Allowed values: [${opts.map((o: any) => `"${o.code}" (${o.label})`).join(', ')}]`);
        parts.push(`You MUST only suggest values from this allowed list. Do not invent new codes.`);
      }
    }

    // Computation rules (Layer 2)
    const rules = config.computation_rules ?? [];
    for (const rule of rules as string[]) {
      const todaysDate = clientContext?.todaysDate || new Date().toISOString().split('T')[0];
      parts.push(`Rule: ${rule.replace(/\{\{todaysDate\}\}/g, todaysDate)}`);
    }

    // Content template (Layer 2)
    const templates = config.content_templates;
    if (templates && clientContext?.maturityLevel) {
      const ml = clientContext.maturityLevel.toLowerCase();
      const template = templates[ml];
      if (template) parts.push(`Template (${clientContext.maturityLevel}): ${template}`);
    }

    // Research directives (Layer 3)
    const searches = config.web_search_queries ?? [];
    if (searches.length > 0) {
      for (const s of searches as any[]) {
        const domain = clientContext?.subDomain || clientContext?.category || 'enterprise';
        const rendered = s.queryTemplate
          ?.replace(/\{\{domain\}\}/g, domain)
          ?.replace(/\{\{maturityLevel\}\}/g, clientContext?.maturityLevel || 'blueprint');
        parts.push(`Research: ${s.purpose} — "${rendered}" (${s.when})`);
      }
    }

    const frameworks = config.industry_frameworks ?? [];
    if (frameworks.length > 0) {
      parts.push(`Frameworks: ${(frameworks as string[]).join(', ')}`);
    }

    const sources = config.analyst_sources ?? [];
    if (sources.length > 0) {
      parts.push(`Analyst sources to cite: ${(sources as string[]).join(', ')}`);
    }

    // IP Model selection guidelines
    if (config.section_key === 'ip_model') {
      parts.push(`IP MODEL SELECTION GUIDELINES — your comments MUST provide reasoning for the recommended model:`);
      parts.push(`- "IP-EA" (Exclusive Assignment): Recommend when deliverables include proprietary IP.`);
      parts.push(`- "IP-NEL" (Non-Exclusive License): Recommend when the solution methodology has broad applicability.`);
      parts.push(`- "IP-EL" (Exclusive License): Recommend when seeker needs exclusive usage but solver retains ownership.`);
      parts.push(`- "IP-JO" (Joint Ownership): Recommend for collaborative R&D.`);
      parts.push(`- "IP-NONE" (No IP Transfer): Recommend for advisory/consulting challenges.`);
    }

    // Supervisor overrides (Layer 4)
    if (config.section_description) parts.push(`Description: ${config.section_description}`);
    if (config.review_instructions) parts.push(`Instructions: ${config.review_instructions}`);
    if (config.dos) parts.push(`Do: ${config.dos}`);
    if (config.donts) parts.push(`Don't: ${config.donts}`);
    parts.push(`Tone: ${config.tone} | Words: ${config.min_words}–${config.max_words}`);
    if (config.required_elements.length > 0) {
      parts.push(`Required: ${config.required_elements.join(', ')}`);
    }
    if (config.example_good) parts.push(`Good: ${config.example_good}`);
    if (config.example_poor) parts.push(`Poor: ${config.example_poor}`);

    const examples = config.supervisor_examples ?? [];
    for (const ex of examples as any[]) {
      parts.push(`${ex.type === 'good' ? '✅' : '❌'}: ${ex.content} — ${ex.explanation}`);
    }

    parts.push('');
  });

  // Cross-referenced section content (Layer 5)
  if (challengeSections) {
    const allCrossRefs = new Set<string>();
    for (const config of configs) {
      for (const ref of (config.cross_references ?? []) as string[]) {
        allCrossRefs.add(ref);
      }
    }
    if (allCrossRefs.size > 0) {
      const injected: string[] = [];
      for (const refKey of allCrossRefs) {
        const content = challengeSections[refKey];
        if (content) {
          const serialized = typeof content === 'string' ? content : JSON.stringify(content);
          injected.push(`#### ${getSectionName(refKey)}\n${serialized}`);
        }
      }
      if (injected.length > 0) {
        parts.push('### Cross-Referenced Section Content');
        parts.push(injected.join('\n\n'));
        parts.push('');
      }
    }
  }

  // Strategic Coherence Check
  parts.push(`
## STRATEGIC COHERENCE CHECK (Apply after reviewing individual sections)
After reviewing each section individually, step back and assess the challenge AS A WHOLE:

1. **NARRATIVE COHERENCE**: Does the challenge tell a logical story? Problem → Root Causes → Scope → Deliverables → Outcomes → Evaluation → Reward. If any step doesn't flow from the previous, flag it as a cross_section_issue.

2. **AMBITION-CAPABILITY MATCH**: Is what's being asked (deliverables, outcomes) achievable by the target solver profile (expertise, eligibility) within the constraints (timeline, budget)? Flag mismatches.

3. **SOLVER ATTRACTIVENESS**: Would a top-tier solver in this domain choose THIS challenge over alternatives? Consider: reward/effort ratio, IP terms fairness, timeline realism, problem interestingness. If the answer is "probably not," flag as a cross_section_issue with specific improvement suggestions.

4. **PUBLICATION READINESS**: Could this challenge be published TODAY and attract quality submissions? Or are there blockers? Rate overall readiness as a final cross_section_issue: { "related_section": "overall", "issue": "Publication readiness assessment: [READY/NEEDS_WORK/NOT_READY] — [specific reasoning]", "suggested_resolution": "..." }
`);

  parts.push('Every comment MUST use the {text, type} object format. Each distinct issue MUST be a separate comment.');
  parts.push('For "pass" sections: include 1-2 "strength" type comments — never return empty comments. Curators need confirmation the AI reviewed the section.');
  parts.push('For master-data-backed sections, your comments MUST reference specific allowed codes when suggesting changes.');
  return parts.join('\n');
}

/* ── Legacy batch prompt (backward compatible) — Pass 1: Analysis Only ── */

export function buildConfiguredBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
): string {
  const contextLabel = ROLE_CONTEXT_LABELS[roleContext] || 'challenge section';

  const parts: string[] = [];
  parts.push(`You are reviewing a ${contextLabel}.`);
  parts.push('');

  parts.push(INTELLIGENCE_DIRECTIVE);
  parts.push('');

  parts.push(`For each section below, provide ANALYSIS ONLY:
- status: "pass" (good — include 1-2 "strength" comments), "warning" (improvable), or "needs_revision" (errors found)
- comments: array of objects with "text" (string) and "type" (one of: "error", "warning", "suggestion", "best_practice", "strength"). For pass sections, include strength comments.
- guidelines: 1-3 domain-specific guidelines for this section

Do NOT include a "suggestion" field. Focus entirely on thorough, specific analysis. Improved content will be generated separately based on your comments.`);
  parts.push('');

  configs.forEach((config, i) => {
    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
    const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[config.section_key] || '';

    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);
    parts.push(`Format: ${fmt}. ${ebInstr || fmtInstr}`);

    const waveCtx = SECTION_WAVE_CONTEXT[config.section_key];
    if (waveCtx) {
      parts.push(`POSITION: Wave ${waveCtx.wave} (${waveCtx.waveName}). STRATEGIC ROLE: ${waveCtx.strategicRole}`);
    }

    const criteria = getEffectiveQualityCriteria(config);
    if (criteria.length > 0) {
      parts.push('Quality criteria:');
      for (const c of criteria as any[]) {
        let line = `- **${c.name}** (${c.severity}): ${c.description}`;
        if (c.crossReferences?.length > 0) {
          line += ` Cross-check: ${c.crossReferences.map((k: string) => getSectionName(k)).join(', ')}.`;
        }
        parts.push(line);
      }
    }

    const opts = masterDataOptions?.[config.section_key];
    if (opts?.length) {
      parts.push(`Allowed values: [${opts.map(o => `"${o.code}" (${o.label})`).join(', ')}]`);
      parts.push(`You MUST only suggest values from this allowed list. Do not invent new codes.`);
    }

    if (config.section_key === 'ip_model') {
      parts.push(`IP MODEL SELECTION GUIDELINES — your comments MUST provide reasoning for the recommended model:`);
      parts.push(`- "IP-EA" (Exclusive Assignment): Recommend when deliverables include proprietary IP (algorithms, designs, patents) and the seeker will commercialize exclusively.`);
      parts.push(`- "IP-NEL" (Non-Exclusive License): Recommend when the solution methodology has broad applicability and the seeker only needs usage rights (consulting frameworks, analytical models).`);
      parts.push(`- "IP-EL" (Exclusive License): Recommend when the seeker needs exclusive usage but the solver retains underlying ownership (specialized software, patentable inventions).`);
      parts.push(`- "IP-JO" (Joint Ownership): Recommend for collaborative R&D where both parties contribute significant IP (co-developed technology, joint research).`);
      parts.push(`- "IP-NONE" (No IP Transfer): Recommend for advisory/consulting challenges producing recommendations or assessments — no tangible IP is created.`);
      parts.push(`Analyze the challenge deliverables, maturity level, and reward structure to justify your recommendation. Comments should explain WHY a specific IP model fits this challenge.`);
    }

    if (config.section_description) parts.push(`Description: ${config.section_description}`);
    if (config.review_instructions) parts.push(`Instructions: ${config.review_instructions}`);
    if (config.dos) parts.push(`Do: ${config.dos}`);
    if (config.donts) parts.push(`Don't: ${config.donts}`);
    parts.push(`Tone: ${config.tone} | Words: ${config.min_words}–${config.max_words}`);
    if (config.required_elements.length > 0) {
      parts.push(`Required: ${config.required_elements.join(', ')}`);
    }
    if (config.example_good) parts.push(`Good: ${config.example_good}`);
    if (config.example_poor) parts.push(`Poor: ${config.example_poor}`);
    parts.push('');
  });

  parts.push('Every comment MUST use the {text, type} object format. Each distinct issue MUST be a separate comment.');
  parts.push('For "pass" sections: include 1-2 "strength" type comments confirming what works well.');
  parts.push('For master-data-backed sections (eligibility, visibility, ip_model, maturity_level, complexity), your comments MUST reference specific allowed codes when suggesting changes.');
  return parts.join('\n');
}

/* ── Smart prompt builder ── */

export function buildSmartBatchPrompt(
  configs: SectionConfig[],
  roleContext: string,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  clientContext?: any,
  challengeSections?: Record<string, any>,
): string {
  const anyStructured = configs.some(c => hasStructuredData(c));

  if (anyStructured) {
    return buildStructuredBatchPrompt(configs, roleContext, masterDataOptions, clientContext, challengeSections);
  }

  return buildConfiguredBatchPrompt(configs, roleContext, masterDataOptions);
}
