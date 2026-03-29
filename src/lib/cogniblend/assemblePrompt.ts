/**
 * assemblePrompt.ts — 5-layer prompt composition from unified ai_review_section_config.
 *
 * Reads ALL fields from a config row (existing flat fields + new structured JSONB columns)
 * and composes a single system prompt for the LLM.
 *
 * Layers:
 *   1. Platform preamble (persona + anti-hallucination rules)
 *   2. Section role + quality criteria + constraints + templates + computation rules
 *   3. Research directives (web search queries, frameworks, analyst sources)
 *   4. Supervisor overrides (review_instructions, dos, donts, examples)
 *   5. Runtime context (ChallengeContext + cross-referenced section content)
 *
 * SYNC: A Deno-compatible copy lives in
 * supabase/functions/review-challenge-sections/assemblePrompt.ts
 */

import { getSectionDisplayName } from '@/lib/cogniblend/sectionDependencies';

/* ── Types ── */

export interface QualityCriterion {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'suggestion';
  crossReferences: string[];
}

export interface MasterDataConstraint {
  fieldName: string;
  validValuesSource: string;
  enforceStrictly: boolean;
}

export interface WebSearchDirective {
  purpose: string;
  queryTemplate: string;
  when: 'always' | 'if_available' | 'for_generation_only';
}

export interface PromptExample {
  type: 'good' | 'bad';
  content: string;
  explanation: string;
}

export interface ContentTemplates {
  blueprint?: string;
  poc?: string;
  pilot?: string;
  [key: string]: string | undefined;
}

/** Extended section config — includes both existing flat fields and new structured JSONB */
export interface ExtendedSectionConfig {
  // Existing flat fields
  role_context: string;
  section_key: string;
  section_label: string;
  importance_level: string;
  section_description: string | null;
  review_instructions: string | null;
  dos: string | null;
  donts: string | null;
  tone: string;
  min_words: number;
  max_words: number;
  required_elements: string[];
  example_good: string | null;
  example_poor: string | null;

  // New structured fields (Phase 6)
  platform_preamble: string | null;
  quality_criteria: QualityCriterion[] | null;
  master_data_constraints: MasterDataConstraint[] | null;
  computation_rules: string[] | null;
  content_templates: ContentTemplates | null;
  web_search_queries: WebSearchDirective[] | null;
  industry_frameworks: string[] | null;
  analyst_sources: string[] | null;
  supervisor_examples: PromptExample[] | null;
  cross_references: string[] | null;
  wave_number: number | null;
  tab_group: string | null;
}

/** Minimal context shape for prompt assembly */
export interface PromptContext {
  todaysDate: string;
  solutionType?: string | null;
  seekerSegment?: string | null;
  maturityLevel?: string | null;
  complexityLevel?: string | null;
  rateCard?: {
    effortRateFloor: number;
    rewardFloorAmount: number;
    rewardCeiling: number | null;
    big4BenchmarkMultiplier: number;
  } | null;
  totalPrizePool?: number | null;
  estimatedEffortHours?: { min: number; max: number } | null;
  /** Master data valid values for constraint injection */
  masterData?: Record<string, string[]>;
  /** Section content for cross-reference injection */
  sections?: Record<string, string | null>;
  /** Domain/category for web search query rendering */
  subDomain?: string | null;
  category?: string | null;
}

/* ── Default platform preamble ── */

