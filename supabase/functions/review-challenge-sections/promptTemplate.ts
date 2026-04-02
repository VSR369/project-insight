/**
 * promptTemplate.ts — Barrel re-export for all prompt template modules.
 *
 * All logic has been decomposed into:
 * - promptConstants.ts (types, constants, helpers)
 * - contextIntelligence.ts (intelligence directive, domain frameworks, wave context)
 * - industryGeoPrompt.ts (industry/geography prompt builders)
 * - pass2Prompt.ts (Pass 2 rewrite prompt)
 * - promptBuilders.ts (Pass 1 batch prompt builders)
 */

export type { SectionConfig } from './promptConstants.ts';

export {
  ROLE_CONTEXT_LABELS,
  FORMAT_INSTRUCTIONS,
  SECTION_FORMAT_MAP,
  EXTENDED_BRIEF_FORMAT_INSTRUCTIONS,
  SECTION_QUALITY_EXEMPLARS,
  DEFAULT_QUALITY_CRITERIA,
  DEFAULT_PLATFORM_PREAMBLE,
  SECTION_DISPLAY_NAMES,
  getSectionName,
  buildProportionalityAnchor,
  hasStructuredData,
  getEffectiveQualityCriteria,
  sanitizeTableSuggestion,
  getSuggestionFormatInstruction,
  getSectionFormatType,
} from './promptConstants.ts';

export {
  INTELLIGENCE_DIRECTIVE,
  detectDomainFrameworks,
  buildContextIntelligence,
  SECTION_WAVE_CONTEXT,
} from './contextIntelligence.ts';

export {
  resolveIndustryCode,
  countryToRegion,
  buildIndustryIntelligence,
  buildGeographyContext,
} from './industryGeoPrompt.ts';

export { buildPass2SystemPrompt } from './pass2Prompt.ts';

export {
  buildStructuredBatchPrompt,
  buildConfiguredBatchPrompt,
  buildSmartBatchPrompt,
} from './promptBuilders.ts';
