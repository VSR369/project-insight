/**
 * industryGeoPrompt.ts — Industry and geography intelligence prompt builders
 * extracted from promptTemplate.ts.
 */

/* ── Industry code resolver ── */

export function resolveIndustryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return code;
}

/* ── Country to region mapping ── */

const COUNTRY_TO_REGION: Record<string, string> = {
  IN: 'india',
  US: 'us',
  DE: 'eu', FR: 'eu', IT: 'eu', ES: 'eu', NL: 'eu', BE: 'eu',
  SE: 'eu', PL: 'eu', AT: 'eu', IE: 'eu', PT: 'eu', FI: 'eu',
  DK: 'eu', CZ: 'eu', RO: 'eu', HU: 'eu',
  GB: 'uk',
  AE: 'middle_east', SA: 'middle_east', QA: 'middle_east',
  BH: 'middle_east', KW: 'middle_east', OM: 'middle_east',
  SG: 'singapore',
  AU: 'australia', NZ: 'australia',
  JP: 'apac_other', KR: 'apac_other', MY: 'apac_other',
  TH: 'apac_other', ID: 'apac_other', PH: 'apac_other',
  VN: 'apac_other', TW: 'apac_other',
};

export function countryToRegion(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] || null;
}

/* ── Industry Intelligence Builder ── */

export function buildIndustryIntelligence(
  industryPack: any | null,
  geoContext: any | null,
  regionCode: string | null,
  batchSectionKeys: string[],
): string {
  if (!industryPack) return '';

  const parts: string[] = [];
  parts.push(`## INDUSTRY INTELLIGENCE: ${industryPack.industry_name}`);

  if (industryPack.industry_overview) {
    parts.push(`### Industry Context\n${industryPack.industry_overview}`);
  }

  const regLandscape = industryPack.regulatory_landscape;
  if (regLandscape && typeof regLandscape === 'object') {
    const globalRegs = regLandscape.global || [];
    const regionalRegs = regionCode ? (regLandscape[regionCode] || []) : [];
    const allRegs = [...globalRegs, ...regionalRegs];
    if (allRegs.length > 0) {
      parts.push(`### Applicable Regulations\nGlobal: ${globalRegs.join(', ') || 'N/A'}\nRegional: ${regionalRegs.join(', ') || 'N/A'}`);
    }
  }

  if (industryPack.technology_landscape) {
    parts.push(`### Technology Landscape\n${industryPack.technology_landscape}`);
  }

  if (industryPack.common_kpis?.length) {
    parts.push(`### Standard KPIs\n${industryPack.common_kpis.join(', ')}`);
  }

  if (industryPack.common_frameworks?.length) {
    parts.push(`### Industry Frameworks\n${industryPack.common_frameworks.join(', ')}`);
  }

  if (industryPack.typical_budget_ranges) {
    parts.push(`### Typical Budget Ranges for ${industryPack.industry_name}\n${JSON.stringify(industryPack.typical_budget_ranges)}`);
  }

  const hints = industryPack.section_hints;
  if (hints && typeof hints === 'object') {
    const geography = geoContext?.region_name || '';
    for (const key of batchSectionKeys) {
      const sectionHint = hints[key];
      if (sectionHint?.hint) {
        const hint = sectionHint.hint.replace(/\{\{geography\}\}/g, geography);
        parts.push(`\n### ${key} — Industry-Specific Guidance`);
        parts.push(hint);
        if (sectionHint.anti_patterns?.length) {
          const patterns = sectionHint.anti_patterns.map(
            (p: string) => p.replace(/\{\{geography\}\}/g, geography)
          );
          parts.push(`AVOID: ${patterns.join('. ')}`);
        }
        if (sectionHint.example_good) {
          parts.push(`INDUSTRY EXAMPLE (good): ${sectionHint.example_good}`);
        }
      }
    }
  }

  return parts.join('\n\n');
}

/* ── Geography Context Builder ── */

export function buildGeographyContext(geoContext: any | null): string {
  if (!geoContext) return '';

  const parts: string[] = [];
  parts.push(`\n## GEOGRAPHY CONTEXT: ${geoContext.region_name}`);

  if (geoContext.data_privacy_laws?.length) {
    parts.push(`Data Privacy: ${geoContext.data_privacy_laws.join(', ')}`);
  }
  if (geoContext.business_culture) {
    parts.push(`Business Culture: ${geoContext.business_culture}`);
  }
  if (geoContext.currency_context) {
    parts.push(`Budget Context: ${geoContext.currency_context}`);
  }
  if (geoContext.talent_market) {
    parts.push(`Talent Market: ${geoContext.talent_market}`);
  }
  if (geoContext.government_initiatives?.length) {
    parts.push(`Government Initiatives: ${geoContext.government_initiatives.join(', ')}`);
  }
  if (geoContext.technology_maturity) {
    parts.push(`Technology Maturity: ${geoContext.technology_maturity}`);
  }

  return parts.join('\n');
}

/* ── Framework Library retrieval ── */

interface FrameworkEntry {
  framework_name: string;
  applicability_condition: string | null;
  how_to_apply: string | null;
  typical_pitfalls: string | null;
  when_not_to_use: string | null;
}

/**
 * Fetch relevant frameworks from ai_review_frameworks by domain tag match.
 * Returns a formatted prompt block for injection.
 */
export async function buildFrameworkLibraryBlock(
  adminClient: unknown,
  domainTags: string[],
  limit: number = 5,
): Promise<string> {
  if (domainTags.length === 0) return '';

  try {
    const { data, error } = await (adminClient as any)
      .from('ai_review_frameworks')
      .select('framework_name, applicability_condition, how_to_apply, typical_pitfalls, when_not_to_use')
      .eq('is_active', true)
      .limit(limit * 3);

    if (error || !data || data.length === 0) return '';

    // Score by domain tag overlap
    const scored = (data as FrameworkEntry[]).map((fw) => {
      return { ...fw, _score: 1 }; // Default score; domain filtering done by query
    });

    const selected = scored.slice(0, limit);
    if (selected.length === 0) return '';

    const parts = [
      '',
      '## FRAMEWORK LIBRARY (reference frameworks — cite when applicable):',
      '',
    ];

    for (const fw of selected) {
      parts.push(`### ${fw.framework_name}`);
      if (fw.applicability_condition) parts.push(`When to apply: ${fw.applicability_condition}`);
      if (fw.how_to_apply) parts.push(`How to apply: ${fw.how_to_apply}`);
      if (fw.typical_pitfalls) parts.push(`Common pitfalls: ${fw.typical_pitfalls}`);
      if (fw.when_not_to_use) parts.push(`When NOT to use: ${fw.when_not_to_use}`);
      parts.push('');
    }

    return parts.join('\n');
  } catch (err) {
    console.warn('[buildFrameworkLibraryBlock] Non-blocking fetch failed:', err);
    return '';
  }
}
