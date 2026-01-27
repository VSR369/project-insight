/**
 * Interview Question Generation Service
 * Generates questions for the Interview Kit from 3 sources
 * 
 * Note: Uses explicit any casts on Supabase query builders to avoid 
 * TypeScript deep instantiation errors with complex chained queries.
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  PROOF_POINT_QUESTION_TEMPLATES,
  INTERVIEW_KIT_SECTIONS,
  COMPETENCY_CONFIG 
} from "@/constants/interview-kit.constants";

export interface GeneratedQuestion {
  questionText: string;
  expectedAnswer: string | null;
  source: 'question_bank' | 'proof_point' | 'interview_kit' | 'reviewer_custom';
  sectionType: string;
  sectionLabel: string;
  displayOrder: number;
  questionBankId?: string;
  proofPointId?: string;
  interviewKitQuestionId?: string;
}

export interface InterviewKitGenerationResult {
  sections: Array<{
    type: string;
    label: string;
    questions: GeneratedQuestion[];
  }>;
  totalQuestions: number;
}

// Type definitions for query results
interface SpecialityRow { speciality_id: string }
interface QuestionBankRow { id: string; question_text: string; expected_answer_guidance: string | null }
interface ProofPointRow { id: string; title: string; description: string; type: string }
interface CompetencyRow { id: string; name: string; code: string }
interface InterviewKitQuestionRow { id: string; question_text: string; expected_answer: string | null }

// Helper to execute queries without type inference issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeQuery<T>(queryPromise: Promise<any>): Promise<T[]> {
  const result = await queryPromise;
  if (result.error || !result.data) return [];
  return result.data as T[];
}

async function generateDomainQuestions(enrollmentId: string, maxQuestions = 10): Promise<GeneratedQuestion[]> {
  try {
    // Get provider specialities for this enrollment
    const specialities = await executeQuery<SpecialityRow>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('provider_specialities') as any)
        .select('speciality_id')
        .eq('enrollment_id', enrollmentId)
        .eq('is_deleted', false)
    );
    
    if (specialities.length === 0) return [];

    const specialityIds = specialities.map(s => s.speciality_id);
    
    // Get questions from question bank
    const questions = await executeQuery<QuestionBankRow>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('question_bank') as any)
        .select('id, question_text, expected_answer_guidance')
        .in('speciality_id', specialityIds)
        .eq('is_active', true)
        .limit(100)
    );

    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, maxQuestions);
    
    return shuffled.map((q, i) => ({
      questionText: q.question_text,
      expectedAnswer: q.expected_answer_guidance,
      source: 'question_bank' as const,
      sectionType: INTERVIEW_KIT_SECTIONS.domain_delivery.type,
      sectionLabel: INTERVIEW_KIT_SECTIONS.domain_delivery.label,
      displayOrder: i + 1,
      questionBankId: q.id,
    }));
  } catch { return []; }
}

async function generateProofPointQuestions(enrollmentId: string, maxPerPP = 2): Promise<GeneratedQuestion[]> {
  try {
    const proofPoints = await executeQuery<ProofPointRow>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('proof_points') as any)
        .select('id, title, description, type')
        .eq('enrollment_id', enrollmentId)
        .eq('is_deleted', false)
    );

    const questions: GeneratedQuestion[] = [];
    let order = 1;
    
    for (const pp of proofPoints) {
      const templates = PROOF_POINT_QUESTION_TEMPLATES[pp.type] || PROOF_POINT_QUESTION_TEMPLATES.other;
      
      for (const template of templates.slice(0, maxPerPP)) {
        questions.push({
          questionText: template.replace('{title}', pp.title || 'this work'),
          expectedAnswer: pp.description,
          source: 'proof_point' as const,
          sectionType: INTERVIEW_KIT_SECTIONS.proof_points.type,
          sectionLabel: INTERVIEW_KIT_SECTIONS.proof_points.label,
          displayOrder: order++,
          proofPointId: pp.id,
        });
      }
    }
    return questions;
  } catch { return []; }
}

async function generateCompetencyQuestions(industryId: string, levelId: string, perComp = 2): Promise<GeneratedQuestion[]> {
  if (!levelId) return [];
  
  try {
    // Get competencies
    const competencies = await executeQuery<CompetencyRow>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('interview_kit_competencies') as any)
        .select('id, name, code')
        .eq('is_active', true)
        .order('display_order')
    );

    const questions: GeneratedQuestion[] = [];
    
    for (const comp of competencies) {
      // Get questions for this competency
      const compQuestions = await executeQuery<InterviewKitQuestionRow>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('interview_kit_questions') as any)
          .select('id, question_text, expected_answer')
          .eq('competency_id', comp.id)
          .eq('industry_segment_id', industryId)
          .eq('expertise_level_id', levelId)
          .eq('is_active', true)
          .limit(20)
      );

      const shuffled = [...compQuestions].sort(() => Math.random() - 0.5).slice(0, perComp);
      const config = COMPETENCY_CONFIG[comp.code as keyof typeof COMPETENCY_CONFIG];
      
      shuffled.forEach((q, i) => {
        questions.push({
          questionText: q.question_text,
          expectedAnswer: q.expected_answer,
          source: 'interview_kit' as const,
          sectionType: `competency_${comp.code}`,
          sectionLabel: config?.label || comp.name,
          displayOrder: i + 1,
          interviewKitQuestionId: q.id,
        });
      });
    }
    return questions;
  } catch { return []; }
}

export async function generateInterviewKitQuestions(enrollmentId: string, industryId: string, levelId: string): Promise<InterviewKitGenerationResult> {
  const [domain, proofPoint, competency] = await Promise.all([
    generateDomainQuestions(enrollmentId, INTERVIEW_KIT_SECTIONS.domain_delivery.maxQuestions),
    generateProofPointQuestions(enrollmentId, INTERVIEW_KIT_SECTIONS.proof_points.maxQuestionsPerProofPoint),
    generateCompetencyQuestions(industryId, levelId, 2),
  ]);

  const sections: InterviewKitGenerationResult['sections'] = [];
  
  if (domain.length) {
    sections.push({ 
      type: INTERVIEW_KIT_SECTIONS.domain_delivery.type, 
      label: INTERVIEW_KIT_SECTIONS.domain_delivery.label, 
      questions: domain 
    });
  }
  
  if (proofPoint.length) {
    sections.push({ 
      type: INTERVIEW_KIT_SECTIONS.proof_points.type, 
      label: INTERVIEW_KIT_SECTIONS.proof_points.label, 
      questions: proofPoint 
    });
  }

  // Group competency questions by section
  const compMap = new Map<string, GeneratedQuestion[]>();
  competency.forEach(q => {
    const existing = compMap.get(q.sectionType) || [];
    compMap.set(q.sectionType, [...existing, q]);
  });
  
  // Add competency sections in order
  Object.keys(COMPETENCY_CONFIG).forEach(code => {
    const qs = compMap.get(`competency_${code}`);
    if (qs?.length) {
      sections.push({ 
        type: `competency_${code}`, 
        label: COMPETENCY_CONFIG[code as keyof typeof COMPETENCY_CONFIG].label, 
        questions: qs 
      });
    }
  });

  return { 
    sections, 
    totalQuestions: sections.reduce((s, sec) => s + sec.questions.length, 0) 
  };
}
