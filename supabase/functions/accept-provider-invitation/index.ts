/**
 * Accept Provider Invitation Edge Function
 * 
 * Validates invitation tokens and returns invitation details for signup form pre-fill.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface InvitationResponse {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    invitation_type: string;
    industry_segment_id: string | null;
    industry_name?: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      const response: InvitationResponse = { 
        success: false, 
        error: 'Invitation token is required' 
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to access invitation data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find valid invitation with industry segment name
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('solution_provider_invitations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        invitation_type,
        industry_segment_id,
        expires_at,
        accepted_at,
        declined_at,
        industry_segments:industry_segment_id (name)
      `)
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      console.error('Invitation lookup error:', inviteError);
      const response: InvitationResponse = { 
        success: false, 
        error: 'Invitation not found' 
      };
      return new Response(
        JSON.stringify(response),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      const response: InvitationResponse = { 
        success: false, 
        error: 'This invitation has already been accepted' 
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if declined
    if (invitation.declined_at) {
      const response: InvitationResponse = { 
        success: false, 
        error: 'This invitation has been declined' 
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      const response: InvitationResponse = { 
        success: false, 
        error: 'This invitation has expired' 
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return invitation details for signup form pre-fill
    const industryName = (invitation.industry_segments as any)?.name ?? null;
    
    const response: InvitationResponse = {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        invitation_type: invitation.invitation_type,
        industry_segment_id: invitation.industry_segment_id,
        industry_name: industryName,
      },
    };

    console.log(`Invitation validated successfully: ${invitation.id} (type: ${invitation.invitation_type})`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing invitation:', error);
    const response: InvitationResponse = { 
      success: false, 
      error: 'Internal server error' 
    };
    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
