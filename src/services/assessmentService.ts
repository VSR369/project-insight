/**
 * Assessment Service
 * 
 * Handles assessment lifecycle including:
 * - Starting assessments (triggers configuration lock)
 * - Submitting answers
 * - Completing assessments
 * - Calculating results
 */

import { supabase } from '@/integrations/supabase/client';

// Assessment configuration
const DEFAULT_TIME_LIMIT_MINUTES = 60;
const DEFAULT_QUESTIONS_PER_ASSESSMENT = 20;
const PASSING_SCORE_PERCENTAGE = 70;

export interface StartAssessmentInput {
  providerId: string;
  questionsCount?: number;
  timeLimitMinutes?: number;
}

export interface StartAssessmentResult {
  success: boolean;
  attemptId?: string;
  error?: string;
  questionsCount?: number;
  timeLimitMinutes?: number;
}

export interface AssessmentAttempt {
  id: string;
  provider_id: string;
  total_questions: number;
  answered_questions: number | null;
  time_limit_minutes: number;
  started_at: string;
  submitted_at: string | null;
  score_percentage: number | null;
  is_passed: boolean | null;
}

/**
 * Check if provider can start an assessment
 * 
 * Requirements:
 * - Must have minimum proof points met (lifecycle_rank >= 70)
 * - Cannot be in or past assessment_in_progress
 * - No active (unsubmitted) assessment attempt
 */
export async function canStartAssessment(providerId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Get provider's current lifecycle status
  const { data: provider, error: providerError } = await supabase
    .from('solution_providers')
    .select('lifecycle_status, lifecycle_rank')
    .eq('id', providerId)
    .single();

  if (providerError || !provider) {
    return { allowed: false, reason: 'Provider not found' };
  }

  // Must have minimum proof points (rank 70+)
  if (provider.lifecycle_rank < 70) {
    return { 
      allowed: false, 
      reason: 'Complete your proof points before starting the assessment' 
    };
  }

  // Cannot already be in or past assessment
  if (provider.lifecycle_rank >= 100) {
    return { 
      allowed: false, 
      reason: 'Assessment already in progress or completed' 
    };
  }

  // Check for active (unsubmitted) assessment attempt
  const { data: activeAttempt } = await supabase
    .from('assessment_attempts')
    .select('id, started_at, time_limit_minutes')
    .eq('provider_id', providerId)
    .is('submitted_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeAttempt) {
    // Check if attempt has expired
    const startedAt = new Date(activeAttempt.started_at);
    const expiresAt = new Date(startedAt.getTime() + activeAttempt.time_limit_minutes * 60 * 1000);
    
    if (new Date() < expiresAt) {
      return { 
        allowed: false, 
        reason: 'You have an active assessment in progress' 
      };
    }
    // Expired attempt - can start a new one
  }

  return { allowed: true };
}

/**
 * Start a new assessment
 * 
 * This function:
 * 1. Creates an assessment_attempt record
 * 2. Updates provider lifecycle to assessment_in_progress (rank 100)
 * 3. Locks configuration fields (industry, expertise, specialities)
 */
export async function startAssessment(
  input: StartAssessmentInput
): Promise<StartAssessmentResult> {
  const { providerId, questionsCount = DEFAULT_QUESTIONS_PER_ASSESSMENT, timeLimitMinutes = DEFAULT_TIME_LIMIT_MINUTES } = input;

  try {
    // Verify provider can start assessment
    const canStart = await canStartAssessment(providerId);
    if (!canStart.allowed) {
      return { success: false, error: canStart.reason };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create assessment attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('assessment_attempts')
      .insert({
        provider_id: providerId,
        total_questions: questionsCount,
        time_limit_minutes: timeLimitMinutes,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (attemptError) {
      console.error('Failed to create assessment attempt:', attemptError);
      return { success: false, error: 'Failed to start assessment' };
    }

    // Update provider lifecycle to assessment_in_progress
    // This triggers the configuration lock (rank 100)
    const { error: updateError } = await supabase
      .from('solution_providers')
      .update({
        lifecycle_status: 'assessment_in_progress',
        lifecycle_rank: 100,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);

    if (updateError) {
      console.error('Failed to update lifecycle status:', updateError);
      // Rollback: delete the attempt
      await supabase.from('assessment_attempts').delete().eq('id', attempt.id);
      return { success: false, error: 'Failed to update lifecycle status' };
    }

    console.log(`Assessment started for provider ${providerId}, attempt ${attempt.id}`);

    return { 
      success: true, 
      attemptId: attempt.id,
      questionsCount,
      timeLimitMinutes,
    };
  } catch (error) {
    console.error('Start assessment error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get active assessment attempt for a provider
 */
export async function getActiveAssessmentAttempt(
  providerId: string
): Promise<AssessmentAttempt | null> {
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('provider_id', providerId)
    .is('submitted_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch active attempt:', error);
    return null;
  }

  return data;
}

/**
 * Submit assessment (marks as completed)
 * 
 * This function:
 * 1. Calculates score based on responses
 * 2. Determines pass/fail status
 * 3. Updates attempt record
 * 4. Updates provider lifecycle to assessment_completed or assessment_passed
 */
export async function submitAssessment(
  attemptId: string
): Promise<{ success: boolean; score?: number; passed?: boolean; error?: string }> {
  try {
    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('assessment_attempts')
      .select('*, provider_id')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return { success: false, error: 'Assessment attempt not found' };
    }

    if (attempt.submitted_at) {
      return { success: false, error: 'Assessment already submitted' };
    }

    // Count correct responses
    const { count: correctCount, error: countError } = await supabase
      .from('assessment_attempt_responses')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', attemptId)
      .eq('is_correct', true);

    if (countError) {
      return { success: false, error: 'Failed to calculate score' };
    }

    // Count total answered
    const { count: answeredCount } = await supabase
      .from('assessment_attempt_responses')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', attemptId);

    // Calculate score
    const scorePercentage = attempt.total_questions > 0 
      ? Math.round((correctCount || 0) / attempt.total_questions * 100)
      : 0;
    const isPassed = scorePercentage >= PASSING_SCORE_PERCENTAGE;

    // Determine new lifecycle status
    const newStatus = isPassed ? 'assessment_passed' : 'assessment_completed';
    const newRank = isPassed ? 110 : 105;

    // Update attempt
    const { error: updateAttemptError } = await supabase
      .from('assessment_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        answered_questions: answeredCount || 0,
        score_percentage: scorePercentage,
        is_passed: isPassed,
      })
      .eq('id', attemptId);

    if (updateAttemptError) {
      return { success: false, error: 'Failed to submit assessment' };
    }

    // Update provider lifecycle
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('solution_providers')
      .update({
        lifecycle_status: newStatus,
        lifecycle_rank: newRank,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attempt.provider_id);

    console.log(`Assessment submitted: score=${scorePercentage}%, passed=${isPassed}`);

    return { 
      success: true, 
      score: scorePercentage, 
      passed: isPassed 
    };
  } catch (error) {
    console.error('Submit assessment error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get assessment history for a provider
 */
export async function getAssessmentHistory(
  providerId: string
): Promise<AssessmentAttempt[]> {
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('provider_id', providerId)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch assessment history:', error);
    return [];
  }

  return data || [];
}
