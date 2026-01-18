/**
 * Balanced Random Question Generation Service
 * 
 * Implements Industry-Specific | Expert-Level | Solution Provider Self-Assessment
 * question selection with the following constraints:
 * 
 * 1. Sub-Domain Balance (primary control)
 * 2. Speciality Representation
 * 3. Difficulty Distribution
 * 4. Question Type Balancing
 * 5. Capability Tag Balancing
 * 6. Non-Repetition Rule (provider history)
 */

import { supabase } from "@/integrations/supabase/client";
import type { QuestionDifficulty, QuestionType } from "@/hooks/queries/useQuestionBank";
import {
  DEFAULT_QUESTIONS_COUNT,
  DIFFICULTY_TARGETS,
  QUESTION_TYPE_TARGETS,
  MANDATORY_CAPABILITY_CATEGORIES,
  MAX_CAPABILITY_PERCENTAGE,
} from "@/constants/question-generation.constants";

export interface QuestionWithMetadata {
  id: string;
  question_text: string;
  options: unknown;
  correct_option: number;
  difficulty: QuestionDifficulty | null;
  question_type: QuestionType;
  speciality_id: string;
  speciality_name: string;
  sub_domain_id: string;
  sub_domain_name: string;
  proficiency_area_id: string;
  proficiency_area_name: string;
  capability_tags: string[];
}

export interface GenerationResult {
  success: boolean;
  questions: QuestionWithMetadata[];
  warnings: string[];
  stats: {
    totalEligible: number;
    subDomainDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
    questionTypeDistribution: Record<string, number>;
    capabilityDistribution: Record<string, number>;
  };
}

export interface GenerationInput {
  providerId: string;
  enrollmentId: string;
  industrySegmentId: string;
  expertiseLevelId: string;
  questionsCount?: number;
}

/**
 * Fetch all eligible questions for a provider's enrollment
 */
async function fetchEligibleQuestions(
  industrySegmentId: string,
  expertiseLevelId: string,
  providerId: string
): Promise<QuestionWithMetadata[]> {
  // Get proficiency areas for this industry + expertise level
  const { data: profAreas, error: paError } = await supabase
    .from('proficiency_areas')
    .select('id, name')
    .eq('industry_segment_id', industrySegmentId)
    .eq('expertise_level_id', expertiseLevelId)
    .eq('is_active', true);

  if (paError) throw new Error(`Failed to fetch proficiency areas: ${paError.message}`);
  if (!profAreas || profAreas.length === 0) {
    return [];
  }

  const profAreaIds = profAreas.map(pa => pa.id);
  const profAreaNameMap = Object.fromEntries(profAreas.map(pa => [pa.id, pa.name]));

  // Get sub-domains under these proficiency areas
  const { data: subDomains, error: sdError } = await supabase
    .from('sub_domains')
    .select('id, name, proficiency_area_id')
    .in('proficiency_area_id', profAreaIds)
    .eq('is_active', true);

  if (sdError) throw new Error(`Failed to fetch sub-domains: ${sdError.message}`);
  if (!subDomains || subDomains.length === 0) {
    return [];
  }

  const subDomainIds = subDomains.map(sd => sd.id);
  const subDomainMap = Object.fromEntries(subDomains.map(sd => [sd.id, sd]));

  // Get specialities under these sub-domains
  const { data: specialities, error: spError } = await supabase
    .from('specialities')
    .select('id, name, sub_domain_id')
    .in('sub_domain_id', subDomainIds)
    .eq('is_active', true);

  if (spError) throw new Error(`Failed to fetch specialities: ${spError.message}`);
  if (!specialities || specialities.length === 0) {
    return [];
  }

  const specialityIds = specialities.map(sp => sp.id);
  const specialityMap = Object.fromEntries(specialities.map(sp => [sp.id, sp]));

  // Get questions with capability tags for these specialities
  const { data: questions, error: qError } = await supabase
    .from('question_bank')
    .select(`
      id,
      question_text,
      options,
      correct_option,
      difficulty,
      question_type,
      speciality_id,
      question_capability_tags (
        capability_tags (
          id,
          name
        )
      )
    `)
    .in('speciality_id', specialityIds)
    .eq('is_active', true)
    .in('usage_mode', ['self_assessment', 'both']);  // Only self-assessment eligible

  if (qError) throw new Error(`Failed to fetch questions: ${qError.message}`);
  if (!questions || questions.length === 0) {
    return [];
  }

  // Get previously attempted question IDs for this provider
  const { data: exposedQuestions, error: expError } = await supabase
    .from('question_exposure_log')
    .select('question_id')
    .eq('provider_id', providerId);

  if (expError) throw new Error(`Failed to fetch exposure log: ${expError.message}`);

  const exposedQuestionIds = new Set(exposedQuestions?.map(e => e.question_id) || []);

  // Filter out previously attempted questions and map to enriched structure
  const eligibleQuestions: QuestionWithMetadata[] = questions
    .filter(q => !exposedQuestionIds.has(q.id))
    .map(q => {
      const speciality = specialityMap[q.speciality_id];
      const subDomain = subDomainMap[speciality.sub_domain_id];
      
      return {
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        difficulty: q.difficulty as QuestionDifficulty | null,
        question_type: q.question_type as QuestionType,
        speciality_id: q.speciality_id,
        speciality_name: speciality.name,
        sub_domain_id: subDomain.id,
        sub_domain_name: subDomain.name,
        proficiency_area_id: subDomain.proficiency_area_id,
        proficiency_area_name: profAreaNameMap[subDomain.proficiency_area_id],
        capability_tags: (q.question_capability_tags || [])
          .map((ct: { capability_tags: { name: string } | null }) => ct.capability_tags?.name || '')
          .filter(Boolean),
      };
    });

  return eligibleQuestions;
}

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
 * Group questions by a key extractor function
 */
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Main question generation function
 */
