/**
 * refine-challenge-section — AI-powered section refinement.
 * Accepts role_context to tailor refinement prompts per role:
 *   'intake' → brief clarity for AM/RQ
 *   'spec'   → solver-readiness for CR/CA
 *   'curation' → publication quality for CU (default)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getSystemPrompt(roleContext: string): string {
  if (roleContext === "intake") {
    return `You are an expert business brief writer helping Account Managers and Challenge Requestors improve their intake submissions.

Your task: Rewrite or improve a specific section of an intake brief based on the reviewer's instructions.

Rules:
- Follow the reviewer's instructions precisely.
- Focus on clarity, specificity, and completeness for downstream Challenge Creators/Architects.
- Use clear, professional business language — avoid jargon unless appropriate to the domain.
- Be specific and actionable — replace vague phrases with concrete descriptions.
- For text fields, return plain text or HTML (matching the input format).
- Keep the length appropriate — provide enough detail without padding.
- Do NOT add markdown formatting unless the input already uses it.`;
  }

  if (roleContext === "spec") {
    return `You are an expert innovation challenge specification writer helping Challenge Creators and Architects refine their specifications.

Your task: Rewrite or improve a specific section of a challenge specification based on the reviewer's instructions.

Rules:
- Follow the reviewer's instructions precisely.
- Ensure the content is solver-ready: a solver should clearly understand expectations from this section alone.
- Maintain consistency with the challenge context (title, maturity level, domain).
- Use clear, professional, unambiguous language appropriate for innovation challenges.
- Be specific and actionable — avoid vague phrases like "as needed" or "if applicable."
- For text fields, return plain text or HTML (matching the input format).
- For structured fields (deliverables, evaluation_criteria), return valid JSON matching the input structure.
- Do NOT add markdown formatting unless the input already uses it.`;
  }

  // Default: curation context
  return `You are an expert innovation challenge specification writer.

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
}

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

    const { challenge_id, section_key, current_content, curator_instructions, context, role_context } = await req.json();

    if (!challenge_id || !section_key || !curator_instructions) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id, section_key, and curator_instructions are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedRoleContext = ["intake", "spec", "curation"].includes(role_context) ? role_context : "curation";

    const contextParts: string[] = [];
    if (context?.title) contextParts.push(`Challenge Title: ${context.title}`);
    if (context?.maturity_level) contextParts.push(`Maturity Level: ${context.maturity_level}`);
    if (context?.domain_tags?.length) contextParts.push(`Domain Tags: ${context.domain_tags.join(", ")}`);

    const instructionLabel = resolvedRoleContext === "intake" ? "REVIEWER'S" : resolvedRoleContext === "spec" ? "CREATOR'S" : "CURATOR'S";

    const userPrompt = `SECTION: ${section_key}

CURRENT CONTENT:
${typeof current_content === "string" ? current_content : JSON.stringify(current_content, null, 2)}

CHALLENGE CONTEXT:
${contextParts.length > 0 ? contextParts.join("\n") : "No additional context provided."}

${instructionLabel} INSTRUCTIONS (follow these precisely):
${curator_instructions}

Rewrite the section content following the instructions. Return ONLY the refined content, nothing else.`;

    // For structured sections, add explicit format instruction
    const FORMAT_INSTRUCTIONS: Record<string, string> = {
      deliverables: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of strings, one per deliverable item. Example: ["Deliverable 1 description", "Deliverable 2 description"]. Do NOT return prose, markdown tables, or numbered lists — ONLY a raw JSON array.`,
      evaluation_criteria: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of objects with "name", "weight", and "description" keys. Example: [{"name":"Innovation","weight":30,"description":"..."},{"name":"Feasibility","weight":25,"description":"..."}]. Do NOT return prose, markdown tables, or numbered lists — ONLY a raw JSON array.`,
      submission_guidelines: `\n\nCRITICAL FORMAT REQUIREMENT: Return formatted markdown text with headings and bullet lists. Do NOT return JSON.`,
      phase_schedule: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of phase objects with keys: "phase_name", "start_date", "end_date", "milestone" (boolean), "dependencies" (string or null). Example: [{"phase_name":"Registration","start_date":"Day 1","end_date":"Day 14","milestone":false,"dependencies":null}].`,
      reward_structure: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON object with reward structure fields. Include "total_prize", "tiers" (array of {tier, amount, currency}), and "payment_trigger" where applicable.`,
      domain_tags: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of tag strings. Example: ["AI", "Healthcare", "Data Science"]. No prose.`,
    };

    let finalUserPrompt = userPrompt;
    const fmtInstruction = FORMAT_INSTRUCTIONS[section_key];
    if (fmtInstruction) {
      finalUserPrompt += fmtInstruction;
    }

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: getSystemPrompt(resolvedRoleContext) },
          { role: "user", content: finalUserPrompt },
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
