/**
 * Interview Kit Generation Service
 * Generates interview questions from various sources for the Interview Kit tab
 * Per Project Knowledge Section 7-8 - Service Layer Guidelines
 */

import { supabase } from "@/integrations/supabase/client";
import {
  DOMAIN_QUESTION_MAX,
  COMPETENCY_QUESTIONS_PER_SECTION,
  PROOF_POINT_QUESTIONS_PER_ITEM,
  PROOF_POINT_QUESTION_TEMPLATES,
  PROOF_POINT_DEFAULT_GUIDANCE,
  QUESTION_SOURCE,
  SECTION_TYPE,
  SECTION_CONFIG,
  SECTION_DISPLAY_ORDER,
} from "@/constants/interview-kit-reviewer.constants";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";

// =====================================================
// Types
// =====================================================

export interface GeneratedQuestion {
  question_text: string;
  expected_answer: string | null;
  question_source: string;
  section_name: string;
  section_type: string;
  section_label?: string;
  display_order: number;
  // Optional FK references
  question_bank_id?: string;
  interview_kit_question_id?: string;
  proof_point_id?: string;
  // Metadata for domain questions
  hierarchy_path?: string;
}

export interface InterviewKitGenerationResult {
  domainQuestions: GeneratedQuestion[];
  competencyQuestions: GeneratedQuestion[];
  proofPointQuestions: GeneratedQuestion[];
  totalCount: number;
}

export interface EnrollmentContext {
  enrollmentId: string;
  industrySegmentId: string;
  expertiseLevelId: string;
  providerId: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Truncate text to max length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// =====================================================
// Domain Questions Generation
// =====================================================

/**
 * Generate domain questions from question_bank
 * Filters by provider's specialities, usage_mode = 'interview' or 'both'
 * Returns max 10 questions randomly selected
 */
export async function generateDomainQuestions(
  context: EnrollmentContext
): Promise<GeneratedQuestion[]> {
  // Get provider's selected specialities for this enrollment
  const specResult = await fetchProviderSpecialities(context.providerId, context.enrollmentId);

  let questionsResult: { id: string; question_text: string; expected_answer_guidance: string | null; speciality_id: string }[];

  if (specResult && specResult.length > 0) {
    // Use provider's selected specialities
    const specialityIds = specResult.map(s => s.speciality_id);
    questionsResult = await fetchDomainQuestionsFromBank(specialityIds);
  } else {
    // FALLBACK: Get questions for provider's industry/level via hierarchy
    console.log('[InterviewKit] No specialities found, using industry/level fallback');
    questionsResult = await fetchDomainQuestionsByIndustryLevel(
      context.industrySegmentId,
      context.expertiseLevelId
    );
  }

  if (!questionsResult || questionsResult.length === 0) {
    console.warn('[InterviewKit] No domain questions available');
    return [];
  }

  // Shuffle and take max DOMAIN_QUESTION_MAX
  const shuffled = shuffleArray(questionsResult);
  const selected = shuffled.slice(0, DOMAIN_QUESTION_MAX);

  return selected.map((q, idx) => ({
    question_text: q.question_text,
    expected_answer: q.expected_answer_guidance,
    question_source: QUESTION_SOURCE.question_bank,
    section_name: SECTION_CONFIG.domain.name,
    section_type: SECTION_TYPE.domain,
    section_label: undefined,
    display_order: SECTION_DISPLAY_ORDER.domain + idx,
    question_bank_id: q.id,
  }));
}

// Helper function to avoid TypeScript recursion issue
async function fetchProviderSpecialities(
  providerId: string,
  enrollmentId: string
): Promise<{ speciality_id: string }[]> {
  // @ts-ignore - Supabase type instantiation too deep
  const { data, error } = await supabase
    .from('provider_specialities')
    .select('speciality_id')
    .eq('provider_id', providerId)
    .eq('enrollment_id', enrollmentId);
  // Note: Removed .eq('is_deleted', false) - column doesn't exist in provider_specialities

  if (error) {
    console.error('Error fetching provider specialities:', error);
    return [];
  }
  return (data || []) as { speciality_id: string }[];
}

// Fallback: Get domain questions by industry/level when no specialities selected
async function fetchDomainQuestionsByIndustryLevel(
  industrySegmentId: string,
  expertiseLevelId: string
): Promise<{ id: string; question_text: string; expected_answer_guidance: string | null; speciality_id: string }[]> {
  // Get all specialities for this industry/level via the hierarchy
  // @ts-ignore - Supabase type instantiation too deep
  const { data: profAreas, error: profError } = await supabase
    .from('proficiency_areas')
    .select('id')
    .eq('industry_segment_id', industrySegmentId)
    .eq('expertise_level_id', expertiseLevelId)
    .eq('is_active', true);

  if (profError || !profAreas || profAreas.length === 0) {
    console.warn('[InterviewKit] No proficiency areas for fallback');
    return [];
  }

  const profAreaIds = profAreas.map(p => p.id);

  // Get sub_domains for these proficiency areas
  // @ts-ignore
  const { data: subDomains, error: subError } = await supabase
    .from('sub_domains')
    .select('id')
    .in('proficiency_area_id', profAreaIds)
    .eq('is_active', true);

  if (subError || !subDomains || subDomains.length === 0) {
    console.warn('[InterviewKit] No sub-domains for fallback');
    return [];
  }

  const subDomainIds = subDomains.map(s => s.id);

  // Get specialities for these sub-domains
  // @ts-ignore
  const { data: specialities, error: specError } = await supabase
    .from('specialities')
    .select('id')
    .in('sub_domain_id', subDomainIds)
    .eq('is_active', true);

  if (specError || !specialities || specialities.length === 0) {
    console.warn('[InterviewKit] No specialities for fallback');
    return [];
  }

  const specialityIds = specialities.map(s => s.id);

  // Now fetch questions from question_bank for these specialities
  return fetchDomainQuestionsFromBank(specialityIds);
}

// Helper function to fetch domain questions
async function fetchDomainQuestionsFromBank(
  specialityIds: string[]
): Promise<{ id: string; question_text: string; expected_answer_guidance: string | null; speciality_id: string }[]> {
  // @ts-ignore - Supabase type instantiation too deep
  const { data, error } = await supabase
    .from('question_bank')
    .select('id, question_text, expected_answer_guidance, speciality_id')
    .in('speciality_id', specialityIds)
    .in('usage_mode', ['interview', 'both'])
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching domain questions:', error);
    return [];
  }
  return (data || []) as { id: string; question_text: string; expected_answer_guidance: string | null; speciality_id: string }[];
}