export async function generateBalancedQuestions(
  input: GenerationInput
): Promise<GenerationResult> {
  const {
    providerId,
    industrySegmentId,
    expertiseLevelId,
    questionsCount = DEFAULT_QUESTIONS_COUNT,
  } = input;

  const warnings: string[] = [];
  
  // Step 1: Fetch eligible questions (excluding previously attempted)
  const eligibleQuestions = await fetchEligibleQuestions(
    industrySegmentId,
    expertiseLevelId,
    providerId
  );

  if (eligibleQuestions.length === 0) {
    return {
      success: false,
      questions: [],
      warnings: ['No eligible questions found for this industry/expertise combination'],
      stats: {
        totalEligible: 0,
        subDomainDistribution: {},
        difficultyDistribution: {},
        questionTypeDistribution: {},
        capabilityDistribution: {},
      },
    };
  }

  if (eligibleQuestions.length < questionsCount) {
    warnings.push(`Only ${eligibleQuestions.length} eligible questions available (${questionsCount} requested)`);
  }

  // Step 2: Group questions by sub-domain
  const bySubDomain = groupBy(eligibleQuestions, q => q.sub_domain_id);
  const subDomainNames = Object.fromEntries(
    eligibleQuestions.map(q => [q.sub_domain_id, q.sub_domain_name])
  );
  
  const subDomainIds = Object.keys(bySubDomain);
  const numSubDomains = subDomainIds.length;
  
  if (numSubDomains === 0) {
    return {
      success: false,
      questions: [],
      warnings: ['No sub-domains available in question pool'],
      stats: {
        totalEligible: eligibleQuestions.length,
        subDomainDistribution: {},
        difficultyDistribution: {},
        questionTypeDistribution: {},
        capabilityDistribution: {},
      },
    };
  }

  // Step 3: Calculate sub-domain quotas (balance rule)
  const baseQuota = Math.floor(questionsCount / numSubDomains);
  const remainder = questionsCount % numSubDomains;
  
  const subDomainQuotas: Record<string, number> = {};
  subDomainIds.forEach((id, index) => {
    // Distribute remainder to first N sub-domains
    subDomainQuotas[id] = baseQuota + (index < remainder ? 1 : 0);
  });

  // Step 4: Select questions with balanced allocation
  const selectedQuestions: QuestionWithMetadata[] = [];
  const selectedIds = new Set<string>();

  // Track distributions
  const difficultyCount: Record<string, number> = {
    introductory: 0,
    applied: 0,
    advanced: 0,
    strategic: 0,
  };
  const questionTypeCount: Record<string, number> = {};
  const capabilityCount: Record<string, number> = {};
  const specialityCount: Record<string, number> = {};

  // Phase 1: Ensure sub-domain balance
  for (const subDomainId of shuffleArray(subDomainIds)) {
    const quota = subDomainQuotas[subDomainId];
    let available = shuffleArray(bySubDomain[subDomainId])
      .filter(q => !selectedIds.has(q.id));

    // Try to balance specialities within sub-domain
    const bySpeciality = groupBy(available, q => q.speciality_id);
    const specialityIds = shuffleArray(Object.keys(bySpeciality));
    
    let selectedFromSubDomain = 0;
    let round = 0;
    
    while (selectedFromSubDomain < quota && available.length > 0) {
      // Round-robin through specialities
      for (const specId of specialityIds) {
        if (selectedFromSubDomain >= quota) break;
        
        const specQuestions = bySpeciality[specId]?.filter(q => !selectedIds.has(q.id));
        if (!specQuestions || specQuestions.length === 0) continue;

        // Check speciality limit (max 2 per speciality normally, or adaptive)
        const currentSpecCount = specialityCount[specId] || 0;
        const totalSpecialities = specialityIds.length;
        
        let maxPerSpeciality = 2;
        if (totalSpecialities <= 2) {
          maxPerSpeciality = Math.ceil(questionsCount * 0.4);  // 40% max for very limited
        } else if (totalSpecialities <= 4) {
          maxPerSpeciality = Math.ceil(questionsCount * 0.3);  // 30% max
        }

        if (currentSpecCount >= maxPerSpeciality) continue;

        // Select one question, preferring balanced difficulty and type
        const question = selectBestQuestion(
          specQuestions,
          difficultyCount,
          questionTypeCount,
          capabilityCount,
          questionsCount
        );

        if (question) {
          selectedQuestions.push(question);
          selectedIds.add(question.id);
          selectedFromSubDomain++;

          // Update counts
          if (question.difficulty) {
            difficultyCount[question.difficulty] = (difficultyCount[question.difficulty] || 0) + 1;
          }
          questionTypeCount[question.question_type] = (questionTypeCount[question.question_type] || 0) + 1;
          specialityCount[question.speciality_id] = (specialityCount[question.speciality_id] || 0) + 1;
          
          for (const tag of question.capability_tags) {
            capabilityCount[tag.toLowerCase()] = (capabilityCount[tag.toLowerCase()] || 0) + 1;
          }

          // Remove from available
          available = available.filter(q => q.id !== question.id);
          bySpeciality[specId] = specQuestions.filter(q => q.id !== question.id);
        }
      }
      
      round++;
      if (round > 10) break;  // Safety limit
    }

    if (selectedFromSubDomain < quota) {
      warnings.push(`Sub-domain "${subDomainNames[subDomainId]}" only provided ${selectedFromSubDomain}/${quota} questions`);
    }
  }

  // Phase 2: Fill remaining slots if any
  const remaining = questionsCount - selectedQuestions.length;
  if (remaining > 0) {
    const unselected = shuffleArray(eligibleQuestions)
      .filter(q => !selectedIds.has(q.id));
    
    for (let i = 0; i < remaining && i < unselected.length; i++) {
      const q = unselected[i];
      selectedQuestions.push(q);
      selectedIds.add(q.id);
      
      if (q.difficulty) {
        difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
      }
      questionTypeCount[q.question_type] = (questionTypeCount[q.question_type] || 0) + 1;
      
      for (const tag of q.capability_tags) {
        capabilityCount[tag.toLowerCase()] = (capabilityCount[tag.toLowerCase()] || 0) + 1;
      }
    }
  }

  // Phase 3: Validate and report
  const finalSubDomainDist = groupBy(selectedQuestions, q => q.sub_domain_name);
  const subDomainDistribution: Record<string, number> = {};
  for (const [name, qs] of Object.entries(finalSubDomainDist)) {
    subDomainDistribution[name] = qs.length;
  }

  // Check mandatory capability tags
  for (const requiredTag of MANDATORY_CAPABILITY_CATEGORIES) {
    const hasTag = Object.keys(capabilityCount).some(
      tag => tag.includes(requiredTag.toLowerCase())
    );
    if (!hasTag) {
      warnings.push(`No questions with "${requiredTag}" capability tag`);
    }
  }

  // Check capability dominance
  const maxCapabilityAllowed = Math.ceil(questionsCount * MAX_CAPABILITY_PERCENTAGE);
  for (const [tag, count] of Object.entries(capabilityCount)) {
    if (count > maxCapabilityAllowed) {
      warnings.push(`Capability "${tag}" exceeds 30% limit (${count}/${questionsCount})`);
    }
  }

  // Shuffle final selection order
  const finalQuestions = shuffleArray(selectedQuestions);

  return {
    success: finalQuestions.length > 0,
    questions: finalQuestions,
    warnings,
    stats: {
      totalEligible: eligibleQuestions.length,
      subDomainDistribution,
      difficultyDistribution: difficultyCount,
      questionTypeDistribution: questionTypeCount,
      capabilityDistribution: capabilityCount,
    },
  };
}