const DEFAULT_PLATFORM_PREAMBLE = `You are a senior management consultant and innovation architect with deep expertise across digital transformation, technology strategy, enterprise architecture, and open innovation program design. Your reviews and content must meet the quality bar of KPMG, PwC, EY, and Deloitte advisory deliverables — but your role is to help achieve these outcomes at 50% lower cost through open innovation with globally distributed solvers enrolled into our platform.

PLATFORM CONTEXT:
This is an enterprise open innovation platform. Challenges seek solution blueprints, POCs, and pilots across: digital business models, digital strategy, intelligent process design (SCM, procurement, finance, HR), technology architecture, data strategy, AI/ML solutions, agentic AI lifecycle management, cybersecurity, cloud modernization, smart workplaces, and operating model transformation.

QUALITY STANDARDS:
- CONSULTANT-GRADE: Every sentence should be something a Deloitte partner would sign off on. No filler. No platitudes. Specific, actionable, measurable.
- INDUSTRY-INFORMED: Reference frameworks (TOGAF, ITIL, SAFe, Design Thinking, JTBD, Value Chain Analysis, Blue Ocean Strategy) where applicable. Cite analyst perspectives (Gartner, Forrester, McKinsey, HBR).
- OPEN INNOVATION AWARE: Deliverables must be self-contained, well-scoped, and assessable by external solvers with no internal organizational context.
- MATURITY-DRIVEN: Blueprint = strategic document. POC = working prototype. Pilot = production-ready system. Never confuse these.

ANTI-HALLUCINATION RULES:
- NEVER invent technical specifications not mentioned in the challenge context.
- NEVER suggest dates without computing from today's date + duration.
- NEVER recommend master data values outside the provided valid options.
- If you lack context for a specific recommendation, say exactly what information is needed and from which section.
- NEVER generate generic consulting boilerplate. Every sentence must reference THIS specific challenge.`;

/* ── Has structured data check ── */

function hasStructuredData(config: ExtendedSectionConfig): boolean {
  const qc = config.quality_criteria;
  const cr = config.cross_references;
  const mdc = config.master_data_constraints;
  return (
    (Array.isArray(qc) && qc.length > 0) ||
    (Array.isArray(cr) && cr.length > 0) ||
    (Array.isArray(mdc) && mdc.length > 0)
  );
}

/* ── Main assembly function ── */

/**
 * Assembles a full 5-layer system prompt from a unified config row + runtime context.
 *
 * @param config  - Extended section config from ai_review_section_config (all columns)
 * @param context - Runtime challenge context (dates, master data, section content, etc.)
 * @param action  - Whether this is a review, generate, or skip action
 * @returns The composed system prompt string
 */
