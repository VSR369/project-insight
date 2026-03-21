/**
 * review-challenge-sections — Per-section AI review for Curation.
 * Returns granular pass/warning/needs_revision per section with comments.
 * Supports single-section mode via optional `section_key` parameter.
 * Persists results to challenges.ai_section_reviews.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ALL_SECTIONS = [
  { key: "problem_statement", desc: "Clarity, specificity, context, why it matters, what has been tried" },
  { key: "scope", desc: "Bounded, in-scope vs out-of-scope clarity, no ambiguity" },
  { key: "deliverables", desc: "Measurable, concrete, complete list with acceptance criteria" },
  { key: "evaluation_criteria", desc: "Clear criteria with proper weights summing to 100%, aligned with deliverables" },
  { key: "reward_structure", desc: "Fair, well-structured, matches challenge complexity" },
  { key: "phase_schedule", desc: "Realistic timelines, sufficient for the scope and complexity" },
  { key: "submission_guidelines", desc: "Clear format, content, and process requirements" },
  { key: "eligibility", desc: "Specific qualifications, no overly broad or restrictive criteria" },
  { key: "complexity", desc: "Properly assessed with justified parameter values" },
  { key: "ip_model", desc: "Clear IP ownership, licensing, and transfer terms" },
  { key: "legal_docs", desc: "Required legal documents attached and reviewed" },
  { key: "escrow_funding", desc: "Escrow funded (if required)" },
  { key: "maturity_level", desc: "Set and consistent with challenge depth" },
  { key: "visibility_eligibility", desc: "Visibility and eligibility properly configured" },
];

function buildSystemPrompt(sections: typeof ALL_SECTIONS): string {
  const sectionList = sections.map((s, i) => `${i + 1}. ${s.key} - ${s.desc}`).join("\n");

  return `You are an expert innovation challenge quality reviewer performing a deep, contextual review.

For each section, assess:
- **Content quality**: Is the language clear, specific, unambiguous, and free of vague phrases like "as needed" or "if applicable"?
- **Completeness**: Are all required aspects covered? Are there missing quantifiers, timelines, or specifics?
- **Industry-appropriateness**: Does the content fit the stated industry/domain and maturity level?
- **Cross-section consistency**: Do deliverables align with evaluation criteria? Does reward structure match complexity? Does scope match problem statement?
- **Actionability for solvers**: Would a solver clearly understand what is expected from reading this section alone?
- **Maturity-level fit**: Is the depth and rigor appropriate for the stated maturity level (Blueprint vs Pilot vs Prototype)?

For each section provide:
- status: "pass" (publication-ready), "warning" (functional but improvable), or "needs_revision" (has specific issues that must be fixed)
- comments: 1-3 specific, actionable improvement instructions. Each comment should be written as an instruction that a curator can directly use to refine the section. For "pass" status, provide 0-1 optional enhancement suggestions.

Sections to review:
${sectionList}

Every comment MUST be phrased as an actionable improvement instruction.`;
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

    const { challenge_id, section_key } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which sections to review
    const sectionsToReview = section_key
      ? ALL_SECTIONS.filter((s) => s.key === section_key)
      : ALL_SECTIONS;

    if (section_key && sectionsToReview.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: `Unknown section_key: ${section_key}` } }),
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
        .select("title, problem_statement, scope, description, deliverables, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, visibility, phase_schedule, complexity_score, complexity_level, complexity_parameters, ai_section_reviews")
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

    const userPrompt = section_key
      ? `Review ONLY the "${section_key}" section of this challenge:\n\nCHALLENGE: ${JSON.stringify(challengeResult.data, null, 2)}\n\nLEGAL DOCS: ${JSON.stringify(legalResult.data ?? [], null, 2)}\n\nESCROW: ${JSON.stringify(escrowResult.data ?? null, null, 2)}`
      : `Review each section of this challenge:\n\nCHALLENGE: ${JSON.stringify(challengeResult.data, null, 2)}\n\nLEGAL DOCS: ${JSON.stringify(legalResult.data ?? [], null, 2)}\n\nESCROW: ${JSON.stringify(escrowResult.data ?? null, null, 2)}`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt(sectionsToReview) },
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
    const newSections = (parsed.sections ?? []).map((s: any) => ({
      ...s,
      reviewed_at: new Date().toISOString(),
    }));

    // Merge with existing reviews: replace matching section_keys, keep others
    const existingReviews: any[] = Array.isArray(challengeResult.data.ai_section_reviews)
      ? challengeResult.data.ai_section_reviews
      : [];

    const newKeys = new Set(newSections.map((s: any) => s.section_key));
    const merged = [
      ...existingReviews.filter((r: any) => !newKeys.has(r.section_key)),
      ...newSections,
    ];

    // Persist to DB
    const { error: updateError } = await adminClient
      .from("challenges")
      .update({ ai_section_reviews: merged })
      .eq("id", challenge_id);

    if (updateError) {
      console.error("Failed to persist AI reviews:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, data: { sections: newSections, all_reviews: merged } }),
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
