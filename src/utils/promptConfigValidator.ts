/**
 * promptConfigValidator.ts — Scores each section config's readiness for review and generation.
 *
 * Evaluates across 5 layers:
 * L1: Platform preamble (10pts)
 * L2: Quality criteria (20pts), cross-refs (10pts), master data constraints (5pts)
 * L3: Web search directives (10pts), industry frameworks (5pts)
 * L4: Supervisor instructions (10pts), DOs/DON'Ts (5pts), examples (15pts)
 * L5: Runtime context (10pts — assumed working)
 * Generation bonus: Content templates across 3 maturity levels (+20pts)
 */

export interface ConfigScore {
  sectionKey: string;
  importance: string;
  reviewReadiness: number;
  generationReadiness: number;
  issues: string[];
  missing: string[];
}

export interface AggregateConfigHealth {
  avgReviewReadiness: number;
  avgGenerationReadiness: number;
  totalSections: number;
  belowThreshold: ConfigScore[];
}

const MASTER_DATA_SECTIONS = new Set([
  'domain_tags', 'maturity_level', 'complexity', 'eligibility', 'ip_model', 'visibility',
]);

export function scorePromptConfig(config: any): ConfigScore {
  const issues: string[] = [];
  const missing: string[] = [];
  let review = 0;
  let generate = 0;

  // L1: Preamble (10pts)
  if (config.platform_preamble?.trim?.()?.length > 20) {
    review += 10;
  } else {
    // Default preamble is used — still valid
    review += 10;
  }

  // L2: Quality criteria (20pts)
  const criteria = config.quality_criteria ?? [];
  if (Array.isArray(criteria)) {
    if (criteria.length >= 3) {
      review += 20;
    } else if (criteria.length >= 1) {
      review += criteria.length * 5;
      issues.push(`${criteria.length} quality criteria (need 3+)`);
    } else {
      missing.push('No quality criteria defined');
    }
  }

  // L2: Cross-references (10pts)
  const refs = config.cross_references ?? [];
  if (Array.isArray(refs)) {
    if (refs.length >= 2) {
      review += 10;
    } else if (refs.length >= 1) {
      review += 5;
      issues.push('Only 1 cross-reference');
    } else {
      missing.push('No cross-references — AI cannot check consistency');
    }
  }

  // L2: Master data constraints (5pts — only for applicable sections)
  if (MASTER_DATA_SECTIONS.has(config.section_key)) {
    const mdc = config.master_data_constraints ?? [];
    if (Array.isArray(mdc) && mdc.length > 0) {
      review += 5;
    } else {
      missing.push('Master data constraint missing for constrained section');
    }
  } else {
    review += 5; // N/A — full marks
  }

  // L3: Web search directives (10pts)
  const searches = config.web_search_queries ?? [];
  if (
    Array.isArray(searches) &&
    searches.some((s: any) => s.query_template?.trim?.()?.length > 5 || s.queryTemplate?.trim?.()?.length > 5)
  ) {
    review += 10;
  } else {
    issues.push('No web search directives');
  }

  // L3: Industry frameworks (5pts)
  const frameworks = config.industry_frameworks ?? [];
  if (Array.isArray(frameworks) && frameworks.length > 0) {
    review += 5;
  } else {
    issues.push('No industry frameworks');
  }

  // L4: Supervisor instructions (10pts)
  if (config.review_instructions?.trim?.()?.length > 50) {
    review += 7;
  } else {
    issues.push('Short or missing supervisor instructions');
  }
  if (config.dos?.trim?.()?.length > 10) {
    review += 1.5;
  }
  if (config.donts?.trim?.()?.length > 10) {
    review += 1.5;
  }

  // L4: Examples (15pts)
  if (config.example_good?.trim?.()?.length > 30) {
    review += 7.5;
  } else {
    missing.push('No good example — LLM has no calibration target');
  }
  if (config.example_poor?.trim?.()?.length > 30) {
    review += 7.5;
  } else {
    issues.push('No poor example');
  }

  // L5: Runtime context (10pts — assumed working)
  review += 10;

  // Generation = review + content templates bonus
  generate = review;
  const templates = config.content_templates;
  if (templates && typeof templates === 'object') {
    const count = ['blueprint', 'poc', 'pilot'].filter(
      m => templates[m]?.trim?.()?.length > 20
    ).length;
    if (count >= 3) {
      generate += 20;
    } else if (count >= 2) {
      generate += 13;
      issues.push(`${count}/3 maturity templates`);
    } else if (count >= 1) {
      generate += 7;
      issues.push(`${count}/3 maturity templates`);
    } else {
      missing.push('No content templates for generation');
    }
  } else {
    missing.push('No content templates object');
  }

  return {
    sectionKey: config.section_key,
    importance: config.importance_level ?? 'unknown',
    reviewReadiness: Math.min(100, Math.round(review)),
    generationReadiness: Math.min(100, Math.round(generate)),
    issues,
    missing,
  };
}

export function scoreAllConfigs(configs: any[], threshold = 70): AggregateConfigHealth {
  const scores = configs.map(scorePromptConfig);

  const totalSections = scores.length;
  const avgReviewReadiness = totalSections > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.reviewReadiness, 0) / totalSections)
    : 0;
  const avgGenerationReadiness = totalSections > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.generationReadiness, 0) / totalSections)
    : 0;

  const belowThreshold = scores.filter(
    s => s.reviewReadiness < threshold || s.generationReadiness < threshold
  );

  return {
    avgReviewReadiness,
    avgGenerationReadiness,
    totalSections,
    belowThreshold,
  };
}
