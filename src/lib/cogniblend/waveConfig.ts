/**
 * Wave-based execution configuration for global AI review.
 *
 * 6 dependency-ordered waves covering all 26 curation sections.
 * Each wave's sections depend only on sections from prior waves.
 */

import type { SectionKey } from '@/types/sections';

export type SectionAction = 'review' | 'generate' | 'skip';

export type WaveStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

export interface WaveConfig {
  waveNumber: number;
  name: string;
  sectionIds: SectionKey[];
  prerequisiteSections: SectionKey[];
}

export interface WaveSectionAction {
  sectionId: SectionKey;
  action: SectionAction;
  existingContent: string | null;
}

export interface WaveResult {
  waveNumber: number;
  name: string;
  status: WaveStatus;
  sections: Array<{
    sectionId: SectionKey;
    action: SectionAction;
    status: 'success' | 'error' | 'skipped';
  }>;
}

export interface WaveProgress {
  currentWave: number;
  totalWaves: number;
  waves: WaveResult[];
  overallStatus: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
}

const LOCKED_SECTIONS: SectionKey[] = ['legal_docs', 'escrow_funding'];

export const EXECUTION_WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    name: 'Foundation',
    sectionIds: ['problem_statement', 'scope', 'expected_outcomes', 'context_and_background', 'success_metrics_kpis'],
    prerequisiteSections: [],
  },
  {
    waveNumber: 2,
    name: 'Enrichment',
    sectionIds: ['root_causes', 'affected_stakeholders', 'current_deficiencies', 'preferred_approach', 'approaches_not_of_interest'],
    prerequisiteSections: ['problem_statement', 'scope'],
  },
  {
    waveNumber: 3,
    name: 'Complexity',
    sectionIds: ['deliverables', 'maturity_level', 'complexity', 'data_resources_provided'],
    prerequisiteSections: ['problem_statement', 'scope'],
  },
  {
    waveNumber: 4,
    name: 'Solvers & Timeline',
    sectionIds: ['solver_expertise', 'eligibility', 'phase_schedule', 'submission_guidelines'],
    prerequisiteSections: ['scope', 'deliverables', 'complexity'],
  },
  {
    waveNumber: 5,
    name: 'Evaluation & Commercial',
    sectionIds: ['evaluation_criteria', 'reward_structure', 'ip_model', 'legal_docs', 'escrow_funding'],
    prerequisiteSections: ['deliverables', 'complexity', 'phase_schedule'],
  },
  {
    waveNumber: 6,
    name: 'Presentation',
    sectionIds: ['hook', 'visibility', 'domain_tags'],
    prerequisiteSections: ['problem_statement', 'scope', 'complexity', 'reward_structure'],
  },
];

/**
 * Determine the AI action for a given section.
 */
export function determineSectionAction(
  sectionId: SectionKey,
  sectionContent: string | null | unknown,
): SectionAction {
  const isLocked = LOCKED_SECTIONS.includes(sectionId);
  const hasContent = (() => {
    if (sectionContent == null) return false;
    if (typeof sectionContent === 'string') return sectionContent.trim().length > 30;
    if (typeof sectionContent === 'object') {
      const str = JSON.stringify(sectionContent);
      return str !== '[]' && str !== '{}' && str !== 'null' && str.length > 5;
    }
    return false;
  })();

  if (isLocked) return hasContent ? 'review' : 'skip';
  if (!hasContent) return 'generate';
  return 'review';
}

/**
 * Create the initial wave progress state.
 */
export function createInitialWaveProgress(): WaveProgress {
  return {
    currentWave: 0,
    totalWaves: EXECUTION_WAVES.length,
    waves: EXECUTION_WAVES.map((w) => ({
      waveNumber: w.waveNumber,
      name: w.name,
      status: 'pending' as WaveStatus,
      sections: w.sectionIds.map((id) => ({
        sectionId: id,
        action: 'review' as SectionAction,
        status: 'skipped' as const,
      })),
    })),
    overallStatus: 'idle',
  };
}