/**
 * Select the best question from a pool based on current distribution needs
 */
function selectBestQuestion(
  pool: QuestionWithMetadata[],
  currentDifficulty: Record<string, number>,
  currentType: Record<string, number>,
  currentCapability: Record<string, number>,
  targetTotal: number
): QuestionWithMetadata | null {
  if (pool.length === 0) return null;

  // Score each question based on how well it fills gaps
  const scored = pool.map(q => {
    let score = Math.random() * 0.1;  // Small random factor

    // Prefer questions that fill difficulty gaps
    if (q.difficulty) {
      const target = DIFFICULTY_TARGETS[q.difficulty];
      const current = currentDifficulty[q.difficulty] || 0;
      if (current < target.min) {
        score += 3;  // High priority
      } else if (current < target.max) {
        score += 1;  // Medium priority
      } else {
        score -= 1;  // Already at max
      }
    }

    // Prefer questions that fill question type gaps
    const typeTarget = QUESTION_TYPE_TARGETS[q.question_type];
    if (typeTarget) {
      const current = currentType[q.question_type] || 0;
      if (current < typeTarget.min) {
        score += 2;
      } else if (current < typeTarget.max) {
        score += 0.5;
      } else {
        score -= 0.5;
      }
    }

    // Prefer questions that help with capability balance
    for (const tag of q.capability_tags) {
      const tagLower = tag.toLowerCase();
      const current = currentCapability[tagLower] || 0;
      const maxAllowed = Math.ceil(targetTotal * MAX_CAPABILITY_PERCENTAGE);
      
      // Bonus for mandatory tags not yet present
      if (MANDATORY_CAPABILITY_CATEGORIES.some(cat => tagLower.includes(cat)) && current === 0) {
        score += 2;
      }
      
      // Penalty if already at cap
      if (current >= maxAllowed) {
        score -= 2;
      }
    }

    return { question: q, score };
  });

  // Sort by score descending and pick the best
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.question || null;
}

/**
 * Log question exposure to prevent repetition in future assessments
 */
export async function logQuestionExposure(
  providerId: string,
  attemptId: string,
  questionIds: string[]
): Promise<void> {
  const exposureRecords = questionIds.map(questionId => ({
    provider_id: providerId,
    question_id: questionId,
    attempt_id: attemptId,
    exposure_mode: 'self_assessment' as const,
    exposed_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('question_exposure_log')
    .insert(exposureRecords);

  if (error) {
    console.error('Failed to log question exposure:', error);
  }
}