export function assemblePrompt(
  config: ExtendedSectionConfig,
  context: PromptContext,
  action: 'review' | 'generate' = 'review',
): string {
  // If no structured data, fall back to legacy flat-field assembly
  if (!hasStructuredData(config)) {
    return assembleLegacyPrompt(config, context);
  }

  const parts: string[] = [];

  // ── Layer 1: Platform Preamble ──
  parts.push(config.platform_preamble?.trim() || DEFAULT_PLATFORM_PREAMBLE);
  parts.push('');

  // ── Layer 2: Section Role + Quality Criteria + Constraints + Templates ──
  parts.push(`## Section: ${config.section_label} [${config.importance_level}]`);
  if (config.section_description) {
    parts.push(config.section_description);
  }
  parts.push('');

  // Action instruction
  if (action === 'generate') {
    parts.push('ACTION: Generate content for this section based on available challenge context.');
  } else {
    parts.push('ACTION: Review the existing content for quality, consistency, and completeness.');
  }
  parts.push('');

  // Quality criteria
  const criteria = config.quality_criteria ?? [];
  if (criteria.length > 0) {
    parts.push('### Quality Criteria');
    for (const c of criteria) {
      let line = `- **${c.name}** (${c.severity}): ${c.description}`;
      if (c.crossReferences?.length > 0) {
        const names = c.crossReferences.map(k => getSectionDisplayName(k));
        line += ` Cross-check with: ${names.join(', ')}.`;
      }
      parts.push(line);
    }
    parts.push('');
  }

  // Master data constraints
  const constraints = config.master_data_constraints ?? [];
  if (constraints.length > 0 && context.masterData) {
    parts.push('### Master Data Constraints');
    for (const c of constraints) {
      const values = context.masterData[c.validValuesSource];
      if (values?.length) {
        const strictLabel = c.enforceStrictly
          ? '(STRICT — error if not in list)'
          : '(recommended)';
        parts.push(`- ${c.fieldName}: MUST be from ${JSON.stringify(values)} ${strictLabel}`);
      }
    }
    parts.push('');
  }

  // Computation rules
  const rules = config.computation_rules ?? [];
  if (rules.length > 0) {
    parts.push('### Computation Rules');
    for (const rule of rules) {
      // Substitute {{todaysDate}} etc.
      const rendered = rule.replace(/\{\{todaysDate\}\}/g, context.todaysDate);
      parts.push(`- ${rendered}`);
    }
    parts.push('');
  }

  // Content templates (maturity-specific)
  const templates = config.content_templates;
  if (templates && context.maturityLevel) {
    const mlKey = context.maturityLevel.toLowerCase();
    const template = templates[mlKey];
    if (template) {
      parts.push(`### Content Template for ${context.maturityLevel} maturity`);
      parts.push(template);
      parts.push('');
    }
  }

  // ── Layer 3: Research Directives ──
  const searches = config.web_search_queries ?? [];
  if (searches.length > 0) {
    const relevantSearches = action === 'generate'
      ? searches
      : searches.filter(s => s.when === 'always' || s.when === 'if_available');

    if (relevantSearches.length > 0) {
      parts.push('### Research Directives');
      parts.push('When reviewing or generating, consider searching for:');
      for (const query of relevantSearches) {
        const domain = context.subDomain || context.category || 'enterprise';
        const rendered = query.queryTemplate
          .replace(/\{\{domain\}\}/g, domain)
          .replace(/\{\{maturityLevel\}\}/g, context.maturityLevel || 'blueprint');
        parts.push(`- ${query.purpose}: "${rendered}" (${query.when})`);
      }
      parts.push('');
    }
  }

  const frameworks = config.industry_frameworks ?? [];
  if (frameworks.length > 0) {
    parts.push(`Reference frameworks: ${frameworks.join(', ')}`);
  }

  const sources = config.analyst_sources ?? [];
  if (sources.length > 0) {
    parts.push(`Analyst sources: ${sources.join(', ')}`);
  }

  if (frameworks.length > 0 || sources.length > 0) {
    parts.push('');
  }

  // ── Layer 4: Supervisor Overrides (existing flat fields) ──
  const hasOverrides = config.review_instructions || config.dos || config.donts;
  if (hasOverrides) {
    parts.push('### Supervisor Instructions');
    if (config.review_instructions) parts.push(config.review_instructions);
    if (config.dos) parts.push(`**Do:** ${config.dos}`);
    if (config.donts) parts.push(`**Don't:** ${config.donts}`);
    parts.push('');
  }

  // Supervisor structured examples
  const examples = config.supervisor_examples ?? [];
  // Also include legacy example_good/example_poor
  if (config.example_good || config.example_poor || examples.length > 0) {
    parts.push('### Examples');
    if (config.example_good) {
      parts.push(`✅ GOOD: ${config.example_good}`);
    }
    if (config.example_poor) {
      parts.push(`❌ BAD: ${config.example_poor}`);
    }
    for (const ex of examples) {
      parts.push(`${ex.type === 'good' ? '✅ GOOD' : '❌ BAD'}: ${ex.content}`);
      parts.push(`Why: ${ex.explanation}`);
      parts.push('');
    }
    parts.push('');
  }

  // Word count guidance
  parts.push(`Tone: ${config.tone} | Words: ${config.min_words}–${config.max_words}`);
  if (config.required_elements?.length > 0) {
    parts.push(`Required elements: ${config.required_elements.join(', ')}`);
  }
  parts.push('');

  // ── Layer 5: Runtime Context ──
  parts.push('### Challenge Context');
  parts.push(`Today: ${context.todaysDate}`);
  if (context.solutionType) parts.push(`Solution type: ${context.solutionType}`);
  if (context.seekerSegment) parts.push(`Seeker: ${context.seekerSegment}`);
  parts.push(`Maturity: ${context.maturityLevel || 'Not set'}`);
  parts.push(`Complexity: ${context.complexityLevel || 'Not set'}`);
  if (context.rateCard) {
    const rc = context.rateCard;
    parts.push(`Rate card: $${rc.effortRateFloor}/hr floor, $${rc.rewardFloorAmount} reward floor`);
    if (rc.rewardCeiling) parts.push(`Reward ceiling: $${rc.rewardCeiling}`);
  }
  if (context.totalPrizePool) parts.push(`Total prize pool: ${context.totalPrizePool}`);
  if (context.estimatedEffortHours) {
    parts.push(`Estimated effort: ${context.estimatedEffortHours.min}–${context.estimatedEffortHours.max} hours`);
  }
  parts.push('');

  // Cross-referenced section content injection
  const crossRefs = config.cross_references ?? [];
  if (crossRefs.length > 0 && context.sections) {
    const injected: string[] = [];
    for (const refKey of crossRefs) {
      const content = context.sections[refKey];
      if (content) {
        injected.push(`#### ${getSectionDisplayName(refKey)}\n${content}`);
      }
    }
    if (injected.length > 0) {
      parts.push('### Cross-Referenced Section Content');
      parts.push('The following related sections provide context for your review:');
      parts.push(injected.join('\n\n'));
      parts.push('');
    }
  }

  return parts.join('\n');
}