// =====================================================
// Competency Questions Generation
// =====================================================

/**
 * Generate competency questions from interview_kit_questions
 * Filters by industry_segment_id and expertise_level_id
 * Returns 1-2 questions per competency
 */
export async function generateCompetencyQuestions(
  context: EnrollmentContext
): Promise<GeneratedQuestion[]> {
  // Fetch all active competencies
  const { data: competencies, error: compError } = await supabase
    .from('interview_kit_competencies')
    .select('id, name, code, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (compError) {
    console.error('Error fetching competencies:', compError);
    return [];
  }

  if (!competencies || competencies.length === 0) {
    return [];
  }

  const allQuestions: GeneratedQuestion[] = [];

  // For each competency, fetch questions matching industry + level
  for (const comp of competencies) {
    const { data: compQuestions, error: questionsError } = await supabase
      .from('interview_kit_questions')
      .select('id, question_text, expected_answer')
      .eq('competency_id', comp.id)
      .eq('industry_segment_id', context.industrySegmentId)
      .eq('expertise_level_id', context.expertiseLevelId)
      .eq('is_active', true);

    if (questionsError) {
      console.error(`Error fetching questions for competency ${comp.code}:`, questionsError);
      continue;
    }

    if (!compQuestions || compQuestions.length === 0) {
      continue;
    }

    // Shuffle and select 1-2 questions
    const shuffled = shuffleArray(compQuestions);
    const count = randomBetween(
      COMPETENCY_QUESTIONS_PER_SECTION.min,
      Math.min(COMPETENCY_QUESTIONS_PER_SECTION.max, shuffled.length)
    );
    const selected = shuffled.slice(0, count);

    selected.forEach((q, idx) => {
      allQuestions.push({
        question_text: q.question_text,
        expected_answer: q.expected_answer,
        question_source: QUESTION_SOURCE.interview_kit,
        section_name: comp.name,
        section_type: SECTION_TYPE.competency,
        display_order: SECTION_DISPLAY_ORDER.competency_base + (comp.display_order || 0) * 10 + idx,
        interview_kit_question_id: q.id,
      });
    });
  }

  return allQuestions;
}

// =====================================================
// Proof Point Questions Generation
// =====================================================

/**
 * Generate follow-up questions from proof points
 * 
 * DISABLED: Proof point questions require AI-based generation from the 
 * provider's description to create meaningful, contextual questions.
 * Currently returns empty array until AI generation is implemented.
 * 
 * Future implementation should:
 * - Parse the proof point description
 * - Generate questions that probe specific claims in the description
 * - Link questions to the proof_point_id for traceability
 */
export function generateProofPointQuestions(
  proofPoints: ProofPointForReview[]
): GeneratedQuestion[] {
  // Return empty array - proof points require AI generation based on description
  // which is not yet implemented. This prevents the generation of generic
  // template-based questions that don't reference the actual content.
  console.log('[InterviewKit] Proof point question generation disabled - requires AI integration');
  console.log('[InterviewKit] Proof points available:', proofPoints?.length || 0);
  return [];
}

