/**
 * extract-correction-patterns — Analyze curator corrections and harvest learning patterns.
 *
 * Processes curator_corrections rows where curator_action = 'rejected_rewritten'
 * (significant rewrites). Uses AI to extract what the curator changed and why,
 * then upserts results into section_example_library as 'excellent' examples.
 *
 * Designed for pg_cron or manual invocation. Batch size: 10 per run.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 10;

interface CorrectionRow {
  id: string;
  challenge_id: string;
  section_key: string;
  ai_content: string | null;
  curator_content: string | null;
  edit_distance_percent: number;
  curator_action: string;
}

/**
 * Build the AI prompt to extract a learning pattern from a curator rewrite.
 */
function buildExtractionPrompt(row: CorrectionRow): string {
  return `You are analyzing a curator's correction of an AI-generated challenge section.

SECTION: ${row.section_key}
EDIT DISTANCE: ${row.edit_distance_percent}%

AI VERSION:
${row.ai_content ?? "(empty)"}

CURATOR VERSION:
${row.curator_content ?? "(empty)"}

Analyze what the curator changed and why. Return a JSON object with:
{
  "pattern_summary": "One sentence describing the correction pattern",
  "quality_issues_in_ai": ["list of specific quality issues in the AI version"],
  "curator_improvements": ["list of specific improvements the curator made"],
  "learning_rule": "A reusable instruction for the AI to avoid this mistake in future",
  "annotation": "Brief note for the example library"
}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "MISSING_API_KEY", message: "LOVABLE_API_KEY not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch unprocessed significant rewrites (rejected_rewritten with content)
    const { data: rows, error: fetchErr } = await adminClient
      .from("curator_corrections")
      .select("id, challenge_id, section_key, ai_content, curator_content, edit_distance_percent, curator_action")
      .eq("curator_action", "rejected_rewritten")
      .is("pattern_extracted", null)
      .not("ai_content", "is", null)
      .not("curator_content", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      console.error("[extract-correction-patterns] Fetch error:", fetchErr.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "FETCH_ERROR", message: fetchErr.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0, message: "No unprocessed corrections found" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const corrections = rows as CorrectionRow[];
    let processed = 0;
    let harvested = 0;

    for (const correction of corrections) {
      try {
        const prompt = buildExtractionPrompt(correction);

        const resp = await callAIWithFallback(apiKey, {
          messages: [
            { role: "system", content: "You are a learning pattern extractor. Respond only with valid JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: "json_object" },
        });

        if (!resp.ok) {
          console.warn(`[extract-correction-patterns] AI call failed for ${correction.id}: ${resp.status}`);
          continue;
        }

        const aiResult = await resp.json();
        const content = aiResult.choices?.[0]?.message?.content;
        if (!content) continue;

        let pattern: Record<string, unknown>;
        try {
          pattern = JSON.parse(content);
        } catch {
          console.warn(`[extract-correction-patterns] Invalid JSON from AI for ${correction.id}`);
          continue;
        }

        // Mark correction as processed
        await adminClient
          .from("curator_corrections")
          .update({ pattern_extracted: true } as Record<string, unknown>)
          .eq("id", correction.id);

        // Insert curator version as excellent example into section_example_library
        const curatorContent = typeof correction.curator_content === "string"
          ? { text: correction.curator_content }
          : correction.curator_content;

        const { error: insertErr } = await adminClient
          .from("section_example_library" as string)
          .insert({
            section_key: correction.section_key,
            quality_tier: "excellent",
            content: curatorContent,
            source_challenge_id: correction.challenge_id,
            source_type: "curator_correction",
            annotation: (pattern.annotation as string) ?? "Curator-corrected version",
            learning_rule: (pattern.learning_rule as string) ?? null,
            is_active: true,
            domain_tags: [],
          } as Record<string, unknown>);

        if (insertErr) {
          console.warn(`[extract-correction-patterns] Example insert failed for ${correction.id}:`, insertErr.message);
        } else {
          harvested++;
        }

        processed++;
      } catch (rowErr) {
        const msg = rowErr instanceof Error ? rowErr.message : "Unknown";
        console.warn(`[extract-correction-patterns] Row ${correction.id} error:`, msg);
      }
    }

    console.log(`[extract-correction-patterns] Processed ${processed}/${corrections.length}, harvested ${harvested} examples`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { processed, harvested, total: corrections.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract-correction-patterns] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
