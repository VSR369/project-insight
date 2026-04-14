import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendCredentialsRequest {
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerDesignation?: string;
  orgName: string;
  managerEmail: string;
  managerName: string;
}

// Generate secure 12-character password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// PBKDF2 password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  
  // Combine salt + hash and encode as base64
  const combined = new Uint8Array(salt.length + new Uint8Array(hash).length);
  combined.set(salt);
  combined.set(new Uint8Array(hash), salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Health-check / smoke-test mode
    if (body.test === true) {
      return new Response(
        JSON.stringify({ success: true, message: "Function is deployed and healthy" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      providerId, 
      providerName, 
      providerEmail,
      providerDesignation,
      orgName, 
      managerEmail, 
      managerName 
    } = body;

    // Log request received with all details
    console.log("[send-manager-credentials] Request received:", {
      providerId,
      providerName,
      providerEmail,
      orgName,
      managerEmail,
      managerName,
      hasDesignation: !!providerDesignation,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!providerId || !providerName || !orgName || !managerEmail || !managerName) {
      console.error("[send-manager-credentials] Validation failed - missing fields:", {
        hasProviderId: !!providerId,
        hasProviderName: !!providerName,
        hasOrgName: !!orgName,
        hasManagerEmail: !!managerEmail,
        hasManagerName: !!managerName
      });
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log validation success
    console.log("[send-manager-credentials] Validation passed - preparing credentials for:", {
      recipient: managerEmail,
      recipientName: managerName,
      provider: providerName,
      organization: orgName
    });

    // Generate temporary password
    const tempPassword = generateSecurePassword();
    
    // Hash password using PBKDF2 (Web Crypto API)
    const passwordHash = await hashPassword(tempPassword);
    
    // Calculate expiry (15 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    // Update organization record with credentials
    const { error: updateError } = await supabase
      .from('solution_provider_organizations')
      .update({
        manager_temp_password_hash: passwordHash,
        credentials_expire_at: expiresAt.toISOString(),
        approval_status: 'pending',
        approval_token: crypto.randomUUID(),
      })
      .eq('provider_id', providerId);

    if (updateError) {
      console.error("[send-manager-credentials] Database update failed:", {
        providerId,
        error: updateError.message,
        code: updateError.code
      });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store credentials" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format expiry date for email
    const expiryFormatted = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Log database update success
    console.log("[send-manager-credentials] Credentials stored successfully:", {
      providerId,
      credentialsExpireAt: expiresAt.toISOString(),
      expiryFormatted
    });

    // App URL for manager portal
    const appUrl = "https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app";

    // Log pre-send details
    console.log("[send-manager-credentials] Sending email:", {
      from: "CogniBlend <onboarding@resend.dev>",
      to: managerEmail,
      subject: `Action Required: Approve ${providerName}'s Request to Represent ${orgName}`,
      timestamp: new Date().toISOString()
    });

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "CogniBlend <onboarding@resend.dev>",
      to: [managerEmail],
      subject: `Action Required: Approve ${providerName}'s Request to Represent ${orgName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hello ${managerName},</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            <strong>${providerName}</strong>${providerDesignation ? ` (${providerDesignation})` : ''} 
            has requested to join <strong>CogniBlend</strong> as a solution provider representing 
            <strong>${orgName}</strong>.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            As their reporting manager, we need your approval to proceed with their enrollment.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="margin-top: 0; color: #333; font-size: 18px;">Login to Review This Request</h2>
            <p style="margin: 12px 0;"><strong>Portal URL:</strong> 
              <a href="${appUrl}/manager-portal" style="color: #2563eb;">${appUrl}/manager-portal</a>
            </p>
            <p style="margin: 12px 0;"><strong>Email:</strong> ${managerEmail}</p>
            <p style="margin: 12px 0;"><strong>Temporary Password:</strong> 
              <code style="background: #e0e0e0; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${tempPassword}</code>
            </p>
            <p style="color: #d32f2f; margin: 16px 0 0 0; font-weight: 500;">
              ⚠️ These credentials expire on ${expiryFormatted}
            </p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">Once logged in, you can:</p>
          <ul style="color: #555; font-size: 16px; line-height: 1.8;">
            <li><strong>APPROVE</strong> - Confirm that ${providerName} can represent ${orgName}</li>
            <li><strong>DECLINE</strong> - Reject this request (with optional reason)</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          
          <p style="color: #888; font-size: 14px;">
            If you have questions, please contact support@cogniblend.com
          </p>
          
          <p style="color: #555; font-size: 16px; margin-top: 24px;">
            Best regards,<br>
            <strong>The CogniBlend Team</strong>
          </p>
        </div>
      `,
    });

    // Log email API response with full details
    console.log("[send-manager-credentials] Email API response:", {
      success: !emailResponse.error,
      emailId: emailResponse.data?.id || null,
      recipientUsed: managerEmail,
      error: emailResponse.error || null,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Credentials sent to manager",
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-manager-credentials:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