// =====================================================
// Main Generation Function
// =====================================================

/**
 * Build the full interview kit by combining all question sources
 * This generates questions but does NOT persist them
 */
export async function buildInterviewKit(
  context: EnrollmentContext,
  proofPoints: ProofPointForReview[]
): Promise<InterviewKitGenerationResult> {
  // Generate all question types in parallel
  const [domainQuestions, competencyQuestions] = await Promise.all([
    generateDomainQuestions(context),
    generateCompetencyQuestions(context),
  ]);

  // Proof point generation is synchronous (no DB calls)
  const proofPointQuestions = generateProofPointQuestions(proofPoints);

  // Debug logging to verify correct question counts
  console.log('[InterviewKit] Generation Results:', {
    domain: domainQuestions.length,
    competency: competencyQuestions.length,
    proofPoint: proofPointQuestions.length,
    total: domainQuestions.length + competencyQuestions.length + proofPointQuestions.length,
  });

  return {
    domainQuestions,
    competencyQuestions,
    proofPointQuestions,
    totalCount: domainQuestions.length + competencyQuestions.length + proofPointQuestions.length,
  };
}

// =====================================================
// Score Calculation
// =====================================================

import { RATING_VALUES, RECOMMENDATION_THRESHOLDS, type RecommendationType } from "@/constants/interview-kit-reviewer.constants";

export interface InterviewScoreResult {
  totalQuestions: number;
  ratedCount: number;
  rightCount: number;
  wrongCount: number;
  notAnsweredCount: number;
  unratedCount: number;
  totalScore: number;
  maxPossibleScore: number;
  scorePercentage: number;
  recommendation: RecommendationType;
  recommendationLabel: string;
}

export interface InterviewQuestionResponse {
  id: string;
  rating: string | null;
  score: number | null;
}

/**
 * Calculate interview score from responses
 */
export function calculateInterviewScore(
  responses: InterviewQuestionResponse[]
): InterviewScoreResult {
  const totalQuestions = responses.length;
  
  const rightCount = responses.filter(r => r.rating === 'right').length;
  const wrongCount = responses.filter(r => r.rating === 'wrong').length;
  const notAnsweredCount = responses.filter(r => r.rating === 'not_answered').length;
  const unratedCount = responses.filter(r => !r.rating).length;
  const ratedCount = totalQuestions - unratedCount;

  const totalScore = rightCount * RATING_VALUES.right;
  const maxPossibleScore = totalQuestions * RATING_VALUES.right;
  const scorePercentage = maxPossibleScore > 0 
    ? (totalScore / maxPossibleScore) * 100 
    : 0;

  // Determine recommendation based on percentage
  let recommendation: RecommendationType = 'not_recommended';
  if (scorePercentage >= RECOMMENDATION_THRESHOLDS.strong_recommend.min) {
    recommendation = 'strong_recommend';
  } else if (scorePercentage >= RECOMMENDATION_THRESHOLDS.recommend_with_conditions.min) {
    recommendation = 'recommend_with_conditions';
  } else if (scorePercentage >= RECOMMENDATION_THRESHOLDS.borderline.min) {
    recommendation = 'borderline';
  }

  return {
    totalQuestions,
    ratedCount,
    rightCount,
    wrongCount,
    notAnsweredCount,
    unratedCount,
    totalScore,
    maxPossibleScore,
    scorePercentage: Math.round(scorePercentage * 10) / 10, // Round to 1 decimal
    recommendation,
    recommendationLabel: RECOMMENDATION_THRESHOLDS[recommendation].label,
  };
}

/**
 * Get recommendation from percentage (for real-time display)
 */
export function getRecommendationFromPercentage(percentage: number): {
  recommendation: RecommendationType;
  config: typeof RECOMMENDATION_THRESHOLDS[RecommendationType];
} {
  if (percentage >= RECOMMENDATION_THRESHOLDS.strong_recommend.min) {
    return { recommendation: 'strong_recommend', config: RECOMMENDATION_THRESHOLDS.strong_recommend };
  }
  if (percentage >= RECOMMENDATION_THRESHOLDS.recommend_with_conditions.min) {
    return { recommendation: 'recommend_with_conditions', config: RECOMMENDATION_THRESHOLDS.recommend_with_conditions };
  }
  if (percentage >= RECOMMENDATION_THRESHOLDS.borderline.min) {
    return { recommendation: 'borderline', config: RECOMMENDATION_THRESHOLDS.borderline };
  }
  return { recommendation: 'not_recommended', config: RECOMMENDATION_THRESHOLDS.not_recommended };
}
