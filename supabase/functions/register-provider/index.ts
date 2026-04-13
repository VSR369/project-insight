import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * register-provider
 * 
 * Public endpoint (no auth required per Spec).
 * Creates a new auth user + solution_providers row + returns session.
 * 
 * Body: { email, password, first_name, last_name, enrollment_source? }
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const email = (body.email || '').trim()
    const password = (body.password || '').trim()
    const firstName = (body.first_name || '').trim()
    const lastName = (body.last_name || '').trim()

    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email, password, first_name, and last_name are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (authError) {
      const code = authError.message.includes('already') ? 'EMAIL_EXISTS' : 'AUTH_ERROR'
      return new Response(
        JSON.stringify({ success: false, error: { code, message: authError.message } }),
        { status: code === 'EMAIL_EXISTS' ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Create provider profile
    const { data: provider, error: insertError } = await adminClient
      .from('solution_providers')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        provider_level: 1,
        profile_strength: 0,
        lifecycle_status: 'registered',
        onboarding_status: 'pending',
        verification_status: 'pending',
        created_by: userId,
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

    // Sign in the user to return a session
    const anonClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          provider_id: provider.id,
          user_id: userId,
          session: signInError ? null : sessionData.session,
        },
      }),
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
