/**
 * suggest-legal-documents — Pass 3 (Legal AI Review) edge function.
 *
 * Unified workflow: this function ONLY runs in Pass 3 mode (pass3_mode=true).
 * Legacy "ai_suggested" multi-document branch has been removed; the only
 * supported flow is generating ONE unified Solution Provider Agreement (SPA)
 * grounded in the full unified context + uploaded SOURCE_DOC rows.
 *
 * Optional `organize_only=true` runs the AI in organize-and-merge mode: it
 * deduplicates and harmonises clauses from uploaded source documents into the
 * matching SPA section_keys without generating new substantive content.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handlePass3 } from "./pass3Handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { challenge_id, pass3_mode, organize_only } = body ?? {};
    const organizeOnly = organize_only === true;

    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy multi-document mode is removed. Only Pass 3 unified flow is supported.
    if (pass3_mode !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DEPRECATED",
            message: "Legacy multi-document mode is no longer supported. Pass `pass3_mode: true` to generate the unified Solution Provider Agreement.",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    return await handlePass3({
      supabaseAdmin: adminClient,
      userId: user.id,
      challengeId: challenge_id,
      lovableApiKey: LOVABLE_API_KEY,
      organizeOnly,
    });
  } catch (error) {
    console.error("suggest-legal-documents error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
