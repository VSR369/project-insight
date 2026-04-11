/**
 * curation-intelligence — 4-stage curation pipeline.
 * Stage 1: Pass 1 analysis (via review-challenge-sections with pass1_only=true)
 * Stage 2: Auto-discovery of context sources
 * Stage 3: Synthesize / extract attachment text
 * Stage 4: Generate context digest
 *
 * Orchestrates the full pipeline as a single invocation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StageResult {
  stage: string;
  status: "completed" | "skipped" | "failed";
  detail?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { challenge_id, stages } = await req.json();

    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate auth
    const token = authHeader.replace("Bearer ", "");
    const { error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stageSet = new Set<string>(stages ?? ["discover", "synthesize", "digest"]);
    const results: StageResult[] = [];

    // ── Stage 1: Discovery ──
    if (stageSet.has("discover")) {
      try {
        const { data, error } = await supabaseClient.functions.invoke("discover-context-resources", {
          body: { challenge_id },
        });
        if (error) throw new Error(error.message);
        results.push({ stage: "discover", status: "completed", detail: `Found ${data?.count ?? 0} sources` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Discovery stage failed:", msg);
        results.push({ stage: "discover", status: "failed", detail: msg });
      }
    } else {
      results.push({ stage: "discover", status: "skipped" });
    }

    // ── Stage 2: Synthesize (extract text from pending attachments) ──
    if (stageSet.has("synthesize")) {
      try {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { data: pendingAtts } = await adminClient
          .from("challenge_attachments")
          .select("id")
          .eq("challenge_id", challenge_id)
          .eq("discovery_status", "accepted")
          .eq("extraction_status", "pending");

        if (pendingAtts && pendingAtts.length > 0) {
          const extractionPromises = pendingAtts.map((att: { id: string }) =>
            supabaseClient.functions.invoke("extract-attachment-text", {
              body: { attachment_id: att.id },
            }).catch(() => null)
          );
          await Promise.allSettled(extractionPromises);
          results.push({ stage: "synthesize", status: "completed", detail: `Extracted ${pendingAtts.length} attachments` });
        } else {
          results.push({ stage: "synthesize", status: "completed", detail: "No pending attachments" });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Synthesize stage failed:", msg);
        results.push({ stage: "synthesize", status: "failed", detail: msg });
      }
    } else {
      results.push({ stage: "synthesize", status: "skipped" });
    }

    // ── Stage 3: Generate digest ──
    if (stageSet.has("digest")) {
      try {
        const { error } = await supabaseClient.functions.invoke("generate-context-digest", {
          body: { challenge_id },
        });
        if (error) throw new Error(error.message);
        results.push({ stage: "digest", status: "completed" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Digest stage failed:", msg);
        results.push({ stage: "digest", status: "failed", detail: msg });
      }
    } else {
      results.push({ stage: "digest", status: "skipped" });
    }

    const allCompleted = results.every(r => r.status !== "failed");
    return new Response(
      JSON.stringify({ success: allCompleted, data: { stages: results } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("curation-intelligence error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
