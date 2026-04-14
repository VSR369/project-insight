import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyLoginRequest {
  email: string;
  password: string;
}

// PBKDF2 password verification using Web Crypto API
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Decode the stored hash (salt + hash combined)
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHashBytes = combined.slice(16);
    
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
    
    // Compare the hashes
    const hashBytes = new Uint8Array(hash);
    if (hashBytes.length !== storedHashBytes.length) return false;
    
    return hashBytes.every((byte, i) => byte === storedHashBytes[i]);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
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

    const body: VerifyLoginRequest = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find organization by manager email
    const { data: org, error: fetchError } = await supabase
      .from('solution_provider_organizations')
      .select(`
        id,
        org_name,
        manager_name,
        manager_email,
        manager_temp_password_hash,
        credentials_expire_at,
        approval_status,
        approval_token,
        designation,
        provider_id,
        created_at
      `)
      .eq('manager_email', email.toLowerCase().trim())
      .eq('approval_status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching organization:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!org) {
      return new Response(
        JSON.stringify({ success: false, error: "No pending approval request found for this email" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if credentials have expired
    if (org.credentials_expire_at) {
      const expiresAt = new Date(org.credentials_expire_at);
      if (expiresAt < new Date()) {
        // Update status to expired
        await supabase
          .from('solution_provider_organizations')
          .update({ approval_status: 'expired' })
          .eq('id', org.id);

        return new Response(
          JSON.stringify({ success: false, error: "Credentials have expired. Please ask the provider to resend the request." }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Verify password hash
    if (!org.manager_temp_password_hash) {
      return new Response(
        JSON.stringify({ success: false, error: "No credentials found. Please ask the provider to resend the request." }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isPasswordValid = await verifyPassword(password, org.manager_temp_password_hash);

    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid password" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from('solution_providers')
      .select('first_name, last_name, user_id')
      .eq('id', org.provider_id)
      .single();

    if (providerError || !provider) {
      console.error("Error fetching provider:", providerError);
      return new Response(
        JSON.stringify({ success: false, error: "Provider not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch provider email from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', provider.user_id)
      .single();

    // Login successful - return org and provider details
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orgId: org.id,
          orgName: org.org_name,
          providerName: `${provider.first_name} ${provider.last_name}`,
          providerEmail: profile?.email || 'N/A',
          providerDesignation: org.designation,
          managerName: org.manager_name,
          requestDate: org.created_at,
          approvalToken: org.approval_token,
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-manager-login:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
