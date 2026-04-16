/**
 * pass2Prompt.ts — Pass 2 (Rewrite) system prompt builder
 * extracted from promptTemplate.ts.
 */

import type { SectionConfig } from './promptConstants.ts';
import {
  buildProportionalityAnchor,
  getEffectiveQualityCriteria,
  SECTION_FORMAT_MAP,
  FORMAT_INSTRUCTIONS,
  EXTENDED_BRIEF_FORMAT_INSTRUCTIONS,
  SECTION_QUALITY_EXEMPLARS,
  getSectionName,
  DEFAULT_PLATFORM_PREAMBLE,
} from './promptConstants.ts';
import { detectDomainFrameworks } from './contextIntelligence.ts';
import { buildIndustryIntelligence, buildGeographyContext } from './industryGeoPrompt.ts';

export function buildPass2SystemPrompt(
  sectionConfigs: SectionConfig[],
  challengeContext: any,
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  correctionsBlock?: string,
): string {
  let prompt = `${DEFAULT_PLATFORM_PREAMBLE}

YOUR REWRITE PHILOSOPHY:
You are not fixing text. You are CRAFTING a challenge specification that will attract the best solvers in the world to produce excellent solutions. Every sentence must earn its place.

THINK LIKE THREE PEOPLE SIMULTANEOUSLY:
1. **THE SEEKER**: "Will this challenge get me the solution I need? Are my requirements clearly expressed? Will evaluators be able to identify the best submission?"
2. **THE SOLVER**: "Do I understand what's expected? Do I have enough context to start? Is the reward worth my time? Are the deliverables specific enough that I won't face scope disputes?"
3. **THE EVALUATOR**: "Can I score submissions objectively? Do criteria map to deliverables? Is the scoring method feasible? Will I know a good submission when I see one?"

REWRITE RULES:
1. ADDRESS every flagged issue. Each issue = a visible, specific improvement.
2. ELEVATE beyond fixing: Add domain-specific depth that a principal consultant would naturally include. Benchmarks, frameworks, standard methodologies — applied to THIS challenge, not generic.
3. PRESERVE seeker intent. Human-authored content that wasn't flagged must remain untouched.
4. BE CONCRETE: Replace every vague statement with a specific one backed by your domain knowledge.
5. MATCH FORMAT exactly. HTML → HTML. JSON → JSON. Don't convert.
6. PRODUCTION-READY: Directly publishable. No "[TBD]", no "as appropriate", no "etc."

VOICE RULE: All rewritten content uses first-person plural ("we", "our") from the seeker's perspective. Exception: evaluation_criteria and submission_guidelines use neutral procedural voice. NEVER write "the organization" or "the seeker" in challenge content.

QUANTIFICATION MANDATE:
Every claim MUST include a number, metric, or specific reference. If the seeker provided data, use it. If not, use your domain knowledge for typical industry ranges.

- WRONG: "This will improve efficiency."
- RIGHT: "We expect this to reduce processing time from 48 hours to under 4 hours (90%+ improvement)."

- WRONG: "The solution should handle high volumes."
- RIGHT: "The solution must process 10,000 transactions per second at P99 latency under 200ms."

- WRONG: "Experienced professionals required."
- RIGHT: "Minimum 5 years of experience in enterprise data engineering, with proven delivery of ETL pipelines processing 1TB+ daily volumes."

If you cannot find or infer a specific number, use a benchmarked range: "Industry benchmarks suggest 8-12 weeks for POC-level implementations of this complexity."

SELF-VALIDATION (apply before returning EACH section):
Before returning your rewritten content, mentally verify:
1. ✅ Did I address EVERY error, warning, and suggestion? (Re-read the issues list)
2. ✅ Did I preserve all identified strengths?
3. ✅ Did I resolve all cross-section issues involving this section?
4. ✅ Does the content use "we/our" voice? (except evaluation_criteria/submission_guidelines)
5. ✅ Would a solver from outside this industry understand every sentence on first read?
6. ✅ Does the format EXACTLY match the required output (HTML/JSON/plain text)?
7. ✅ Are there any vague statements I can make more specific with domain knowledge?
8. ✅ For AI-ONLY reference materials — did I embed the data directly (not reference the document)?

If ANY check fails, revise before returning.

${buildProportionalityAnchor(challengeContext)}

QUALITY BAR EXAMPLES (the standard to aim for):
- Bad problem statement: "We need better data analytics to improve decision making."
- Good problem statement: "Our supply chain planning team makes demand forecasts using 18-month-old statistical models in Excel, resulting in 23% forecast error (vs. industry benchmark of 12-15%). This drives $4.2M in annual excess inventory costs and 340 stockout events per quarter across our 12 distribution centers."

- Bad deliverable: "Working prototype"
- Good deliverable: "Demand forecasting API (REST, OpenAPI 3.0 documented) accepting SKU-level historical sales data (CSV/JSON), returning 13-week rolling forecasts with confidence intervals. Must process 10K SKUs in under 60 seconds. Includes Jupyter notebook demonstrating model training pipeline and accuracy benchmarks against the provided test dataset."

INTELLIGENCE DIRECTIVE (CRITICAL):
You are NOT a text editor applying find-and-replace. You are a principal consultant who KNOWS this domain.
- APPLY domain expertise: standard frameworks, typical benchmarks, common pitfalls, regulatory considerations — but ONLY for THIS challenge's domain.
- CITE analyst references where configured below.
- NEVER invent specific numbers, dates, system names, or specs not in the challenge context.
- NEVER add content about domains unrelated to this challenge.

CHALLENGE CONTEXT:
- Maturity: ${challengeContext?.maturityLevel || 'not set'}
- Solution type: ${challengeContext?.solutionType || 'not set'}
- Seeker: ${challengeContext?.seekerSegment || 'not set'}
- Complexity: ${challengeContext?.complexityLevel || 'not set'}
- Operating Model: ${challengeContext?.operatingModel || 'marketplace'}
- Currency: ${challengeContext?.currency || 'USD'}
- Today: ${challengeContext?.todaysDate || new Date().toISOString().split('T')[0]}
`;

  // Domain framework injection for Pass 2
  const domainTags = challengeContext?.sections?.domain_tags || challengeContext?.domain_tags;
  const domainFrameworks = detectDomainFrameworks(
    domainTags,
    challengeContext?.problem_statement || challengeContext?.sections?.problem_statement,
    challengeContext?.scope || challengeContext?.sections?.scope,
  );
  if (domainFrameworks.length > 0) {
    prompt += `\nDOMAIN-SPECIFIC FRAMEWORKS for this challenge: ${domainFrameworks.join(', ')}. Reference these in your rewrites where applicable.\n`;
  }

  // Phase 11: Industry + Geography Intelligence
  if (challengeContext?._industryPack || challengeContext?._geoContext) {
    prompt += buildIndustryIntelligence(
      challengeContext._industryPack,
      challengeContext._geoContext,
      challengeContext._regionCode,
      sectionConfigs.map(c => c.section_key),
    );
    prompt += buildGeographyContext(challengeContext._geoContext);
  }

  // Phase 11b: Framework library (domain-tag matched, pre-fetched in index.ts)
  if (challengeContext?._frameworkBlock && typeof challengeContext._frameworkBlock === 'string') {
    prompt += `\n${challengeContext._frameworkBlock}\n`;
  }

  // Per-section enrichment
  for (const config of sectionConfigs) {
    if (!config) continue;
    prompt += `\n========== SECTION: ${config.section_key} ==========\n`;

    const templates = config.content_templates;
    if (templates && challengeContext?.maturityLevel) {
      const ml = challengeContext.maturityLevel.toLowerCase();
      const template = templates[ml];
      if (template) {
        prompt += `\nSTRUCTURE TEMPLATE (${challengeContext.maturityLevel}):\n${template}\nYour rewrite MUST follow this structure.\n`;
      }
    }

    const criteria = getEffectiveQualityCriteria(config);
    if (criteria.length > 0) {
      prompt += `\nQUALITY STANDARDS:\n`;
      for (const c of criteria as any[]) {
        prompt += `- ${c.name} (${c.severity}): ${c.description}\n`;
      }
    }

    const frameworks = config.industry_frameworks ?? [];
    if (frameworks.length > 0) {
      prompt += `\nFRAMEWORKS: ${(frameworks as string[]).join(', ')}\n`;
    }
    const sources = config.analyst_sources ?? [];
    if (sources.length > 0) {
      prompt += `\nANALYST SOURCES to cite: ${(sources as string[]).join(', ')}\n`;
    }

    if (config.example_good) {
      prompt += `\nEXCELLENT EXAMPLE (aim for this quality):\n${config.example_good}\n`;
    } else if (SECTION_QUALITY_EXEMPLARS[config.section_key]) {
      prompt += `\nEXCELLENT EXAMPLE (aim for this quality):\n${SECTION_QUALITY_EXEMPLARS[config.section_key]}\n`;
    }

    if (config.dos) {
      prompt += `\nINSTRUCTIONS: ${config.dos}\n`;
    }

    const fmt = SECTION_FORMAT_MAP[config.section_key] || 'rich_text';
    const ebInstr = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[config.section_key];
    const fmtInstr = FORMAT_INSTRUCTIONS[fmt] || '';
    const formatRule = ebInstr || fmtInstr;
    if (formatRule) {
      prompt += `\nOUTPUT FORMAT: ${formatRule}\n`;
    }

    const sectionOpts = masterDataOptions?.[config.section_key];
    if (sectionOpts?.length) {
      prompt += `\nALLOWED VALUES for ${config.section_key}: [${sectionOpts.map((o: any) => `"${o.code}" (${o.label})`).join(', ')}]\nYou MUST only output codes from this list. Do NOT invent new codes.\n`;
    }
  }

  prompt += `\n========== TABLE FORMAT RULE ==========
For sections with table format (evaluation_criteria, success_metrics_kpis, data_resources_provided, affected_stakeholders, legal_docs), output a JSON ARRAY of objects using the exact column keys.
Example for success_metrics_kpis: [{"kpi":"Model Accuracy","baseline":"N/A","target":"F1 > 0.85","measurement_method":"Cross-validation","timeframe":"8 weeks"}]
Do NOT output markdown tables or prose for table-format sections. Only valid JSON arrays.\n`;

  const allCrossRefs = new Set<string>();
  for (const config of sectionConfigs) {
    if (!config) continue;
    for (const ref of (config.cross_references ?? []) as string[]) {
      allCrossRefs.add(ref);
    }
  }
  if (allCrossRefs.size > 0 && challengeContext?.sections) {
    prompt += `\n========== RELATED SECTIONS (for consistency) ==========\n`;
    for (const refKey of allCrossRefs) {
      const refContent = challengeContext.sections[refKey];
      if (refContent && typeof refContent === 'string' && refContent.trim().length > 0) {
        prompt += `\n### ${getSectionName(refKey)}:\n${refContent.substring(0, 2000)}\n`;
      } else if (refContent && typeof refContent === 'object') {
        const serialized = JSON.stringify(refContent);
        if (serialized.length > 0) {
          prompt += `\n### ${getSectionName(refKey)}:\n${serialized.substring(0, 2000)}\n`;
        }
      }
    }
  }

  // Prompt 13: Inject hard corrections block if provided
  if (correctionsBlock) {
    prompt += '\n' + correctionsBlock;
  }

  return prompt;
}
