/**
 * questionBankConstants — Type definitions, config objects, and helper functions
 * for the question bank module.
 * Extracted from useQuestionBank.ts.
 */

import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Base question type from database
type BaseQuestion = Tables<"question_bank">;

// Extended question type with capability tags
export interface Question extends BaseQuestion {
  question_capability_tags?: Array<{
    id: string;
    capability_tag_id: string;
    capability_tags: {
      id: string;
      name: string;
    } | null;
  }>;
}

export type QuestionInsert = TablesInsert<"question_bank">;
export type QuestionUpdate = TablesUpdate<"question_bank">;

// New enum types matching the database
export type QuestionType = "conceptual" | "scenario" | "experience" | "decision" | "proof";
export type QuestionUsageMode = "self_assessment" | "interview" | "both";
export type QuestionDifficulty = "introductory" | "applied" | "advanced" | "strategic";

export interface QuestionOption {
  index: number;
  text: string;
}

// Difficulty labels and colors for display
export const DIFFICULTY_CONFIG: Record<QuestionDifficulty, { label: string; color: string; bgColor: string }> = {
  introductory: { label: "Introductory", color: "text-green-700", bgColor: "bg-green-100" },
  applied: { label: "Applied", color: "text-lime-700", bgColor: "bg-lime-100" },
  advanced: { label: "Advanced", color: "text-orange-700", bgColor: "bg-orange-100" },
  strategic: { label: "Strategic", color: "text-red-700", bgColor: "bg-red-100" },
};

// Difficulty options for forms/selects
export const DIFFICULTY_OPTIONS = [
  { value: "introductory" as const, label: "Introductory" },
  { value: "applied" as const, label: "Applied" },
  { value: "advanced" as const, label: "Advanced" },
  { value: "strategic" as const, label: "Strategic" },
];

// Question type labels and colors
export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; color: string; bgColor: string; description: string }> = {
  conceptual: { label: "Conceptual", color: "text-blue-700", bgColor: "bg-blue-100", description: "Basic understanding (20% - mostly self-assessment)" },
  scenario: { label: "Scenario", color: "text-purple-700", bgColor: "bg-purple-100", description: "Applied situations (30% - both modes)" },
  experience: { label: "Experience", color: "text-amber-700", bgColor: "bg-amber-100", description: "Past experience validation (25% - interview)" },
  decision: { label: "Decision", color: "text-pink-700", bgColor: "bg-pink-100", description: "Trade-off/judgment (15% - interview)" },
  proof: { label: "Proof", color: "text-indigo-700", bgColor: "bg-indigo-100", description: "Evidence-based (10% - senior interview)" },
};

// Question type options for forms/selects
export const QUESTION_TYPE_OPTIONS = [
  { value: "conceptual" as const, label: "Conceptual" },
  { value: "scenario" as const, label: "Scenario" },
  { value: "experience" as const, label: "Experience" },
  { value: "decision" as const, label: "Decision" },
  { value: "proof" as const, label: "Proof" },
];

// Usage mode labels and colors
export const USAGE_MODE_CONFIG: Record<QuestionUsageMode, { label: string; color: string; bgColor: string }> = {
  self_assessment: { label: "Self-Assessment", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  interview: { label: "Interview", color: "text-violet-700", bgColor: "bg-violet-100" },
  both: { label: "Both", color: "text-emerald-700", bgColor: "bg-emerald-100" },
};

// Usage mode options for forms/selects
export const USAGE_MODE_OPTIONS = [
  { value: "self_assessment" as const, label: "Self-Assessment" },
  { value: "interview" as const, label: "Interview" },
  { value: "both" as const, label: "Both" },
];

// Bulk operation types
export interface BulkQuestionInput {
  question_text: string;
  options: QuestionOption[];
  correct_option: number;
  difficulty: string | null;
  question_type: string;
  usage_mode: string;
  expected_answer_guidance: string | null;
  speciality_id: string;
  row_number: number;
}

export interface BulkInsertResult {
  inserted_id: string;
  row_index: number;
}

// Helper to parse options from JSON
export function parseQuestionOptions(options: unknown): QuestionOption[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((opt, idx) => {
      if (typeof opt === "string") {
        return { index: idx + 1, text: opt };
      }
      if (typeof opt === "object" && opt !== null) {
        return {
          index: (opt as QuestionOption).index ?? idx + 1,
          text: (opt as QuestionOption).text ?? String(opt),
        };
      }
      return { index: idx + 1, text: String(opt) };
    });
  }
  return [];
}

// Helper to format options for storage
export function formatQuestionOptions(options: QuestionOption[]): QuestionOption[] {
  return options.map((opt, idx) => ({
    index: idx + 1,
    text: opt.text.trim(),
  }));
}

// Helper to get difficulty display info
export function getDifficultyDisplay(difficulty: QuestionDifficulty | null) {
  if (!difficulty) return null;
  return DIFFICULTY_CONFIG[difficulty];
}

// Helper to get question type display info
export function getQuestionTypeDisplay(questionType: QuestionType) {
  return QUESTION_TYPE_CONFIG[questionType];
}

// Helper to get usage mode display info
export function getUsageModeDisplay(usageMode: QuestionUsageMode) {
  return USAGE_MODE_CONFIG[usageMode];
}
