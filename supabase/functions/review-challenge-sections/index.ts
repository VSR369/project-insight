/**
 * review-challenge-sections — Per-section AI review for Curation.
 * Returns granular pass/warning/needs_revision per section with comments.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are an expert innovation challenge quality reviewer.
Review each section of a challenge specification individually. For each section provide:
- status: "pass" (acceptable), "warning" (could be improved), or "needs_revision" (requires changes before publishing)
- comments: 1-3 specific, actionable comments

Sections to review:
1. problem_statement - Is the problem clearly stated? Actionable?
2. scope - Is the scope well-defined and bounded?
3. deliverables - Are deliverables measurable and concrete?
4. evaluation_criteria - Are criteria clear with proper weights summing to 100%?
5. reward_structure - Is the reward fair and well-structured?
6. phase_schedule - Are timelines realistic?
7. submission_guidelines - Are submission requirements clear?
8. eligibility - Are eligibility requirements specified?
9. complexity - Is complexity properly assessed?
10. ip_model - Is the IP model defined?
11. legal_docs - Are required legal documents attached and reviewed?
12. escrow_funding - Is escrow funded (if required)?
13. maturity_level - Is maturity level set?
14. visibility_eligibility - Are visibility/eligibility configured?

Be concise and actionable in comments.`;

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

    const [challengeResult, legalResult, escrowResult] = await Promise.all([
      adminClient
        .from("challenges")
        .select("title, problem_statement, scope, description, deliverables, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, visibility, phase_schedule, complexity_score, complexity_level, complexity_parameters")
        .eq("id", challenge_id)
        .single(),
      adminClient
        .from("challenge_legal_docs")
        .select("document_type, tier, status, lc_status, document_name")
        .eq("challenge_id", challenge_id),
      adminClient
        .from("escrow_records")
        .select("escrow_status, deposit_amount, currency")
        .eq("challenge_id", challenge_id)
        .maybeSingle(),
    ]);

    if (challengeResult.error || !challengeResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Review each section of this challenge:

CHALLENGE: ${JSON.stringify(challengeResult.data, null, 2)}

LEGAL DOCS: ${JSON.stringify(legalResult.data ?? [], null, 2)}

ESCROW: ${JSON.stringify(escrowResult.data ?? null, null, 2)}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "review_sections",
              description: "Return per-section review results.",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section_key: { type: "string" },
                        status: { type: "string", enum: ["pass", "warning", "needs_revision"] },
                        comments: { type: "array", items: { type: "string" } },
                      },
                      required: ["section_key", "status", "comments"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "review_sections" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded." } }),
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
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("review-challenge-sections error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