/* ── Legacy fallback (when no structured JSONB is populated) ── */

function assembleLegacyPrompt(
  config: ExtendedSectionConfig,
  context: PromptContext,
): string {
  const parts: string[] = [];

  // Use platform preamble if available, otherwise minimal role context
  if (config.platform_preamble?.trim()) {
    parts.push(config.platform_preamble);
    parts.push('');
  }

  parts.push(`## Section: ${config.section_label} [${config.importance_level}]`);
  if (config.section_description) parts.push(`**Description:** ${config.section_description}`);
  if (config.review_instructions) parts.push(`**Review Instructions:** ${config.review_instructions}`);
  if (config.dos) parts.push(`**Do:** ${config.dos}`);
  if (config.donts) parts.push(`**Don't:** ${config.donts}`);
  parts.push(`**Tone:** ${config.tone}`);
  parts.push(`**Word count guidance:** ${config.min_words}–${config.max_words} words expected`);
  if (config.required_elements?.length > 0) {
    parts.push(`**Required elements:** ${config.required_elements.join(', ')}`);
  }
  if (config.example_good) parts.push(`**Good example:** ${config.example_good}`);
  if (config.example_poor) parts.push(`**Poor example:** ${config.example_poor}`);
  parts.push('');

  // Add runtime context
  parts.push('### Challenge Context');
  parts.push(`Today: ${context.todaysDate}`);
  if (context.maturityLevel) parts.push(`Maturity: ${context.maturityLevel}`);
  if (context.complexityLevel) parts.push(`Complexity: ${context.complexityLevel}`);

  return parts.join('\n');
}

/**
 * Assembles prompts for a batch of sections (used in wave execution).
 * Each section gets its own fully composed prompt for clarity.
 */
