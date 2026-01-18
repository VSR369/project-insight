/**
 * Question Generation Constants
 * 
 * Configuration for balanced question selection algorithm.
 */

import type { QuestionDifficulty } from "@/hooks/queries/useQuestionBank";

/** Default number of questions to generate */
export const DEFAULT_QUESTIONS_COUNT = 20;

/** Difficulty distribution targets for Expert level (percentages) */
export const DIFFICULTY_TARGETS: Record<QuestionDifficulty, { min: number; max: number }> = {
  introductory: { min: 2, max: 3 },   // 10-15%
  applied: { min: 6, max: 7 },        // 30-35%
  advanced: { min: 6, max: 7 },       // 30-35%
  strategic: { min: 4, max: 5 },      // 20-25%
};

/** Question type targets (percentages of 20) */
export const QUESTION_TYPE_TARGETS: Record<string, { min: number; max: number }> = {
  scenario: { min: 9, max: 11 },      // 45-55% (Scenario/Case-based)
  decision: { min: 5, max: 6 },       // 25-30% (Decision/What-would-you-do)
  conceptual: { min: 3, max: 4 },     // 15-20% (Conceptual non-definition)
  // experience and proof are more for interviews, but can be included
};

/** Mandatory capability tags (at least one question from each) */
export const MANDATORY_CAPABILITY_CATEGORIES = [
  'strategic thinking',
  'operational execution',
  'decision intelligence',
  'risk',      // matches "Risk & Governance"
  'continuous improvement',
] as const;

/** Max percentage per capability tag (30% = 6 questions max of 20) */
export const MAX_CAPABILITY_PERCENTAGE = 0.30;
