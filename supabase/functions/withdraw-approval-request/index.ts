import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawRequest {
  providerId: string;
  withdrawalReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing withdrawal request');

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { providerId, withdrawalReason }: WithdrawRequest = await req.json();

    // Validate required fields
    if (!providerId) {
      console.error('Missing providerId');
      return new Response(
        JSON.stringify({ success: false, error: 'Provider ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Fetching organization for provider:', providerId);

    // Fetch current organization
    const { data: org, error: orgError } = await supabase
      .from('solution_provider_organizations')
      .select('*, solution_providers!inner(first_name, last_name)')
      .eq('provider_id', providerId)
      .single();

    if (orgError || !org) {
      console.error('Organization not found:', orgError);
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate current status is pending
    if (org.approval_status !== 'pending') {
      console.error('Organization is not in pending status:', org.approval_status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot withdraw: Organization is currently "${org.approval_status}"` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const previousManagerEmail = org.manager_email;
    const previousManagerName = org.manager_name;
    const providerName = `${org.solution_providers.first_name} ${org.solution_providers.last_name}`;

    console.log('Updating organization status to withdrawn');

    // Update organization record
    const { error: updateError } = await supabase
      .from('solution_provider_organizations')
      .update({
        approval_status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        withdrawal_reason: withdrawalReason || null,
        previous_manager_email: previousManagerEmail,
        // Clear credentials to invalidate old login
        manager_temp_password_hash: null,
        approval_token: null,
        credentials_expire_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', providerId);

    if (updateError) {
      console.error('Failed to update organization:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to withdraw request' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Send notification email to old manager
    if (previousManagerEmail) {
      console.log('Sending withdrawal notification to:', previousManagerEmail);
      
      try {
        await resend.emails.send({
          from: 'CogniBlend <onboarding@resend.dev>',
          to: [previousManagerEmail],
          subject: `Request Withdrawn - ${providerName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Approval Request Withdrawn</h1>
              
              <p>Hello ${previousManagerName || 'Manager'},</p>
              
              <p>The approval request from <strong>${providerName}</strong> to represent 
              <strong>${org.org_name}</strong> on CogniBlend has been withdrawn by the applicant.</p>
              
              ${withdrawalReason ? `<p><strong>Reason provided:</strong> ${withdrawalReason}</p>` : ''}
              
              <p style="color: #666;">Your previously issued login credentials are no longer valid.</p>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p style="margin-top: 30px;">Best regards,<br>The CogniBlend Team</p>
            </div>
          `,
        });
        console.log('Withdrawal notification sent successfully');
      } catch (emailError) {
        // Log but don't fail the operation if email fails
        console.error('Failed to send withdrawal notification email:', emailError);
      }
    }

    console.log('Withdrawal completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Approval request withdrawn successfully' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in withdraw-approval-request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
