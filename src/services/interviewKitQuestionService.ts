/**
 * Interview Kit Question Generation Service
 * Generates interview questions from multiple sources
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  QUESTIONS_PER_COMPETENCY, 
  QUESTIONS_PER_PROOF_POINT, 
  DOMAIN_QUESTIONS_LIMIT 
} from "@/constants/interview-kit-scoring.constants";

export interface GeneratedQuestion {
  id: string;
  questionSource: 'interview_kit' | 'question_bank' | 'proof_point';
  questionId: string | null;
  proofPointId: string | null;
  questionText: string;
  expectedAnswer: string | null;
  sectionName: string;
  displayOrder: number;
  metadata?: {
    competencyCode?: string;
    competencyName?: string;
    specialityName?: string;
    proofPointTitle?: string;
  };
}

// Seeded random for deterministic question selection
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function shuffleArray<T>(array: T[], seed: string): T[] {
  const random = seededRandom(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate domain questions from question_bank based on provider's specialities
 */
export async function generateDomainQuestions(
  enrollmentId: string,
  seed: string
): Promise<GeneratedQuestion[]> {
  // Get provider's selected specialities
  // @ts-ignore - Supabase type instantiation too deep
  const specialitiesResult = await supabase
    .from("provider_specialities")
    .select("speciality_id")
    .eq("enrollment_id", enrollmentId)
    .eq("is_deleted", false);

  const specialities = specialitiesResult.data as { speciality_id: string }[] | null;

  if (!specialities || specialities.length === 0) {
    return [];
  }

  const specialityIds = specialities.map(s => s.speciality_id);

  // @ts-ignore - Supabase type instantiation too deep
  const questionsResult = await supabase
    .from("question_bank")
    .select("id, question_text, correct_option, options, speciality_id")
    .in("speciality_id", specialityIds)
    .in("usage_mode", ["interview", "both"])
    .eq("is_deleted", false)
    .limit(50);

  const questions = questionsResult.data as { id: string; question_text: string; correct_option: number | null; options: string[] | null; speciality_id: string }[] | null;

  if (!questions || questions.length === 0) {
    return [];
  }

  // Shuffle and take limited number
  const shuffled = shuffleArray(questions, seed);
  const selected = shuffled.slice(0, DOMAIN_QUESTIONS_LIMIT);

  return selected.map((q, index) => ({
    id: `domain-${q.id}`,
    questionSource: 'question_bank' as const,
    questionId: q.id,
    proofPointId: null,
    questionText: q.question_text,
    expectedAnswer: q.options ? `Correct: Option ${(q.correct_option || 0) + 1}` : null,
    sectionName: 'Domain & Delivery Depth',
    displayOrder: index,
  }));
}

/**
 * Generate proof point deep-dive questions
 */
export async function generateProofPointQuestions(
  enrollmentId: string,
  seed: string
): Promise<GeneratedQuestion[]> {
  // Get proof points for this enrollment
  const { data: proofPoints } = await supabase
    .from("proof_points")
    .select("id, title, description, category")
    .eq("enrollment_id", enrollmentId)
    .eq("is_deleted", false)
    .limit(10);

  if (!proofPoints || proofPoints.length === 0) {
    return [];
  }

  const questions: GeneratedQuestion[] = [];
  let orderIndex = 0;

  // Generate follow-up questions for each proof point
  for (const pp of proofPoints) {
    const numQuestions = QUESTIONS_PER_PROOF_POINT.min + 
      (seededRandom(seed + pp.id)() > 0.5 ? 1 : 0);

    // Generate contextual questions based on proof point
    const followUpTemplates = [
      `Can you walk me through the specific challenges you faced during "${pp.title}" and how you addressed them?`,
      `What measurable outcomes or results did you achieve from this experience with "${pp.title}"?`,
      `How did you handle stakeholder communication and alignment during "${pp.title}"?`,
      `What would you do differently if you were to approach "${pp.title}" again?`,
      `Can you describe a specific decision you made during "${pp.title}" and the reasoning behind it?`,
    ];

    const shuffledTemplates = shuffleArray(followUpTemplates, seed + pp.id);

    for (let i = 0; i < numQuestions && i < shuffledTemplates.length; i++) {
      questions.push({
        id: `proof-${pp.id}-${i}`,
        questionSource: 'proof_point',
        questionId: null,
        proofPointId: pp.id,
        questionText: shuffledTemplates[i],
        expectedAnswer: `Reference: ${pp.description || pp.title}`,
        sectionName: 'Proof Points Deep-Dive',
        displayOrder: orderIndex++,
        metadata: {
          proofPointTitle: pp.title,
        },
      });
    }
  }

  return questions;
}

