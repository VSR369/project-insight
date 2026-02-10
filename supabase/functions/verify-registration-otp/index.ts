/**
 * verify-registration-otp Edge Function
 * 
 * Verifies the 6-digit OTP against the stored hash.
 * Enforces per-OTP attempt limits and cumulative lockout per BR-REG-006.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  email: string;
  otp: string;
  organization_id: string;
}

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

    const { email, otp, organization_id }: VerifyOtpRequest = await req.json();

    if (!email || !otp || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedEmail = email.toLowerCase();

    // ── Check lockout ──
    const { data: lockedRows } = await supabase
      .from('email_otp_verifications')
      .select('locked_until')
      .eq('email', normalizedEmail)
      .not('locked_until', 'is', null)
      .gte('locked_until', new Date().toISOString())
      .limit(1);

    if (lockedRows && lockedRows.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "LOCKED_OUT", message: "Account is locked. Try again later." } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Find the latest unexpired, unused OTP for this email ──
    const { data: otpRecord, error: fetchError } = await supabase
      .from('email_otp_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("OTP fetch error:", fetchError.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Verification failed" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "OTP_EXPIRED", message: "No valid OTP found. Please request a new one." } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Check per-OTP attempt limit ──
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "MAX_ATTEMPTS", message: "Maximum attempts exceeded for this code. Request a new one." } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Verify hash ──
    const inputHash = await hashOtp(otp);

    if (inputHash !== otpRecord.otp_hash) {
      // Increment attempts
      const newAttempts = otpRecord.attempts + 1;
      const newTotalFailed = otpRecord.total_failed_attempts + 1;
      const lockoutThreshold = 5;
      const lockedUntil = newTotalFailed >= lockoutThreshold
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabase
        .from('email_otp_verifications')
        .update({
          attempts: newAttempts,
          total_failed_attempts: newTotalFailed,
          locked_until: lockedUntil,
        })
        .eq('id', otpRecord.id);

      const remainingAttempts = otpRecord.max_attempts - newAttempts;
      const message = lockedUntil
        ? "Too many failed attempts. Account locked for 24 hours."
        : `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`;

      return new Response(
        JSON.stringify({ success: false, error: { code: "INVALID_OTP", message } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── OTP is valid — mark as used ──
    await supabase
      .from('email_otp_verifications')
      .update({
        is_used: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.id);

    return new Response(
      JSON.stringify({ success: true, data: { verified: true } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("verify-registration-otp error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
