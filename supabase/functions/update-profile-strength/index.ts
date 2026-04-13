import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * update-profile-strength
 * 
 * Recomputes a provider's profile_strength percentage based on field presence.
 * Called after profile saves to keep the cached column in sync.
 * 
 * Expects: { provider_id: string } in request body
 * Auth: Requires valid JWT — provider can only update their own profile.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Profile strength milestones */
const MILESTONES = { REGISTRATION: 20, BASIC: 60, EXPERTISE: 70, PROOF: 85, FULL: 100 }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const providerId = body?.provider_id
    if (!providerId || typeof providerId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'provider_id required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Fetch provider profile
    const { data: provider, error: pErr } = await supabase
      .from('solution_providers')
      .select('id, user_id, first_name, last_name, bio_tagline, phone, linkedin_url, portfolio_url, avatar_url, availability, expertise_level_id')
      .eq('id', providerId)
      .maybeSingle()

    if (pErr) throw new Error(`Provider fetch failed: ${pErr.message}`)
    if (!provider) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify ownership
    if (provider.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot update another provider' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch related data in parallel
    const [enrollments, specialities, solutionTypes, proofPoints, assessments] = await Promise.all([
      supabase.from('provider_industry_enrollments').select('id', { count: 'exact', head: true }).eq('provider_id', providerId),
      supabase.from('provider_specialities').select('id', { count: 'exact', head: true }).eq('provider_id', providerId),
      supabase.from('provider_solution_types').select('id', { count: 'exact', head: true }).eq('provider_id', providerId),
      supabase.from('proof_points').select('id', { count: 'exact', head: true }).eq('provider_id', providerId),
      supabase.from('assessment_attempts').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).eq('is_passed', true),
    ])

    // 3. Compute strength
    const hasName = !!(provider.first_name && provider.last_name)
    const hasBio = !!provider.bio_tagline
    const hasPhone = !!provider.phone
    const hasLinks = !!(provider.linkedin_url || provider.portfolio_url)
    const hasAvatar = !!provider.avatar_url
    const hasAvailability = !!provider.availability
    const hasExpertiseLevel = !!provider.expertise_level_id
    const hasIndustry = (enrollments.count ?? 0) > 0
    const hasSpecialities = (specialities.count ?? 0) > 0
    const hasSolutionTypes = (solutionTypes.count ?? 0) > 0
    const hasProofPoints = (proofPoints.count ?? 0) > 0
    const hasPassedAssessment = (assessments.count ?? 0) > 0

    let strength = MILESTONES.REGISTRATION

    const basicComplete = hasName && hasBio && hasPhone && (hasLinks || hasAvatar) && hasAvailability
    if (basicComplete) {
      strength = MILESTONES.BASIC
      const expertiseComplete = hasExpertiseLevel && hasIndustry && hasSpecialities
      if (expertiseComplete) {
        strength = MILESTONES.EXPERTISE
        if (hasProofPoints) {
          strength = MILESTONES.PROOF
          if (hasPassedAssessment && hasSolutionTypes) {
            strength = MILESTONES.FULL
          }
        }
      }
    }

    // 4. Update provider
    const { error: updateErr } = await supabase
      .from('solution_providers')
      .update({ profile_strength: strength, updated_at: new Date().toISOString() })
      .eq('id', providerId)

    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`)

    return new Response(
      JSON.stringify({ success: true, data: { provider_id: providerId, profile_strength: strength } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('update-profile-strength error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'STRENGTH_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
