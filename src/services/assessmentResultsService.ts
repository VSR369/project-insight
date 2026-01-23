/**
 * Assessment Results Service
 * 
 * Builds hierarchical score breakdown from assessment responses:
 * Proficiency Area → Sub-Domain → Speciality → Questions
 * 
 * Uses bottom-up calculation:
 * 1. Speciality: (correct / total) * 100
 * 2. Sub-Domain: Average of speciality percentages
 * 3. Proficiency: Average of sub-domain percentages
 */

export interface QuestionResultData {
  id: string;
  questionText: string;
  selectedOption: number | null;
  correctOption: number;
  isCorrect: boolean;
  options: { index: number; text: string }[];
  difficulty: string | null;
  expectedAnswerGuidance: string | null;
}

export interface SpecialityScoreNode {
  id: string;
  name: string;
  correct: number;
  total: number;
  percentage: number;
  rating: number; // 1-5 scale
  questions: QuestionResultData[];
}

export interface SubDomainScoreNode {
  id: string;
  name: string;
  percentage: number | null; // null = "Not Rated"
  rating: number | null;
  correct: number;
  total: number;
  specialities: SpecialityScoreNode[];
}

export interface ProficiencyAreaScoreNode {
  id: string;
  name: string;
  percentage: number | null;
  rating: number | null;
  correct: number;
  total: number;
  subDomains: SubDomainScoreNode[];
}

export interface AssessmentResultsHierarchy {
  proficiencyAreas: ProficiencyAreaScoreNode[];
  overallCorrect: number;
  overallTotal: number;
  overallPercentage: number;
  overallRating: number;
}

// Score color thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 70,
  FAIR: 50,
} as const;

export function getScoreColor(percentage: number | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (percentage === null) return 'gray';
  if (percentage >= SCORE_THRESHOLDS.EXCELLENT) return 'green';
  if (percentage >= SCORE_THRESHOLDS.FAIR) return 'yellow';
  return 'red';
}

export function formatPercentage(value: number | null): string {
  if (value === null) return 'Not Rated';
  return `${value.toFixed(2)}%`;
}

