import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * register-provider
 * 
 * Creates a solution_providers row for a newly registered user.
 * Called after Supabase Auth sign-up to initialize provider_level=1.
 * 
 * Body: { first_name, last_name, enrollment_source? }
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user token for auth context
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid auth token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const firstName = (body.first_name || '').trim()
    const lastName = (body.last_name || '').trim()

    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'first_name and last_name are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to create the provider record
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Check if provider already exists
    const { data: existing } = await adminClient
      .from('solution_providers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, data: { provider_id: existing.id, already_existed: true } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new provider
    const { data: provider, error: insertError } = await adminClient
      .from('solution_providers')
      .insert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        provider_level: 1,
        profile_strength: 0,
        lifecycle_status: 'active',
        onboarding_status: 'pending',
        verification_status: 'pending',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('register-provider insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INSERT_ERROR', message: insertError.message } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: { provider_id: provider.id, already_existed: false } }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('register-provider error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
