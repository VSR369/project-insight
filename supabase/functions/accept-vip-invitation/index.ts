/**
 * accept-vip-invitation — Validates VIP invitation token, creates provider profile,
 * fires auto-certify trigger, returns invitation details for signup.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_TOKEN', message: 'Invitation token is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Look up VIP invitation
    const { data: invitation, error: invErr } = await supabase
      .from('solution_provider_invitations')
      .select('id, email, first_name, last_name, invitation_type, industry_segment_id, status, expires_at')
      .eq('invitation_token', token)
      .eq('invitation_type', 'vip_expert')
      .single()

    if (invErr || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_TOKEN', message: 'VIP invitation not found or invalid' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'ALREADY_USED', message: `Invitation is ${invitation.status}` } }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('solution_provider_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return new Response(
        JSON.stringify({ success: false, error: { code: 'EXPIRED', message: 'Invitation has expired' } }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Return invitation details for VIP welcome screen + signup
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          invitation_id: invitation.id,
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          invitation_type: invitation.invitation_type,
          industry_segment_id: invitation.industry_segment_id,
          is_vip: true,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('accept-vip-invitation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