export function formatRating(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(2)}/5`;
}

// Calculate percentage with 2 decimal places
function calcPercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 10000) / 100;
}

// Convert percentage to 1-5 rating
function calcRating(percentage: number): number {
  return Math.round((percentage / 100) * 5 * 100) / 100;
}

interface RawResponseData {
  id: string;
  question_id: string;
  selected_option: number | null;
  is_correct: boolean | null;
  question_bank: {
    id: string;
    question_text: string;
    correct_option: number;
    options: unknown;
    difficulty: string | null;
    expected_answer_guidance: string | null;
    speciality_id: string;
    specialities: {
      id: string;
      name: string;
      sub_domain_id: string;
      sub_domains: {
        id: string;
        name: string;
        proficiency_area_id: string;
        proficiency_areas: {
          id: string;
          name: string;
        };
      };
    };
  };
}

/**
 * Parse options from various formats to standardized array
 */
function parseOptions(options: unknown): { index: number; text: string }[] {
  if (!options) return [];
  
  if (Array.isArray(options)) {
    // Already an array of {index, text}
    if (options.length > 0 && typeof options[0] === 'object' && 'text' in options[0]) {
      return options as { index: number; text: string }[];
    }
    // Array of strings
    return options.map((text, idx) => ({ index: idx, text: String(text) }));
  }
  
  if (typeof options === 'object') {
    // Object like {0: "text", 1: "text"} or {A: "text", B: "text"}
    return Object.entries(options).map(([_key, text], idx) => ({
      index: idx,
      text: String(text),
    }));
  }
  
  return [];
}

/**
 * Build hierarchical score breakdown from raw responses
 */
export function buildResultsHierarchy(
  responses: RawResponseData[]
): AssessmentResultsHierarchy {
  // Step 1: Group by proficiency_area → sub_domain → speciality
  const areaMap = new Map<string, {
    id: string;
    name: string;
    subDomains: Map<string, {
      id: string;
      name: string;
      specialities: Map<string, {
        id: string;
        name: string;
        questions: QuestionResultData[];
      }>;
    }>;
  }>();

  for (const resp of responses) {
    const qb = resp.question_bank;
    const spec = qb.specialities;
    const subDom = spec.sub_domains;
    const area = subDom.proficiency_areas;

    // Get or create area
    if (!areaMap.has(area.id)) {
      areaMap.set(area.id, {
        id: area.id,
        name: area.name,
        subDomains: new Map(),
      });
    }
    const areaNode = areaMap.get(area.id)!;

    // Get or create sub-domain
    if (!areaNode.subDomains.has(subDom.id)) {
      areaNode.subDomains.set(subDom.id, {
        id: subDom.id,
        name: subDom.name,
        specialities: new Map(),
      });
    }
    const subDomNode = areaNode.subDomains.get(subDom.id)!;

    // Get or create speciality
    if (!subDomNode.specialities.has(spec.id)) {
      subDomNode.specialities.set(spec.id, {
        id: spec.id,
        name: spec.name,
        questions: [],
      });
    }
    const specNode = subDomNode.specialities.get(spec.id)!;

    // Add question
    specNode.questions.push({
      id: qb.id,
      questionText: qb.question_text,
      selectedOption: resp.selected_option,
      correctOption: qb.correct_option,
      isCorrect: resp.is_correct ?? false,
      options: parseOptions(qb.options),
      difficulty: qb.difficulty,
      expectedAnswerGuidance: qb.expected_answer_guidance,
    });
  }

  // Step 2: Calculate scores bottom-up
  const proficiencyAreas: ProficiencyAreaScoreNode[] = [];
  let overallCorrect = 0;
  let overallTotal = 0;

  for (const areaData of areaMap.values()) {
    const subDomains: SubDomainScoreNode[] = [];
    let areaCorrect = 0;
    let areaTotal = 0;

    for (const subDomData of areaData.subDomains.values()) {
      const specialities: SpecialityScoreNode[] = [];
      let subDomCorrect = 0;
      let subDomTotal = 0;

      for (const specData of subDomData.specialities.values()) {
        const specCorrect = specData.questions.filter(q => q.isCorrect).length;
        const specTotal = specData.questions.length;
        const specPercentage = calcPercentage(specCorrect, specTotal);

        specialities.push({
          id: specData.id,
          name: specData.name,
          correct: specCorrect,
          total: specTotal,
          percentage: specPercentage,
          rating: calcRating(specPercentage),
          questions: specData.questions,
        });

        subDomCorrect += specCorrect;
        subDomTotal += specTotal;
      }

      // Sub-domain score = average of speciality percentages
      const ratedSpecialities = specialities.filter(s => s.total > 0);
      let subDomPercentage: number | null = null;
      let subDomRating: number | null = null;

      if (ratedSpecialities.length > 0) {
        const avgPercentage = ratedSpecialities.reduce((sum, s) => sum + s.percentage, 0) / ratedSpecialities.length;
        subDomPercentage = Math.round(avgPercentage * 100) / 100;
        subDomRating = calcRating(subDomPercentage);
      }

      subDomains.push({
        id: subDomData.id,
        name: subDomData.name,
        correct: subDomCorrect,
        total: subDomTotal,
        percentage: subDomPercentage,
        rating: subDomRating,
        specialities,
      });

      areaCorrect += subDomCorrect;
      areaTotal += subDomTotal;
    }

    // Proficiency area score = average of sub-domain percentages
    const ratedSubDomains = subDomains.filter(sd => sd.percentage !== null);
    let areaPercentage: number | null = null;
    let areaRating: number | null = null;

    if (ratedSubDomains.length > 0) {
      const avgPercentage = ratedSubDomains.reduce((sum, sd) => sum + sd.percentage!, 0) / ratedSubDomains.length;
      areaPercentage = Math.round(avgPercentage * 100) / 100;
      areaRating = calcRating(areaPercentage);
    }

    proficiencyAreas.push({
      id: areaData.id,
      name: areaData.name,
      correct: areaCorrect,
      total: areaTotal,
      percentage: areaPercentage,
      rating: areaRating,
      subDomains,
    });

    overallCorrect += areaCorrect;
    overallTotal += areaTotal;
  }

  const overallPercentage = calcPercentage(overallCorrect, overallTotal);

  return {
    proficiencyAreas,
    overallCorrect,
    overallTotal,
    overallPercentage,
    overallRating: calcRating(overallPercentage),
  };
}
