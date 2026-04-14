/**
import { sendEmail } from "../_shared/sendEmail.ts";
 * send-registration-otp Edge Function
 * 
 * Generates a 6-digit OTP, hashes it, stores in email_otp_verifications,
 * and sends the code via Resend. Enforces rate limits per BR-REG-006.
 * 
 * Rate limits:
 * - Max 5 OTPs per hour per email
 * - 24h lockout after 5 cumulative failed attempts
 * - Each OTP valid for 10 minutes, max 3 wrong attempts per OTP
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  email: string;
  organization_id: string;
  tenant_id: string;
}

/** Generate a cryptographically secure 6-digit OTP */
function generateOtp(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const num = new DataView(array.buffer).getUint32(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

/** SHA-256 hash of the OTP */
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, organization_id, tenant_id }: SendOtpRequest = await req.json();

    if (!email || !organization_id || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Rate limit: check lockout ──
    const { data: recentLocked } = await supabase
      .from('email_otp_verifications')
      .select('locked_until')
      .eq('email', email.toLowerCase())
      .not('locked_until', 'is', null)
      .gte('locked_until', new Date().toISOString())
      .limit(1);

    if (recentLocked && recentLocked.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "LOCKED_OUT", message: "Too many failed attempts. Try again later." } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Rate limit: max 5 OTPs per hour ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('email_otp_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.toLowerCase())
      .gte('created_at', oneHourAgo);

    if ((recentCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "Maximum OTP requests per hour exceeded. Please wait." } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Generate and store OTP ──
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const { error: insertError } = await supabase
      .from('email_otp_verifications')
      .insert({
        email: email.toLowerCase(),
        otp_hash: otpHash,
        expires_at: expiresAt,
        max_attempts: 3,
        organization_id,
        tenant_id,
      });

    if (insertError) {
      console.error("OTP insert error:", insertError.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to generate OTP" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Send email via Resend ──
    const { error: emailError } = await resend.emails.send({
      from: "Registration <noreply@btbt.co.in>",
      to: [email],
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a1a2e; margin-bottom: 24px;">Email Verification</h2>
          <p style="color: #555; margin-bottom: 16px;">
            Use this code to verify your email address. It expires in 10 minutes.
          </p>
          <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 13px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: { code: "EMAIL_FAILED", message: "Failed to send verification email" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: { message: "OTP sent successfully" } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-registration-otp error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
