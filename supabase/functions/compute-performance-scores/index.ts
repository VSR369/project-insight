import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * compute-performance-scores (Spec-aligned)
 * 
 * Nightly batch: computes 6 spec dimensions + raw counts for all active providers.
 * Dimensions: community_engagement, abstracts_submitted, solution_quality,
 *             complexity_handled, win_achievement, knowledge_contrib
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SpecWeights {
  community_engagement: number
  abstracts_submitted: number
  solution_quality: number
  complexity_handled: number
  win_achievement: number
  knowledge_contrib: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Fetch current weights
    const { data: weightsRows } = await supabase
      .from('performance_score_weights')
      .select('dimension, weight')

    const weights: SpecWeights = {
      community_engagement: 0.10,
      abstracts_submitted: 0.15,
      solution_quality: 0.25,
      complexity_handled: 0.20,
      win_achievement: 0.20,
      knowledge_contrib: 0.10,
    }

    for (const row of weightsRows ?? []) {
      if (row.dimension in weights) {
        weights[row.dimension as keyof SpecWeights] = row.weight
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
    const today = new Date().toISOString().split('T')[0]

    for (const provider of providers) {
      try {
        const raw = await fetchRawCounts(supabase, provider.id)
        const scores = computeScores(raw)

        const composite =
          scores.community_engagement * weights.community_engagement +
          scores.abstracts_submitted * weights.abstracts_submitted +
          scores.solution_quality * weights.solution_quality +
          scores.complexity_handled * weights.complexity_handled +
          scores.win_achievement * weights.win_achievement +
          scores.knowledge_contrib * weights.knowledge_contrib

        const { error: upsertErr } = await supabase
          .from('provider_performance_scores')
          .upsert(
            {
              provider_id: provider.id,
              score_date: today,
              // Raw counts
              community_posts_count: raw.communityPosts,
              community_helpful_votes: raw.helpfulVotes,
              articles_written: raw.articles,
              peer_reviews_given: raw.peerReviews,
              abstracts_submitted: raw.abstracts,
              full_solutions_submitted: raw.fullSolutions,
              solutions_accepted: raw.accepted,
              wins_platinum: raw.platinum,
              wins_gold: raw.gold,
              wins_silver: raw.silver,
              avg_challenge_complexity: raw.avgComplexity,
              // Spec scores
              score_community_engagement: scores.community_engagement,
              score_abstracts_submitted: scores.abstracts_submitted,
              score_solution_quality: scores.solution_quality,
              score_complexity_handled: scores.complexity_handled,
              score_win_achievement: scores.win_achievement,
              score_knowledge_contrib: scores.knowledge_contrib,
              composite_score: Math.round(composite * 100) / 100,
              computed_at: new Date().toISOString(),
              // Legacy columns (keep backward compat)
              quality_score: scores.solution_quality,
              consistency_score: 0,
              engagement_score: scores.community_engagement,
              responsiveness_score: 0,
              expertise_depth_score: scores.complexity_handled,
              community_impact_score: scores.knowledge_contrib,
            },
            { onConflict: 'provider_id,score_date' }
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

interface RawCounts {
  communityPosts: number
  helpfulVotes: number
  articles: number
  peerReviews: number
  abstracts: number
  fullSolutions: number
  accepted: number
  platinum: number
  gold: number
  silver: number
  avgComplexity: number
}

async function fetchRawCounts(
  supabase: ReturnType<typeof createClient>,
  providerId: string
): Promise<RawCounts> {
  // Community posts
  const [postsRes, articlesRes, reviewsRes, votesRes] = await Promise.all([
    supabase.from('community_posts').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('is_deleted', false),
    supabase.from('community_posts').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('post_type', 'article').eq('is_deleted', false),
    supabase.from('community_posts').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('post_type', 'peer_review').eq('is_deleted', false),
    supabase.from('community_posts').select('helpful_votes')
      .eq('provider_id', providerId).eq('is_deleted', false),
  ])

  const totalVotes = (votesRes.data ?? []).reduce((s, r) => s + (r.helpful_votes ?? 0), 0)

  // Submissions
  const [abstractsRes, fullRes, acceptedRes] = await Promise.all([
    supabase.from('challenge_submissions').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('submission_type', 'abstract').eq('is_deleted', false),
    supabase.from('challenge_submissions').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('submission_type', 'full').eq('is_deleted', false),
    supabase.from('challenge_submissions').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('status', 'accepted').eq('is_deleted', false),
  ])

  // Wins
  const { data: wins } = await supabase
    .from('challenge_submissions')
    .select('award_tier')
    .eq('provider_id', providerId)
    .eq('is_deleted', false)
    .in('award_tier', ['platinum', 'gold', 'silver'])

  const platinum = wins?.filter(w => w.award_tier === 'platinum').length ?? 0
  const gold = wins?.filter(w => w.award_tier === 'gold').length ?? 0
  const silver = wins?.filter(w => w.award_tier === 'silver').length ?? 0

  // Avg complexity
  const { data: complexityData } = await supabase
    .from('challenge_submissions')
    .select('complexity_level_at_submission')
    .eq('provider_id', providerId)
    .eq('is_deleted', false)
    .not('complexity_level_at_submission', 'is', null)

  const complexityMap: Record<string, number> = { simple: 1, moderate: 2, complex: 3, expert: 4 }
  const complexityValues = (complexityData ?? [])
    .map(c => complexityMap[c.complexity_level_at_submission ?? ''] ?? 0)
    .filter(v => v > 0)
  const avgComplexity = complexityValues.length > 0
    ? complexityValues.reduce((a, b) => a + b, 0) / complexityValues.length
    : 0

  return {
    communityPosts: postsRes.count ?? 0,
    helpfulVotes: totalVotes,
    articles: articlesRes.count ?? 0,
    peerReviews: reviewsRes.count ?? 0,
    abstracts: abstractsRes.count ?? 0,
    fullSolutions: fullRes.count ?? 0,
    accepted: acceptedRes.count ?? 0,
    platinum,
    gold,
    silver,
    avgComplexity: Math.round(avgComplexity * 100) / 100,
  }
}

function computeScores(raw: RawCounts): SpecWeights {
  // Community Engagement (10%): posts + articles + peer reviews + helpful votes
  const ce = Math.min(
    (raw.communityPosts * 5 + raw.articles * 10 + raw.peerReviews * 8 + raw.helpfulVotes * 2),
    100
  )

  // Abstracts Submitted (15%)
  const ab = Math.min(raw.abstracts * 10, 100)

  // Solution Quality (25%): full solutions × acceptance ratio
  const acceptRate = raw.fullSolutions > 0 ? raw.accepted / raw.fullSolutions : 0
  const sq = Math.min(raw.fullSolutions * 15 * acceptRate, 100)

  // Complexity Handled (20%): avg complexity mapped to 0-100
  const ch = Math.min(raw.avgComplexity * 25, 100)

  // Win Achievement (20%): platinum×3 + gold×2 + silver×1
  const wa = Math.min((raw.platinum * 3 + raw.gold * 2 + raw.silver * 1) * 10, 100)

  // Knowledge Contribution (10%): articles + peer reviews
  const kc = Math.min((raw.articles * 12 + raw.peerReviews * 10), 100)

  return {
    community_engagement: Math.round(ce * 100) / 100,
    abstracts_submitted: Math.round(ab * 100) / 100,
    solution_quality: Math.round(sq * 100) / 100,
    complexity_handled: Math.round(ch * 100) / 100,
    win_achievement: Math.round(wa * 100) / 100,
    knowledge_contrib: Math.round(kc * 100) / 100,
  }
}
