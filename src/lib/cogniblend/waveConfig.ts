/**
 * Wave-based execution configuration for global AI review.
 *
 * 9 dependency-ordered content waves + Discovery (10) + QA (11).
 * Each wave produces ≤2 sequential sub-batches so wall-time stays under the
 * 150s edge function ceiling at HIGH reasoning. Each wave's sections depend
 * only on sections from prior waves.
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

/** Human-readable labels for all curation sections */
export const SECTION_LABELS: Record<SectionKey, string> = {
  organization_context: 'Organization Context',
  problem_statement: 'Problem Statement',
  scope: 'Scope',
  expected_outcomes: 'Expected Outcomes',
  context_and_background: 'Context & Background',
  root_causes: 'Root Causes',
  affected_stakeholders: 'Affected Stakeholders',
  current_deficiencies: 'Current Deficiencies',
  preferred_approach: 'Preferred Approach',
  approaches_not_of_interest: 'Approaches Not of Interest',
  solution_type: 'Solution Type',
  deliverables: 'Deliverables',
  maturity_level: 'Maturity Level',
  data_resources_provided: 'Data & Resources',
  success_metrics_kpis: 'Success Metrics / KPIs',
  creator_references: 'Creator References',
  reference_urls: 'Reference URLs',
  complexity: 'Complexity Assessment',
  solver_expertise: 'Solver Expertise',
  eligibility: 'Eligibility',
  phase_schedule: 'Phase Schedule',
  evaluation_criteria: 'Evaluation Criteria',
  submission_guidelines: 'Submission Guidelines',
  reward_structure: 'Reward Structure',
  ip_model: 'IP Model',
  hook: 'Hook / Tagline',
  visibility: 'Visibility',
  domain_tags: 'Domain Tags',
  evaluation_config: 'Evaluation Config',
  solver_audience: 'Solver Audience',
  creator_legal_instructions: 'Creator Legal Instructions',
  legal_docs: 'Legal Documents',
  escrow_funding: 'Escrow & Funding',
} as Record<SectionKey, string>;


const LOCKED_SECTIONS: SectionKey[] = [];

/** Sections backed by attachments/external data — always review, never generate */
const ATTACHMENT_SECTIONS: SectionKey[] = ['creator_references', 'reference_urls'];

/**
 * Sections explicitly marked `aiCanDraft: false` in SECTION_FORMAT_CONFIG.
 * The AI must NEVER draft content for these — only review what the curator
 * provides. When empty, they are skipped (not generated). This prevents the
 * batch-failure cascade observed in Waves 2/3/6 where the AI was asked to
 * generate sections it was instructed never to draft, producing malformed
 * output that killed the entire batch.
 */
const NO_DRAFT_SECTIONS: SectionKey[] = [
  'approaches_not_of_interest',
  'creator_references',
  'reference_urls',
  'solver_audience',
  'creator_legal_instructions',
  'evaluation_config',
];

/**
 * Sections that have NO backing column on the `challenges` table — their data
 * lives in attachments / legal docs / escrow records / org context. They cannot
 * be serialised into the section_keys batch payload, so the AI receives empty
 * content and produces malformed JSON that takes down the entire sub-batch.
 *
 * These sections are excluded from the LLM batch entirely. They still appear
 * in the wave UI (so curators see them) and are still editable — they're just
 * reviewed by their own dedicated panels (Discovery wave, legal compliance UI,
 * escrow UI) rather than by the section reviewer.
 */
export const BATCH_EXCLUDE_SECTIONS: readonly SectionKey[] = [
  'creator_references',
  'reference_urls',
  'legal_docs',
  'escrow_funding',
  'creator_legal_instructions',
  'evaluation_config',
  'organization_context',
] as const;

export const DISCOVERY_WAVE_NUMBER = 10;
export const QA_WAVE_NUMBER = 11;
/**
 * Wave 12 — Suggestion Harmonization (Pass 2 only).
 * After per-section suggestions are generated, a single AI call reads ALL
 * suggestions together and corrects cross-section inconsistencies before
 * the curator clicks Accept All.
 */
export const HARMONIZE_WAVE_NUMBER = 12;

/**
 * Sections whose suggestions participate in cross-reference harmonization.
 * Limited to structurally interdependent sections to keep the harmonization
 * AI call within ~15-20K tokens at high reasoning. Sections with no structural
 * dependents (hook, visibility, domain_tags, ip_model copy, etc.) are excluded.
 */
export const HARMONIZE_CLUSTER_SECTIONS: readonly SectionKey[] = [
  'problem_statement',
  'scope',
  'deliverables',
  'expected_outcomes',
  'success_metrics_kpis',
  'evaluation_criteria',
  'phase_schedule',
  'reward_structure',
  'complexity',
  'solver_expertise',
  'submission_guidelines',
] as const;

/** Min cluster suggestions required to make harmonization worthwhile. */
export const HARMONIZE_MIN_SUGGESTIONS = 2;

/**
 * Per-section reasoning_effort policy.
 * Critical sections (Principal-grade) get 'high'; supporting sections get 'medium';
 * mechanical/lookup sections get 'low'. Used for selective per-wave override.
 */
