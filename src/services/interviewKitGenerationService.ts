/**
 * Interview Kit Question Generation Service
 * 
 * Generates questions for the Interview Kit based on:
 * 1. Domain & Delivery Depth - Random questions from question_bank
 * 2. Competency Questions - From interview_kit_questions
 * 3. Proof Point Questions - Generated from proof point descriptions
 */

import { supabase } from "@/integrations/supabase/client";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";
import { logWarning } from "@/lib/errorHandler";
import type { InterviewKitCompetency } from "@/hooks/queries/useInterviewKitCompetencies";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedQuestion {
  questionSource: 'question_bank' | 'interview_kit' | 'proof_point' | 'custom';
  questionBankId?: string;
  interviewKitQuestionId?: string;
  proofPointId?: string;
  questionText: string;
  expectedAnswer: string | null;
  sectionName: string;
  sectionType: 'domain' | 'proof_point' | 'competency';
  sectionLabel?: string;
  displayOrder: number;
  // For domain questions - hierarchy path
  hierarchyPath?: {
    proficiencyArea: string;
    subDomain: string;
    speciality: string;
  };
}

interface QuestionBankRow {
  id: string;
  question_text: string;
  correct_option: number | null;
  options: string[] | null;
  expected_answer_guidance: string | null;
  speciality_id: string;
  specialities?: {
    name: string;
    sub_domains?: {
      name: string;
      proficiency_areas?: {
        name: string;
      };
    };
  };
}

