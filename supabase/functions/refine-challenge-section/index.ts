/**
 * refine-challenge-section — AI-powered section refinement for Curation.
 * Accepts curator instructions (edited review comments) and rewrites a
 * specific section of the challenge specification accordingly.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are an expert innovation challenge specification writer.

Your task: Rewrite or improve a specific section of a challenge specification based on the curator's instructions.

Rules:
- Follow the curator's instructions precisely — they describe what to improve, add, remove, or restructure.
- Maintain consistency with the challenge context (title, maturity level, industry, domain tags, and other sections).
- Use clear, professional, unambiguous language appropriate for innovation challenges.
- Be specific and actionable — avoid vague phrases like "as needed" or "if applicable."
- Preserve the original intent and facts while improving quality per the instructions.
- For text fields, return plain text or HTML (matching the input format).
- For structured fields (deliverables, evaluation_criteria, reward_structure, phase_schedule), return valid JSON matching the input structure.
- Do NOT add markdown formatting unless the input already uses it.
- Keep the length appropriate — don't pad unnecessarily but don't over-compress either.

When providing feedback on reward structures, evaluation criteria, scoring, or any structured data, return a JSON object using these schemas:

For monetary/prize data:
{"type":"monetary","description":"...","milestones":[{"name":"...","percentage":0}],"reward_distribution":{"platinum":"$X","gold":"$Y","silver":"$Z"},"tiered_perks":{"platinum":["..."],"gold":["..."],"silver":["..."]}}

For evaluation/scoring:
{"type":"evaluation","overall_score":82,"max_score":100,"grade":"A","feedback":"...","criteria":[{"name":"...","score":18,"max":20,"comment":"..."}],"recommendation":"..."}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const { challenge_id, section_key, current_content, curator_instructions, context } = await req.json();

    if (!challenge_id || !section_key || !curator_instructions) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id, section_key, and curator_instructions are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextParts: string[] = [];
    if (context?.title) contextParts.push(`Challenge Title: ${context.title}`);
    if (context?.maturity_level) contextParts.push(`Maturity Level: ${context.maturity_level}`);
    if (context?.domain_tags?.length) contextParts.push(`Domain Tags: ${context.domain_tags.join(", ")}`);

    const userPrompt = `SECTION: ${section_key}

CURRENT CONTENT:
${typeof current_content === "string" ? current_content : JSON.stringify(current_content, null, 2)}

CHALLENGE CONTEXT:
${contextParts.length > 0 ? contextParts.join("\n") : "No additional context provided."}

CURATOR'S INSTRUCTIONS (follow these precisely):
${curator_instructions}

Rewrite the section content following the curator's instructions. Return ONLY the refined content, nothing else.`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded. Please wait and try again." } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ success: true, data: { section_key, refined_content: content } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refine-challenge-section error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
