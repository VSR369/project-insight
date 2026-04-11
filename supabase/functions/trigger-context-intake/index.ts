/**
 * trigger-context-intake — Fire-and-forget intake pipeline.
 * Called after challenge submission to extract creator files + reference URLs.
 * Updates context_intake_status on the challenge.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { challenge_id } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Mark as processing
    await adminClient
      .from("challenges")
      .update({ context_intake_status: "processing" })
      .eq("id", challenge_id);

    // Fetch challenge for reference URLs from extended_brief
    const { data: challenge, error: fetchErr } = await adminClient
      .from("challenges")
      .select("extended_brief, title, organization_id")
      .eq("id", challenge_id)
      .single();

    if (fetchErr || !challenge) {
      await adminClient
        .from("challenges")
        .update({ context_intake_status: "failed" })
        .eq("id", challenge_id);
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sourcesCreated = 0;

    // Extract reference URLs from extended_brief
    const eb = typeof challenge.extended_brief === "string"
      ? JSON.parse(challenge.extended_brief)
      : challenge.extended_brief;

    if (eb && typeof eb === "object") {
      const urlFields = ["reference_urls", "reference_links", "resources"];
      for (const field of urlFields) {
        const urls = eb[field];
        if (Array.isArray(urls)) {
          for (const entry of urls) {
            const url = typeof entry === "string" ? entry : entry?.url;
            if (url && typeof url === "string" && url.startsWith("http")) {
              const { error: insertErr } = await adminClient
                .from("challenge_attachments")
                .insert({
                  challenge_id,
                  section_key: "context_and_background",
                  source_type: "url",
                  source_url: url,
                  display_name: typeof entry === "object" ? entry.title ?? null : null,
                  discovery_source: "creator_intake",
                  discovery_status: "accepted",
                  extraction_status: "pending",
                });
              if (!insertErr) sourcesCreated++;
            }
          }
        }
      }
    }

    // Fetch existing creator-uploaded file attachments and trigger extraction
    const { data: pendingAttachments } = await adminClient
      .from("challenge_attachments")
      .select("id")
      .eq("challenge_id", challenge_id)
      .eq("discovery_source", "manual")
      .eq("extraction_status", "pending");

    if (pendingAttachments && pendingAttachments.length > 0) {
      for (const att of pendingAttachments) {
        // Fire-and-forget extraction
        adminClient.functions.invoke("extract-attachment-text", {
          body: { attachment_id: att.id },
        }).catch(() => { /* silent */ });
      }
    }

    // Mark as completed
    await adminClient
      .from("challenges")
      .update({ context_intake_status: "completed" })
      .eq("id", challenge_id);

    return new Response(
      JSON.stringify({ success: true, data: { sources_created: sourcesCreated, extractions_triggered: pendingAttachments?.length ?? 0 } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("trigger-context-intake error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