const REASONING_HIGH: SectionKey[] = [
  'problem_statement', 'deliverables', 'evaluation_criteria',
  'phase_schedule', 'complexity', 'reward_structure',
  'solver_expertise', 'success_metrics_kpis', 'expected_outcomes',
];
const REASONING_LOW: SectionKey[] = [
  'hook', 'domain_tags', 'visibility', 'organization_context',
];
export function getWaveReasoning(sectionIds: SectionKey[]): 'high' | 'medium' | 'low' {
  if (sectionIds.some((id) => REASONING_HIGH.includes(id))) return 'high';
  if (sectionIds.every((id) => REASONING_LOW.includes(id))) return 'low';
  return 'medium';
}

export const EXECUTION_WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    name: 'Foundation — Problem, Scope & Context',
    sectionIds: ['problem_statement', 'scope', 'context_and_background'],
    prerequisiteSections: [],
  },
  {
    waveNumber: 2,
    name: 'Analysis — Outcomes, Causes & Stakeholders',
    sectionIds: ['expected_outcomes', 'root_causes', 'affected_stakeholders'],
    prerequisiteSections: ['problem_statement', 'scope', 'context_and_background'],
  },
  {
    waveNumber: 3,
    name: 'Diagnosis — Deficiencies, Approach & Solution Type',
    sectionIds: ['current_deficiencies', 'preferred_approach', 'solution_type'],
    prerequisiteSections: ['problem_statement', 'root_causes'],
  },
  {
    waveNumber: 4,
    name: 'Specification — Deliverables',
    sectionIds: ['deliverables'],
    prerequisiteSections: ['problem_statement', 'scope', 'expected_outcomes', 'solution_type'],
  },
  {
    waveNumber: 5,
    name: 'Calibration — Maturity, Data & Tags',
    sectionIds: ['maturity_level', 'data_resources_provided', 'domain_tags'],
    prerequisiteSections: ['deliverables', 'scope', 'solution_type'],
  },
  {
    waveNumber: 6,
    name: 'Assessment — Complexity, Metrics & Solver Expertise',
    sectionIds: ['complexity', 'success_metrics_kpis', 'solver_expertise'],
    prerequisiteSections: ['deliverables', 'maturity_level', 'domain_tags', 'expected_outcomes'],
  },
  {
    waveNumber: 7,
    name: 'Execution — Eligibility, Schedule & Evaluation',
    sectionIds: ['eligibility', 'phase_schedule', 'evaluation_criteria'],
    prerequisiteSections: ['solver_expertise', 'complexity', 'maturity_level', 'deliverables', 'expected_outcomes'],
  },
  {
    waveNumber: 8,
    name: 'Commercial — Submission & Reward',
    sectionIds: ['submission_guidelines', 'reward_structure'],
    prerequisiteSections: ['deliverables', 'evaluation_criteria', 'phase_schedule', 'complexity', 'solver_expertise'],
  },
  {
    waveNumber: 9,
    name: 'Presentation — IP, Hook & Visibility',
    sectionIds: ['ip_model', 'hook', 'visibility'],
    prerequisiteSections: ['reward_structure', 'deliverables', 'maturity_level', 'eligibility'],
  },
  {
    waveNumber: QA_WAVE_NUMBER, // Wave 11 — runs Consistency + Ambiguity passes only
    name: 'Quality Assurance — Consistency & Ambiguity',
    sectionIds: [], // QA wave has no per-section reviews; renders specially in UI
    prerequisiteSections: [],
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
  // No-draft sections: review when content exists, skip when empty (NEVER generate)
  if (NO_DRAFT_SECTIONS.includes(sectionId)) return hasContent ? 'review' : 'skip';
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
 * Creates wave progress with an extra Wave 10 for context discovery.
 * Used only by the Analyse (Pass 1) flow. Wave 10 (DISCOVERY_WAVE_NUMBER) sits
 * between the standard content execution waves (1-9) and the QA wave (11, QA_WAVE_NUMBER).
 */
export function createInitialWaveProgressWithDiscovery(): WaveProgress {
  const base = createInitialWaveProgress();
  const discoveryWave: WaveResult = {
    waveNumber: DISCOVERY_WAVE_NUMBER,
    name: 'Discover Contextual Sources',
    status: 'pending',
    sections: [],
  };
  // Insert Discovery wave (10) before QA wave (11). Standard waves are 1-9 + 11.
  const wavesWithDiscovery: WaveResult[] = [];
  let inserted = false;
  for (const w of base.waves) {
    if (!inserted && w.waveNumber === QA_WAVE_NUMBER) {
      wavesWithDiscovery.push(discoveryWave);
      inserted = true;
    }
    wavesWithDiscovery.push(w);
  }
  if (!inserted) wavesWithDiscovery.push(discoveryWave);

  return {
    ...base,
    totalWaves: base.totalWaves + 1,
    waves: wavesWithDiscovery,
  };
}

/**
 * Creates wave progress for the Pass-2 (Generate Suggestions) flow.
 * Includes the standard content waves (1-9), the QA wave (11) which will be
 * marked skipped at runtime (already executed in Pass 1), and the new
 * Harmonization wave (12) which performs cross-section consistency on
 * suggestions before Accept All.
 */
export function createInitialWaveProgressForPass2(): WaveProgress {
  const base = createInitialWaveProgress();
  const harmonizeWave: WaveResult = {
    waveNumber: HARMONIZE_WAVE_NUMBER,
    name: 'Harmonize Suggestions — Cross-Section Consistency',
    status: 'pending',
    sections: [],
  };
  return {
    ...base,
    totalWaves: base.totalWaves + 1,
    waves: [...base.waves, harmonizeWave],
  };
}