/**
 * Generate competency questions from interview_kit_questions
 */
export async function generateCompetencyQuestions(
  industrySegmentId: string,
  expertiseLevelId: string,
  seed: string
): Promise<GeneratedQuestion[]> {
  // Get all competencies
  const { data: competencies } = await supabase
    .from("interview_kit_competencies")
    .select("id, code, name")
    .eq("is_active", true)
    .order("display_order");

  if (!competencies || competencies.length === 0) {
    return [];
  }

  // Get questions for this industry/level combination
  const { data: questions } = await supabase
    .from("interview_kit_questions")
    .select(`
      id,
      question_text,
      expected_answer,
      competency_id,
      interview_kit_competencies:competency_id(id, code, name)
    `)
    .eq("industry_segment_id", industrySegmentId)
    .eq("expertise_level_id", expertiseLevelId)
    .eq("is_active", true);

  if (!questions || questions.length === 0) {
    return [];
  }

  const allQuestions: GeneratedQuestion[] = [];
  let globalOrder = 0;

  // Group questions by competency
  for (const competency of competencies) {
    const competencyQuestions = questions.filter(
      q => q.competency_id === competency.id
    );

    if (competencyQuestions.length === 0) continue;

    // Shuffle and select 2-3 questions per competency
    const shuffled = shuffleArray(competencyQuestions, seed + competency.id);
    const numToSelect = Math.min(
      shuffled.length,
      QUESTIONS_PER_COMPETENCY.min + (seededRandom(seed + competency.id)() > 0.5 ? 1 : 0)
    );
    const selected = shuffled.slice(0, numToSelect);

    for (const q of selected) {
      allQuestions.push({
        id: `kit-${q.id}`,
        questionSource: 'interview_kit',
        questionId: q.id,
        proofPointId: null,
        questionText: q.question_text,
        expectedAnswer: q.expected_answer,
        sectionName: competency.name,
        displayOrder: globalOrder++,
        metadata: {
          competencyCode: competency.code,
          competencyName: competency.name,
        },
      });
    }
  }

  return allQuestions;
}

/**
 * Generate all interview questions for an enrollment
 */
export async function generateAllInterviewQuestions(
  enrollmentId: string,
  industrySegmentId: string,
  expertiseLevelId: string,
  bookingId: string
): Promise<GeneratedQuestion[]> {
  // Use bookingId as seed for deterministic randomization
  const seed = bookingId;

  const [domainQuestions, proofPointQuestions, competencyQuestions] = await Promise.all([
    generateDomainQuestions(enrollmentId, seed),
    generateProofPointQuestions(enrollmentId, seed),
    generateCompetencyQuestions(industrySegmentId, expertiseLevelId, seed),
  ]);

  // Combine all questions with proper ordering
  let globalOrder = 0;
  const allQuestions: GeneratedQuestion[] = [];

  // Section 1: Domain & Delivery Depth
  for (const q of domainQuestions) {
    allQuestions.push({ ...q, displayOrder: globalOrder++ });
  }

  // Section 2: Proof Points Deep-Dive
  for (const q of proofPointQuestions) {
    allQuestions.push({ ...q, displayOrder: globalOrder++ });
  }

  // Sections 3-7: Competency Questions (already ordered by competency)
  for (const q of competencyQuestions) {
    allQuestions.push({ ...q, displayOrder: globalOrder++ });
  }

  return allQuestions;
}

/**
 * Get unique section names from questions
 */
export function getSectionNames(questions: GeneratedQuestion[]): string[] {
  const sections = new Set<string>();
  questions.forEach(q => sections.add(q.sectionName));
  return Array.from(sections);
}

/**
 * Group questions by section
 */
export function groupQuestionsBySection(
  questions: GeneratedQuestion[]
): Map<string, GeneratedQuestion[]> {
  const grouped = new Map<string, GeneratedQuestion[]>();
  
  for (const q of questions) {
    const existing = grouped.get(q.sectionName) || [];
    existing.push(q);
    grouped.set(q.sectionName, existing);
  }

  return grouped;
}
