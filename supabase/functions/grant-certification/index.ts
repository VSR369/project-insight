/**
 * grant-certification — Admin-grants Path 1 (Experience Track) certification.
 * Creates or updates a provider_certifications row for the experience path.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GrantPayload {
  provider_id: string
  cert_path: string // 'experience' | 'performance' | 'vip'
  star_tier: number // 1 | 2 | 3
  notes?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: GrantPayload = await req.json()
    if (!payload.provider_id || !payload.cert_path || !payload.star_tier) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider_id, cert_path, star_tier required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (![1, 2, 3].includes(payload.star_tier)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'star_tier must be 1, 2, or 3' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert certification record
    const { data: cert, error: upsertErr } = await supabase
      .from('provider_certifications')
      .upsert(
        {
          provider_id: payload.provider_id,
          cert_path: payload.cert_path,
          star_tier: payload.star_tier,
          status: 'active',
          granted_at: new Date().toISOString(),
          granted_by: user.id,
          notes: payload.notes || null,
        },
        { onConflict: 'provider_id,cert_path' }
      )
      .select('id, provider_id, cert_path, star_tier, status')
      .single()

    if (upsertErr) {
      console.error('grant-certification upsert error:', upsertErr.message)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UPSERT_ERROR', message: upsertErr.message } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: cert }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('grant-certification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
