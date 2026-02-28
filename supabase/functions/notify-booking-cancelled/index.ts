/**
 * Notify Booking Cancelled Edge Function
 * 
 * Sends email notification to provider when their interview booking
 * is cancelled by a reviewer.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancellationNotificationRequest {
  provider_email: string;
  provider_name: string;
  scheduled_at: string;
  industry_name: string | null;
  expertise_name: string | null;
  booking_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CancellationNotificationRequest = await req.json();
    console.log('Processing cancellation notification:', {
      provider_email: body.provider_email,
      provider_name: body.provider_name,
      booking_id: body.booking_id,
    });

    // Validate required fields
    if (!body.provider_email || !body.provider_name || !body.scheduled_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the scheduled date/time
    const scheduledDate = new Date(body.scheduled_at);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Build context string
    const contextParts = [];
    if (body.industry_name) contextParts.push(body.industry_name);
    if (body.expertise_name) contextParts.push(body.expertise_name);
    const contextString = contextParts.length > 0 ? contextParts.join(' - ') : 'Interview';

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'CogniBlend <onboarding@resend.dev>',
      to: [body.provider_email],
      subject: 'Interview Booking Cancelled - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Interview Booking Cancelled</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #1a1a2e; margin: 0 0 10px 0; font-size: 24px;">Interview Booking Cancelled</h1>
            <p style="color: #666; margin: 0; font-size: 14px;">Action Required</p>
          </div>
          
          <p>Hello ${body.provider_name},</p>
          
          <p>We regret to inform you that your scheduled interview has been cancelled due to reviewer availability changes.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #856404;">Cancelled Interview Details:</p>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li><strong>Date:</strong> ${formattedDate}</li>
              <li><strong>Time:</strong> ${formattedTime}</li>
              <li><strong>Context:</strong> ${contextString}</li>
            </ul>
          </div>
          
          <h2 style="font-size: 18px; color: #1a1a2e; margin-top: 30px;">What to do next:</h2>
          <ol style="padding-left: 20px;">
            <li>Log in to your CogniBlend account</li>
            <li>Navigate to <strong>Interview Scheduling</strong></li>
            <li>Select a new available time slot that works for you</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://cogniblend.lovable.app'}/enroll/interview" 
               style="display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Schedule New Interview
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">We apologize for any inconvenience this may have caused. Our team is committed to ensuring you have a smooth interview experience.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Best regards,<br>
            <strong>The CogniBlend Team</strong>
          </p>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cancellation notification sent',
        email_id: emailData?.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-booking-cancelled:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
