/**
 * waveConfig.test.ts — Structural & dependency invariants for the wave plan.
 *
 * Covers checklist items A1, A2, A3, A4, A5, J1, J2, J3 from
 * docs/qa/ai-curator-production-test-plan.md.
 *
 * These tests are PURE — no DB, no network. They guard against accidental
 * regressions to the wave layout that took 24h to debug in production
 * (Wave 8 timeout, NO_DRAFT mis-skip, BATCH_EXCLUDE bleed).
 */

import { describe, it, expect } from 'vitest';
import {
  EXECUTION_WAVES,
  BATCH_EXCLUDE_SECTIONS,
  HARMONIZE_CLUSTER_SECTIONS,
  HARMONIZE_MIN_SUGGESTIONS,
  DISCOVERY_WAVE_NUMBER,
  QA_WAVE_NUMBER,
  HARMONIZE_WAVE_NUMBER,
  determineSectionAction,
  getWaveReasoning,
  createInitialWaveProgressWithDiscovery,
  createInitialWaveProgressForPass2,
} from '../waveConfig';

const PRINCIPAL_GRADE = new Set([
  'problem_statement', 'deliverables', 'evaluation_criteria',
  'phase_schedule', 'complexity', 'reward_structure',
  'solver_expertise', 'success_metrics_kpis', 'expected_outcomes',
]);

const NO_DRAFT_KEYS = [
  'approaches_not_of_interest',
  'creator_references',
  'reference_urls',
  'solver_audience',
  'creator_legal_instructions',
  'evaluation_config',
];

