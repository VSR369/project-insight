import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AwardXpRequest {
  provider_id: string;
  xp_amount: number;
  action_type: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check if user is platform_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "platform_admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Platform admin required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AwardXpRequest = await req.json();

    if (!body.provider_id || typeof body.xp_amount !== "number" || !body.action_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: provider_id, xp_amount, action_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for the actual XP award
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call the database function to award XP
    const { data, error } = await supabaseService.rpc("pulse_award_xp", {
      p_provider_id: body.provider_id,
      p_xp_amount: body.xp_amount,
      p_action_type: body.action_type,
      p_reference_id: body.reference_id || null,
      p_reference_type: body.reference_type || null,
      p_notes: body.notes || `Manual award by admin ${userId}`,
    });

    if (error) {
      throw new Error(`Failed to award XP: ${error.message}`);
    }

    console.log(`Admin ${userId} awarded ${body.xp_amount} XP to provider ${body.provider_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Awarded ${body.xp_amount} XP`,
        provider_id: body.provider_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error awarding XP:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
