/**
 * assignment-engine — MOD-02 Edge Function
 * GAP-8/19: Passes org context to notify-admin-assignment for rich notifications.
 * BR-MPA-013: Affinity routing check before standard engine.
 * BR-MPA-010: 4.5s timeout guard.
 * MAX_RETRIES=2 on concurrent conflict (55P03).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 2;
const TIMEOUT_MS = 4500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      verification_id,
      industry_segments,
      hq_country,
      org_type,
      org_name,
      industry_names,
      country_name,
      org_type_name,
    } = await req.json();

    if (!verification_id || !industry_segments || !hq_country) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields: verification_id, industry_segments, hq_country" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result = null;
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const { data, error } = await supabaseClient.rpc("execute_auto_assignment", {
          p_verification_id: verification_id,
          p_industry_segments: industry_segments,
          p_hq_country: hq_country,
          p_org_type: org_type ?? null,
        });

        clearTimeout(timeoutId);

        if (error) throw new Error(error.message);
        result = data;

        if (result?.method === "CONCURRENT_CONFLICT" && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }

        break;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
      }
    }

    if (!result && lastError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "ENGINE_ERROR", message: lastError.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If assignment succeeded, trigger notification with rich context (GAP-8)
    if (result?.success && result?.assigned_to) {
      try {
        // Calculate SLA deadline from config
        const { data: slaConfig } = await supabaseClient
          .from("md_mpa_config")
          .select("param_value")
          .eq("param_key", "sla_duration")
          .single();
        const slaHours = slaConfig?.param_value ? parseInt(slaConfig.param_value) : 48;
        const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

        await supabaseClient.functions.invoke("notify-admin-assignment", {
          body: {
            admin_id: result.assigned_to,
            verification_id,
            assignment_method: result.method,
            org_name: org_name ?? null,
            industry_segments: industry_names ?? null,
            hq_country: country_name ?? null,
            org_type: org_type_name ?? null,
            domain_score: result.score ?? null,
            sla_deadline: slaDeadline,
          },
        });
      } catch (notifyErr) {
        console.error("Notification delivery failed (non-blocking):", notifyErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
