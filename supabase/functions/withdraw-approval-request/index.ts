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
  clearParticipationMode?: boolean;
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

    const { providerId, withdrawalReason, clearParticipationMode }: WithdrawRequest = await req.json();

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

    // If requested, also clear participation mode in the same transaction
    if (clearParticipationMode) {
      console.log('Clearing participation mode for provider:', providerId);
      const { error: modeError } = await supabase
        .from('solution_providers')
        .update({
          participation_mode_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (modeError) {
        console.error('Failed to clear participation mode:', modeError);
        // Don't fail the request, just log the error - the client also clears mode
      }
    }

    // Send notification email to manager about the withdrawal
    if (previousManagerEmail) {
      console.log('[withdraw-approval-request] Sending withdrawal notification:', {
        to: previousManagerEmail,
        managerName: previousManagerName,
        providerName,
        orgName: org.org_name,
        timestamp: new Date().toISOString()
      });
      
      try {
        const emailResponse = await resend.emails.send({
          from: 'CogniBlend <onboarding@resend.dev>',
          to: [previousManagerEmail],
          subject: `Action No Longer Required: ${providerName}'s Request Withdrawn`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; line-height: 50px; color: white; font-weight: bold; font-size: 20px;">
                  CB
                </div>
              </div>
              
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 20px;">
                  ℹ️ Approval Request Withdrawn
                </h2>
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  No action is required from you — we regret any inconvenience caused
                </p>
              </div>

              <p style="color: #374151;">Hello ${previousManagerName || 'Manager'},</p>
              
              <p style="color: #374151;">
                We're writing to inform you that <strong>${providerName}</strong> has withdrawn their 
                request to participate as a representative of <strong>${org.org_name}</strong> on the 
                CogniBlend platform.
              </p>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #fcd34d;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ Important:</strong> Your previously issued login credentials for the 
                  CogniBlend Manager Portal are now invalid and can no longer be used.
                </p>
              </div>
              
              ${withdrawalReason ? `
              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Reason Provided
                </p>
                <p style="margin: 0; color: #334155; font-style: italic;">
                  "${withdrawalReason}"
                </p>
              </div>
              ` : ''}
              
              <p style="color: #374151;">
                If ${providerName} wishes to participate in the future, they will need to submit 
                a new request, and you will receive new login credentials at that time.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                If you have any questions, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated message from CogniBlend.<br>
                Please do not reply to this email.
              </p>
            </body>
            </html>
          `,
        });
        
        console.log('[withdraw-approval-request] Email sent successfully:', {
          emailId: emailResponse.data?.id || null,
          to: previousManagerEmail,
          success: !emailResponse.error,
          error: emailResponse.error || null
        });
      } catch (emailError: any) {
        // Log but don't fail the operation if email fails
        console.error('[withdraw-approval-request] Failed to send notification email:', {
          error: emailError.message,
          to: previousManagerEmail
        });
      }
    } else {
      console.log('[withdraw-approval-request] No manager email found, skipping notification');
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