describe('waveConfig — structure (A1, A2, J1)', () => {
  it('A1: defines exactly 9 content waves + QA wave (10 entries total)', () => {
    expect(EXECUTION_WAVES).toHaveLength(10);
    const contentWaves = EXECUTION_WAVES.filter((w) => w.waveNumber !== QA_WAVE_NUMBER);
    expect(contentWaves).toHaveLength(9);
    expect(contentWaves.map((w) => w.waveNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('A1: Pass-2 progress includes Harmonize wave; Pass-1 includes Discovery wave', () => {
    const pass1 = createInitialWaveProgressWithDiscovery();
    expect(pass1.waves.some((w) => w.waveNumber === DISCOVERY_WAVE_NUMBER)).toBe(true);
    expect(pass1.waves.some((w) => w.waveNumber === QA_WAVE_NUMBER)).toBe(true);

    const pass2 = createInitialWaveProgressForPass2();
    expect(pass2.waves.some((w) => w.waveNumber === HARMONIZE_WAVE_NUMBER)).toBe(true);
  });

  it('A2/J2: no wave declares more sections than the MAX_BATCH_SIZE × 2 ceiling', () => {
    // MAX_BATCH_SIZE = 3 in the edge function. With one mandatory split for SOLO
    // sections, a wave should never declare more than 6 sections — anything more
    // means we will exceed the 150s edge timeout.
    for (const w of EXECUTION_WAVES) {
      expect(w.sectionIds.length, `Wave ${w.waveNumber} oversized`).toBeLessThanOrEqual(6);
    }
  });

  it('J3: Wave 8 contains exactly the SOLO reward_structure section (regression — Wave 8 timeout)', () => {
    const wave8 = EXECUTION_WAVES.find((w) => w.waveNumber === 8);
    expect(wave8).toBeDefined();
    expect(wave8?.sectionIds).toEqual(['reward_structure']);
  });

  it('J3: Wave 9 contains submission_guidelines + ip_model + hook + visibility', () => {
    const wave9 = EXECUTION_WAVES.find((w) => w.waveNumber === 9);
    expect(wave9).toBeDefined();
    expect(wave9?.sectionIds).toEqual(
      expect.arrayContaining(['submission_guidelines', 'ip_model', 'hook', 'visibility']),
    );
  });
});

describe('waveConfig — BATCH_EXCLUDE invariants (A4)', () => {
  it('A4: every BATCH_EXCLUDE section is absent from every wave sectionIds list', () => {
    const allWaveSections = new Set(EXECUTION_WAVES.flatMap((w) => w.sectionIds));
    for (const excluded of BATCH_EXCLUDE_SECTIONS) {
      expect(allWaveSections.has(excluded), `${excluded} must NOT be in any wave`).toBe(false);
    }
  });

  it('A4: BATCH_EXCLUDE set covers the 7 known no-DB-column sections', () => {
    expect(new Set(BATCH_EXCLUDE_SECTIONS)).toEqual(new Set([
      'creator_references', 'reference_urls', 'legal_docs',
      'escrow_funding', 'creator_legal_instructions',
      'evaluation_config', 'organization_context',
    ]));
  });
});

describe('waveConfig — dependency graph integrity (A3)', () => {
  it('A3: every prerequisiteSection resolves to a section in a strictly earlier wave', () => {
    const sectionToWave = new Map<string, number>();
    for (const w of EXECUTION_WAVES) {
      for (const id of w.sectionIds) sectionToWave.set(id, w.waveNumber);
    }

    for (const w of EXECUTION_WAVES) {
      if (w.waveNumber === QA_WAVE_NUMBER) continue;
      for (const prereq of w.prerequisiteSections) {
        const prereqWave = sectionToWave.get(prereq);
        // Allow prereq to reference sections handled outside the wave plan
        // (BATCH_EXCLUDE) — those are gathered in Discovery (wave 10).
        if (prereqWave === undefined) {
          expect(
            BATCH_EXCLUDE_SECTIONS.includes(prereq as never),
            `Wave ${w.waveNumber} prereq "${prereq}" not found in any earlier wave`,
          ).toBe(true);
          continue;
        }
        expect(
          prereqWave,
          `Wave ${w.waveNumber} prereq "${prereq}" lives in wave ${prereqWave} (must be earlier)`,
        ).toBeLessThan(w.waveNumber);
      }
    }
  });
});

describe('determineSectionAction — A5 NO_DRAFT skip', () => {
  it.each(NO_DRAFT_KEYS)('A5: returns "skip" for empty NO_DRAFT section %s', (key) => {
    expect(determineSectionAction(key as never, null)).toBe('skip');
    expect(determineSectionAction(key as never, '')).toBe('skip');
    expect(determineSectionAction(key as never, '   ')).toBe('skip');
    expect(determineSectionAction(key as never, [])).toBe('skip');
    expect(determineSectionAction(key as never, {})).toBe('skip');
  });

  it('A5: returns "review" for NO_DRAFT section once curator adds substantive content', () => {
    const populated = 'The curator has provided substantive content here for review.';
    expect(determineSectionAction('approaches_not_of_interest' as never, populated)).toBe('review');
    expect(determineSectionAction('solver_audience' as never, populated)).toBe('review');
  });

  it('A5: empty regular section returns "generate" (NOT skip)', () => {
    expect(determineSectionAction('problem_statement' as never, null)).toBe('generate');
    expect(determineSectionAction('scope' as never, '')).toBe('generate');
  });

  it('A5: populated regular section returns "review"', () => {
    const text = 'A non-trivial scope statement that exceeds the 30-character threshold easily.';
    expect(determineSectionAction('scope' as never, text)).toBe('review');
  });

  it('A5: attachment-based sections always "review", regardless of content', () => {
    expect(determineSectionAction('creator_references' as never, null)).toBe('review');
    expect(determineSectionAction('reference_urls' as never, 'http://example.com')).toBe('review');
  });
});

describe('getWaveReasoning — J3 reasoning policy', () => {
  it('J3: any principal-grade section in the wave forces HIGH reasoning', () => {
    for (const sec of PRINCIPAL_GRADE) {
      expect(getWaveReasoning([sec as never])).toBe('high');
    }
  });

  it('J3: trivial-only waves get LOW reasoning', () => {
    expect(getWaveReasoning(['hook', 'visibility', 'domain_tags'] as never[])).toBe('low');
  });

  it('J3: mixed non-critical waves get MEDIUM reasoning', () => {
    expect(getWaveReasoning(['scope', 'context_and_background'] as never[])).toBe('medium');
  });
});

describe('Harmonization wave configuration', () => {
  it('cluster excludes copy/visibility-only sections', () => {
    expect(HARMONIZE_CLUSTER_SECTIONS).not.toContain('hook');
    expect(HARMONIZE_CLUSTER_SECTIONS).not.toContain('visibility');
    expect(HARMONIZE_CLUSTER_SECTIONS).not.toContain('domain_tags');
    expect(HARMONIZE_CLUSTER_SECTIONS).toContain('problem_statement');
    expect(HARMONIZE_CLUSTER_SECTIONS).toContain('reward_structure');
  });

  it('min-suggestions threshold is at least 2', () => {
    expect(HARMONIZE_MIN_SUGGESTIONS).toBeGreaterThanOrEqual(2);
  });
});
