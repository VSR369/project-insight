import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessDecisionRequest {
  orgId: string;
  approvalToken: string;
  decision: 'approve' | 'decline';
  declineReason?: string;
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

    const body: ProcessDecisionRequest = await req.json();
    const { orgId, approvalToken, decision, declineReason } = body;

    // Validate required fields
    if (!orgId || !approvalToken || !decision) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (decision !== 'approve' && decision !== 'decline') {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid decision. Must be 'approve' or 'decline'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify organization exists with matching token and pending status
    const { data: org, error: fetchError } = await supabase
      .from('solution_provider_organizations')
      .select('id, approval_status, approval_token, provider_id, org_name')
      .eq('id', orgId)
      .single();

    if (fetchError || !org) {
      console.error("Error fetching organization:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate approval token
    if (org.approval_token !== approvalToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid approval token" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already processed
    if (org.approval_status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `This request has already been ${org.approval_status}` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare update data based on decision
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      manager_temp_password_hash: null, // Clear password hash (one-time use)
    };

    if (decision === 'approve') {
      updateData.approval_status = 'approved';
      updateData.approved_at = now;
      updateData.is_verified = true;
    } else {
      updateData.approval_status = 'declined';
      updateData.declined_at = now;
      updateData.decline_reason = declineReason || null;
    }

    // Update organization
    const { error: updateError } = await supabase
      .from('solution_provider_organizations')
      .update(updateData)
      .eq('id', orgId);

    if (updateError) {
      console.error("Error updating organization:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to process decision" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log the decision
    console.log(`Manager decision for org ${orgId}: ${decision}${declineReason ? ` (reason: ${declineReason})` : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: decision === 'approve' 
          ? "Request approved successfully" 
          : "Request declined",
        decision,
        orgName: org.org_name
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in process-manager-decision:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