interface InterviewKitQuestionRow {
  id: string;
  question_text: string;
  expected_answer: string | null;
  competency_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof Point Question Templates
// ─────────────────────────────────────────────────────────────────────────────

const PROOF_POINT_TEMPLATES = [
  'Regarding your proof point "{title}": Can you walk me through the specific methodology you used?',
  'In "{title}", what were the measurable outcomes you achieved?',
  'For "{title}", describe the biggest challenge you faced and how you overcame it.',
  'How did you validate the results in "{title}"?',
  'What would you do differently if you were to approach "{title}" again?',
  'Can you explain the stakeholder dynamics involved in "{title}"?',
];

// ─────────────────────────────────────────────────────────────────────────────
// Domain Questions Generation (Max 10 from question_bank)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDomainQuestions(
  specialityIds: string[],
  limit: number = 10
): Promise<GeneratedQuestion[]> {
  if (specialityIds.length === 0) {
    return [];
  }

  // Query question_bank for interview-eligible questions
  const { data: questions, error } = await supabase
    .from("question_bank")
    .select(`
      id,
      question_text,
      correct_option,
      options,
      expected_answer_guidance,
      speciality_id,
      specialities:speciality_id (
        name,
        sub_domains:sub_domain_id (
          name,
          proficiency_areas:proficiency_area_id (
            name
          )
        )
      )
    `)
    .in("speciality_id", specialityIds)
    .in("usage_mode", ["interview", "both"])
    .eq("is_active", true);

  if (error) {
    logWarning("Error fetching domain questions", { operation: 'generateDomainQuestions' }, { error: error.message });
    return [];
  }

  if (!questions || questions.length === 0) {
    return [];
  }

  // Shuffle and select up to limit questions
  const shuffled = shuffleArray(questions as unknown as QuestionBankRow[]);
  const selected = shuffled.slice(0, limit);

  return selected.map((q, index) => {
    const speciality = q.specialities as any;
    const subDomain = speciality?.sub_domains;
    const profArea = subDomain?.proficiency_areas;

    // Build expected answer from options + correct answer + guidance
    let expectedAnswer = q.expected_answer_guidance || '';
    if (q.options && q.correct_option !== null && q.options[q.correct_option]) {
      const correctAnswerText = q.options[q.correct_option];
      expectedAnswer = expectedAnswer 
        ? `Correct answer: ${correctAnswerText}\n\n${expectedAnswer}`
        : `Correct answer: ${correctAnswerText}`;
    }

    return {
      questionSource: 'question_bank' as const,
      questionBankId: q.id,
      questionText: q.question_text,
      expectedAnswer: expectedAnswer || null,
      sectionName: 'Domain & Delivery Depth',
      sectionType: 'domain' as const,
      displayOrder: index + 1,
      hierarchyPath: {
        proficiencyArea: profArea?.name || 'Unknown',
        subDomain: subDomain?.name || 'Unknown',
        speciality: speciality?.name || 'Unknown',
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Competency Questions Generation (1-2 per competency)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCompetencyQuestions(
  competencies: InterviewKitCompetency[],
  industrySegmentId: string,
  expertiseLevelId: string
): Promise<GeneratedQuestion[]> {
  if (competencies.length === 0) {
    return [];
  }

  const competencyIds = competencies.map(c => c.id);
  const result: GeneratedQuestion[] = [];
  let globalOrder = 1;

  for (const competency of competencies) {
    // First, try to find questions matching the exact industry + expertise level
    let { data: questions, error } = await supabase
      .from("interview_kit_questions")
      .select("id, question_text, expected_answer, competency_id")
      .eq("competency_id", competency.id)
      .eq("industry_segment_id", industrySegmentId)
      .eq("expertise_level_id", expertiseLevelId)
      .eq("is_active", true);

    if (error) {
      logWarning(`Error fetching competency questions for ${competency.name}`, { operation: 'generateCompetencyQuestions' }, { error: error.message });
      continue;
    }

    // If no exact match, fallback to same industry but any expertise level
    if (!questions || questions.length === 0) {
      const { data: fallbackQuestions, error: fallbackError } = await supabase
        .from("interview_kit_questions")
        .select("id, question_text, expected_answer, competency_id")
        .eq("competency_id", competency.id)
        .eq("industry_segment_id", industrySegmentId)  // Always match industry
        .eq("is_active", true)
        .limit(5);

      if (!fallbackError && fallbackQuestions) {
        questions = fallbackQuestions;
      }
    }

    if (!questions || questions.length === 0) {
      continue;
    }

    // Minimum 2 questions per competency (if available)
    const shuffled = shuffleArray(questions);
    const count = Math.min(shuffled.length, 2);
    const selected = shuffled.slice(0, count);

    for (const q of selected) {
      result.push({
        questionSource: 'interview_kit' as const,
        interviewKitQuestionId: q.id,
        questionText: q.question_text,
        expectedAnswer: q.expected_answer,
        sectionName: competency.name,
        sectionType: 'competency' as const,
        sectionLabel: competency.name,
        displayOrder: globalOrder++,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof Point Questions Generation (1-2 per proof point)
// ─────────────────────────────────────────────────────────────────────────────

export function generateProofPointQuestions(
  proofPoints: ProofPointForReview[]
): GeneratedQuestion[] {
  if (proofPoints.length === 0) {
    return [];
  }

  const result: GeneratedQuestion[] = [];
  let globalOrder = 1;

  for (const pp of proofPoints) {
    // Minimum 2 questions per proof point
    const questionCount = 2;
    const shuffledTemplates = shuffleArray([...PROOF_POINT_TEMPLATES]);
    
    for (let i = 0; i < questionCount && i < shuffledTemplates.length; i++) {
      const template = shuffledTemplates[i];
      const questionText = template.replace('{title}', pp.title);

      // Build expected answer from proof point context
      let expectedAnswer = `Based on the proof point description:\n\n"${pp.description}"\n\n`;
      expectedAnswer += `The candidate should be able to explain:\n`;
      expectedAnswer += `• The specific approach and methodology used\n`;
      expectedAnswer += `• Measurable outcomes and results achieved\n`;
      expectedAnswer += `• Key challenges faced and how they were overcome\n`;
      expectedAnswer += `• Stakeholder involvement and collaboration`;

      if (pp.hierarchyPath) {
        expectedAnswer += `\n\nContext: ${pp.hierarchyPath}`;
      }

      result.push({
        questionSource: 'proof_point' as const,
        proofPointId: pp.id,
        questionText,
        expectedAnswer,
        sectionName: 'Proof Points Deep-Dive',
        sectionType: 'proof_point' as const,
        sectionLabel: pp.title,
        displayOrder: globalOrder++,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Generation
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateAllQuestionsParams {
  specialityIds: string[];
  competencies: InterviewKitCompetency[];
  proofPoints: ProofPointForReview[];
  industrySegmentId: string;
  expertiseLevelId: string;
}

export async function generateAllInterviewQuestions(
  params: GenerateAllQuestionsParams
): Promise<{
  domainQuestions: GeneratedQuestion[];
  proofPointQuestions: GeneratedQuestion[];
  competencyQuestions: GeneratedQuestion[];
}> {
  const { specialityIds, competencies, proofPoints, industrySegmentId, expertiseLevelId } = params;

  // Generate all question types in parallel
  const [domainQuestions, competencyQuestions] = await Promise.all([
    generateDomainQuestions(specialityIds, 10),
    generateCompetencyQuestions(competencies, industrySegmentId, expertiseLevelId),
  ]);

  // Proof point questions are synchronous
  const proofPointQuestions = generateProofPointQuestions(proofPoints);

  return {
    domainQuestions,
    proofPointQuestions,
    competencyQuestions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Extract speciality IDs from expertise tree
export function extractSpecialityIds(
  proficiencyTree: Array<{
    id: string;
    name: string;
    subDomains: Array<{
      id: string;
      name: string;
      specialities: Array<{ id: string; name: string }>;
    }>;
  }>
): string[] {
  const ids: string[] = [];
  for (const area of proficiencyTree) {
    for (const subDomain of area.subDomains) {
      for (const spec of subDomain.specialities) {
        ids.push(spec.id);
      }
    }
  }
  return ids;
}
