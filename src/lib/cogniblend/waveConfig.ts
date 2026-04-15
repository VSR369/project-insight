/**
 * Wave-based execution configuration for global AI review.
 *
 * 6 dependency-ordered waves covering all 31 curation sections.
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

const LOCKED_SECTIONS: SectionKey[] = [];

/** Sections backed by attachments/external data — always review, never generate */
const ATTACHMENT_SECTIONS: SectionKey[] = ['creator_references', 'reference_urls'];

export const DISCOVERY_WAVE_NUMBER = 7;

export const EXECUTION_WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    name: 'Foundation — Problem & Context',
    sectionIds: ['organization_context', 'problem_statement', 'scope', 'expected_outcomes', 'context_and_background'],
    prerequisiteSections: [],
  },
  {
    waveNumber: 2,
    name: 'Analysis — Root Causes & Stakeholders',
    sectionIds: ['root_causes', 'affected_stakeholders', 'current_deficiencies', 'preferred_approach', 'approaches_not_of_interest'],
    prerequisiteSections: ['problem_statement', 'scope', 'context_and_background'],
  },
  {
    waveNumber: 3,
    name: 'Specification — Deliverables & Measures',
    sectionIds: [
      'solution_type', 'deliverables', 'maturity_level',
      'data_resources_provided', 'success_metrics_kpis',
      'creator_references',   // Creator reference docs inform deliverable review
      'reference_urls',       // Creator reference URLs inform scope/deliverable review
    ],
    prerequisiteSections: ['problem_statement', 'scope', 'expected_outcomes'],
  },
  {
    waveNumber: 4,
    name: 'Assessment — Complexity & Expertise',
    sectionIds: ['complexity', 'solver_expertise', 'eligibility'],
    prerequisiteSections: ['deliverables', 'maturity_level', 'solution_type'],
  },
  {
    waveNumber: 5,
    name: 'Execution — Timeline, Evaluation & Commercial',
    sectionIds: ['phase_schedule', 'evaluation_criteria', 'submission_guidelines', 'reward_structure', 'ip_model'],
    prerequisiteSections: ['deliverables', 'complexity', 'maturity_level', 'solver_expertise'],
  },
  {
    waveNumber: 6,
    name: 'Presentation & Compliance',
    sectionIds: [
      'hook', 'visibility', 'domain_tags',
      'evaluation_config', 'solver_audience',
      'creator_legal_instructions', 'legal_docs', 'escrow_funding',
    ],
    prerequisiteSections: ['problem_statement', 'deliverables', 'reward_structure', 'evaluation_criteria'],
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
  const isAttachmentBased = ATTACHMENT_SECTIONS.includes(sectionId);
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
  // Attachment-based sections: always review (AI checks if attachments exist & are relevant)
  if (isAttachmentBased) return 'review';
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

/**
 * Creates wave progress with an extra Wave 7 for context discovery.
 * Used only by the Analyse (Pass 1) flow.
 */
export function createInitialWaveProgressWithDiscovery(): WaveProgress {
  const base = createInitialWaveProgress();
  return {
    ...base,
    totalWaves: EXECUTION_WAVES.length + 1,
    waves: [
      ...base.waves,
      {
        waveNumber: DISCOVERY_WAVE_NUMBER,
        name: 'Discover Contextual Sources',
        status: 'pending',
        sections: [],
      },
    ],
  };
}
