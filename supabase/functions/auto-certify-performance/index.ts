import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * auto-certify-performance
 * 
 * Runs after compute-performance-scores to check if any provider's
 * composite score crosses certification thresholds.
 * Auto-upserts provider_certifications for the 'performance' path.
 * 
 * Thresholds: Proven >= 51, Acclaimed >= 66, Eminent >= 86
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const THRESHOLDS = [
  { minScore: 86, starTier: 3, label: 'eminent' },
  { minScore: 66, starTier: 2, label: 'acclaimed' },
  { minScore: 51, starTier: 1, label: 'proven' },
] as const

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Fetch all performance scores
    const { data: scores, error: sErr } = await supabase
      .from('provider_performance_scores')
      .select('provider_id, composite_score')

    if (sErr) throw new Error(`Failed to fetch scores: ${sErr.message}`)
    if (!scores || scores.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { certified: 0, upgraded: 0, total: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let certified = 0
    let upgraded = 0
    let errors = 0

    for (const score of scores) {
      try {
        // Determine tier from composite score
        const tier = THRESHOLDS.find((t) => score.composite_score >= t.minScore)
        if (!tier) continue // Below minimum threshold

        // Check existing performance-path cert
        const { data: existing } = await supabase
          .from('provider_certifications')
          .select('id, star_tier, status')
          .eq('provider_id', score.provider_id)
          .eq('cert_path', 'performance')
          .eq('status', 'active')
          .maybeSingle()

        if (existing) {
          // Only upgrade, never downgrade
          if (existing.star_tier >= tier.starTier) continue

          // Supersede old cert
          await supabase
            .from('provider_certifications')
            .update({ status: 'superseded' })
            .eq('id', existing.id)

          upgraded++
        } else {
          certified++
        }

        // Insert new cert
        const { error: insertErr } = await supabase
          .from('provider_certifications')
          .insert({
            provider_id: score.provider_id,
            cert_path: 'performance',
            star_tier: tier.starTier,
            cert_label: tier.label,
            composite_score: score.composite_score,
            status: 'active',
            awarded_at: new Date().toISOString(),
          })

        if (insertErr) {
          console.error(`Cert insert failed for ${score.provider_id}: ${insertErr.message}`)
          errors++
        }
      } catch (e) {
        console.error(`Auto-certify failed for ${score.provider_id}:`, e)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { certified, upgraded, errors, total: scores.length } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('auto-certify-performance error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CERTIFICATION_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