export function assembleBatchPrompt(
  configs: ExtendedSectionConfig[],
  context: PromptContext,
  action: 'review' | 'generate' = 'review',
): string {
  if (configs.length === 1) {
    return assemblePrompt(configs[0], context, action);
  }

  // For batches, compose a single prompt with all sections
  const firstConfig = configs[0];
  const parts: string[] = [];

  // Layer 1: Shared preamble (from first config)
  parts.push(firstConfig.platform_preamble?.trim() || DEFAULT_PLATFORM_PREAMBLE);
  parts.push('');
  parts.push('For each section below, provide:');
  parts.push('- status: "pass" (ready — NO issues, comments MUST be an empty array), "warning" (functional but improvable — MUST have 1-3 comments), or "needs_revision" (has issues that must be fixed — MUST have 1-3 comments)');
  parts.push('- comments: actionable improvement instructions. CRITICAL: For "pass" status, comments MUST be an empty array [].');
  parts.push('');

  // Per-section instructions (Layers 2-4)
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    parts.push(`### ${i + 1}. ${config.section_key} — ${config.section_label} [${config.importance_level}]`);

    if (config.section_description) parts.push(config.section_description);

    // Quality criteria
    const criteria = config.quality_criteria ?? [];
    if (criteria.length > 0) {
      for (const c of criteria) {
        let line = `- **${c.name}** (${c.severity}): ${c.description}`;
        if (c.crossReferences?.length > 0) {
          line += ` Cross-check: ${c.crossReferences.map(k => getSectionDisplayName(k)).join(', ')}.`;
        }
        parts.push(line);
      }
    }

    // Master data constraints
    const constraints = config.master_data_constraints ?? [];
    if (constraints.length > 0 && context.masterData) {
      for (const c of constraints) {
        const values = context.masterData[c.validValuesSource];
        if (values?.length) {
          parts.push(`Allowed values for ${c.fieldName}: ${JSON.stringify(values)}${c.enforceStrictly ? ' (STRICT)' : ''}`);
        }
      }
    }

    // Computation rules
    const rules = config.computation_rules ?? [];
    for (const rule of rules) {
      parts.push(`Rule: ${rule.replace(/\{\{todaysDate\}\}/g, context.todaysDate)}`);
    }

    // Content template
    const templates = config.content_templates;
    if (templates && context.maturityLevel) {
      const template = templates[context.maturityLevel.toLowerCase()];
      if (template) parts.push(`Template (${context.maturityLevel}): ${template}`);
    }

    // Supervisor overrides
    if (config.review_instructions) parts.push(`Instructions: ${config.review_instructions}`);
    if (config.dos) parts.push(`Do: ${config.dos}`);
    if (config.donts) parts.push(`Don't: ${config.donts}`);
    parts.push(`Tone: ${config.tone} | Words: ${config.min_words}–${config.max_words}`);
    if (config.required_elements?.length > 0) {
      parts.push(`Required: ${config.required_elements.join(', ')}`);
    }
    if (config.example_good) parts.push(`Good: ${config.example_good}`);
    if (config.example_poor) parts.push(`Poor: ${config.example_poor}`);

    // Structured examples
    const examples = config.supervisor_examples ?? [];
    for (const ex of examples) {
      parts.push(`${ex.type === 'good' ? '✅' : '❌'}: ${ex.content} — ${ex.explanation}`);
    }

    parts.push('');
  }

  // Layer 5: Runtime context
  parts.push('### Challenge Context');
  parts.push(`Today: ${context.todaysDate}`);
  if (context.solutionType) parts.push(`Solution type: ${context.solutionType}`);
  if (context.seekerSegment) parts.push(`Seeker: ${context.seekerSegment}`);
  parts.push(`Maturity: ${context.maturityLevel || 'Not set'}`);
  parts.push(`Complexity: ${context.complexityLevel || 'Not set'}`);
  if (context.rateCard) {
    const rc = context.rateCard;
    parts.push(`Rate card: $${rc.effortRateFloor}/hr floor, $${rc.rewardFloorAmount} reward floor`);
  }
  if (context.totalPrizePool) parts.push(`Total prize pool: ${context.totalPrizePool}`);
  if (context.estimatedEffortHours) {
    parts.push(`Estimated effort: ${context.estimatedEffortHours.min}–${context.estimatedEffortHours.max} hours`);
  }
  parts.push('');

  // Cross-referenced content (union of all configs' cross_references)
  const allCrossRefs = new Set<string>();
  for (const config of configs) {
    for (const ref of config.cross_references ?? []) {
      allCrossRefs.add(ref);
    }
  }
  if (allCrossRefs.size > 0 && context.sections) {
    const injected: string[] = [];
    for (const refKey of allCrossRefs) {
      const content = context.sections[refKey];
      if (content) {
        injected.push(`#### ${getSectionDisplayName(refKey)}\n${content}`);
      }
    }
    if (injected.length > 0) {
      parts.push('### Cross-Referenced Section Content');
      parts.push(injected.join('\n\n'));
      parts.push('');
    }
  }

  parts.push('Every comment MUST be phrased as an actionable improvement instruction.');
  parts.push('CRITICAL: Each distinct issue or suggestion MUST be a separate comment in the array.');

  return parts.join('\n');
}

/**
 * Estimate token count for a prompt (rough: ~4 chars per token for English text).
 */
export function estimateTokenCount(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}
