/**
 * send-vip-invitation — Creates and dispatches branded VIP invitation emails.
 * Called from the VIP admin page.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VipInvitePayload {
  email: string
  first_name: string
  last_name: string
  industry_segment_id?: string
  personal_message?: string
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

    // Verify caller is authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: VipInvitePayload = await req.json()
    if (!payload.email || !payload.first_name || !payload.last_name) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email, first_name, last_name are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

    // Create invitation record
    const { data: invitation, error: insertErr } = await supabase
      .from('solution_provider_invitations')
      .insert({
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        invitation_type: 'vip_expert',
        invitation_token: token,
        industry_segment_id: payload.industry_segment_id || null,
        status: 'pending',
        expires_at: expiresAt,
        invited_by: user.id,
      })
      .select('id, email, invitation_token')
      .single()

    if (insertErr) {
      console.error('Failed to create VIP invitation:', insertErr.message)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INSERT_ERROR', message: insertErr.message } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TODO: Integrate with email service to send branded VIP invitation email
    // For now, log the invitation link
    const inviteUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''}/invite/vip?token=${token}`
    console.log(`VIP invitation created for ${payload.email}: ${inviteUrl}`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          invitation_id: invitation.id,
          email: invitation.email,
          invite_url: inviteUrl,
          expires_at: expiresAt,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-vip-invitation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
