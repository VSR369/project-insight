import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * compute-performance-scores
 * 
 * Nightly batch job that computes weighted performance scores for all active providers.
 * Reads activity signals, applies dimension weights, and upserts provider_performance_scores.
 * 
 * Designed for pg_cron invocation — no auth required (uses service_role).
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DimensionWeights {
  quality: number
  consistency: number
  engagement: number
  responsiveness: number
  expertise_depth: number
  community_impact: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Fetch current weights
    const { data: weightsRow, error: wErr } = await supabase
      .from('performance_score_weights')
      .select('dimension, weight')
      .order('dimension')

    if (wErr) throw new Error(`Failed to fetch weights: ${wErr.message}`)

    const weights: DimensionWeights = {
      quality: 0.25,
      consistency: 0.15,
      engagement: 0.20,
      responsiveness: 0.10,
      expertise_depth: 0.20,
      community_impact: 0.10,
    }

    for (const row of weightsRow ?? []) {
      if (row.dimension in weights) {
        weights[row.dimension as keyof DimensionWeights] = row.weight
      }
    }

    // 2. Fetch all active providers
    const { data: providers, error: pErr } = await supabase
      .from('solution_providers')
      .select('id')
      .eq('lifecycle_status', 'active')

    if (pErr) throw new Error(`Failed to fetch providers: ${pErr.message}`)
    if (!providers || providers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let errors = 0

    // 3. For each provider, compute scores from activity signals
    for (const provider of providers) {
      try {
        const scores = await computeProviderScores(supabase, provider.id)

        const composite =
          scores.quality * weights.quality +
          scores.consistency * weights.consistency +
          scores.engagement * weights.engagement +
          scores.responsiveness * weights.responsiveness +
          scores.expertise_depth * weights.expertise_depth +
          scores.community_impact * weights.community_impact

        const { error: upsertErr } = await supabase
          .from('provider_performance_scores')
          .upsert(
            {
              provider_id: provider.id,
              quality_score: scores.quality,
              consistency_score: scores.consistency,
              engagement_score: scores.engagement,
              responsiveness_score: scores.responsiveness,
              expertise_depth_score: scores.expertise_depth,
              community_impact_score: scores.community_impact,
              composite_score: Math.round(composite * 100) / 100,
              computed_at: new Date().toISOString(),
            },
            { onConflict: 'provider_id' }
          )

        if (upsertErr) {
          console.error(`Upsert failed for ${provider.id}: ${upsertErr.message}`)
          errors++
        } else {
          processed++
        }
      } catch (e) {
        console.error(`Score computation failed for ${provider.id}:`, e)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { processed, errors, total: providers.length } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('compute-performance-scores error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'COMPUTATION_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Compute dimension scores for a single provider based on activity signals.
 * 
 * Quality: avg proof point score + assessment score
 * Consistency: streak & regular activity
 * Engagement: challenge participations + Q&A activity
 * Responsiveness: avg response time to notifications/invites
 * Expertise Depth: speciality count + proficiency coverage
 * Community Impact: peer endorsements + content contributions
 */
async function computeProviderScores(
  supabase: ReturnType<typeof createClient>,
  providerId: string
): Promise<DimensionWeights> {
  // Quality: based on assessment scores
  const { data: assessments } = await supabase
    .from('assessment_attempts')
    .select('score_percentage, is_passed')
    .eq('provider_id', providerId)
    .eq('is_passed', true)
    .order('submitted_at', { ascending: false })
    .limit(5)

  const avgAssessment = assessments && assessments.length > 0
    ? assessments.reduce((s, a) => s + (a.score_percentage ?? 0), 0) / assessments.length
    : 0

  // Engagement: count of challenge submissions
  const { count: submissionCount } = await supabase
    .from('challenge_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('is_deleted', false)

  // Expertise depth: count of enrolled industries
  const { count: enrollmentCount } = await supabase
    .from('provider_industry_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)

  // Build scores (0-100 scale)
  const quality = Math.min(avgAssessment, 100)
  const consistency = Math.min((assessments?.length ?? 0) * 20, 100)
  const engagement = Math.min((submissionCount ?? 0) * 15, 100)
  const responsiveness = 50 // Placeholder — needs notification response tracking
  const expertise_depth = Math.min((enrollmentCount ?? 0) * 25, 100)
  const community_impact = 30 // Placeholder — needs peer endorsement tracking

  return { quality, consistency, engagement, responsiveness, expertise_depth, community_impact }
}
