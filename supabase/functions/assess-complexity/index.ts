/**
 * assess-complexity — AI-powered complexity assessment for challenges.
 *
 * Analyzes the full challenge content (problem statement, scope, deliverables,
 * evaluation criteria, reward structure, IP model, maturity level, eligibility,
 * domain tags, phase schedule) and rates each master complexity parameter (1-10)
 * with justification.
 *
 * Returns per-parameter ratings that the curator can review/override.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are an expert innovation challenge complexity assessor. Your job is to analyze the full content of an innovation challenge and rate its complexity across multiple dimensions.

For each complexity parameter, you must:
1. Carefully read the problem statement, scope, deliverables, evaluation criteria, reward structure, IP model, maturity level, eligibility requirements, domain tags, and phase schedule.
2. Consider the SPECIFIC content — not generic defaults. Each parameter must be rated independently based on what the challenge actually requires.
3. Rate each parameter on a scale of 1-10 where:
   - 1-2: Very Low complexity — straightforward, well-understood domain, minimal risk
   - 3-4: Low complexity — some nuance but largely standard approaches apply
   - 5-6: Medium complexity — requires meaningful expertise, moderate uncertainty
   - 7-8: High complexity — significant technical depth, cross-domain challenges, tight constraints
   - 9-10: Very High complexity — cutting-edge, high uncertainty, extreme constraints

CRITICAL RULES:
- Do NOT give the same rating to all parameters. Each parameter measures a DIFFERENT dimension and must be assessed independently.
- Base your ratings on EVIDENCE from the challenge content, not assumptions.
- If a section is missing or empty, factor that into your assessment (e.g., missing scope increases uncertainty).
- Consider cross-section interactions: tight timelines + high technical novelty = amplified complexity.

Parameter-specific guidance:
- **technical_novelty**: How much new technology, research, or innovation is needed? Is this applying known solutions or creating something new?
- **solution_maturity**: What stage is expected — a concept paper (low) vs. a working prototype (high) vs. a pilot-ready system (very high)?
- **domain_breadth**: How many distinct disciplines or domains must the solver understand? Single-domain (low) vs. cross-disciplinary (high).
- **evaluation_complexity**: How hard is it to objectively assess submissions? Simple metrics (low) vs. subjective multi-criteria (high).
- **ip_sensitivity**: How critical is IP protection? Open results (low) vs. exclusive assignment with NDAs (high).
- **timeline_urgency**: How tight is the timeline relative to the scope? Generous timeline (low) vs. aggressive deadlines (high).
- **budget_scale**: Relative magnitude of the challenge budget. Small exploratory (low) vs. large enterprise engagement (high).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check
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

    // Fetch challenge content and master complexity params in parallel
    const [challengeResult, paramsResult] = await Promise.all([
      adminClient
        .from("challenges")
        .select(`
          title, problem_statement, scope, description, deliverables,
          evaluation_criteria, reward_structure, ip_model, maturity_level,
          eligibility, visibility, phase_schedule, domain_tags,
          consulting_fee, management_fee, total_fee, currency_code,
          max_solutions, submission_deadline,
          extended_brief, expected_outcomes,
          hook, operating_model, effort_level
        `)
        .eq("id", challenge_id)
        .single(),
      adminClient
        .from("master_complexity_params")
        .select("param_key, name, weight, description")
        .eq("is_active", true)
        .order("display_order"),
    ]);

    if (challengeResult.error || !challengeResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!paramsResult.data || paramsResult.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFIG_ERROR", message: "No complexity parameters configured" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paramDescriptions = paramsResult.data.map(
      (p: any) => `- **${p.param_key}** (${p.name}): ${p.description ?? "No description"} [weight: ${(p.weight * 100).toFixed(0)}%]`
    ).join("\n");

    const userPrompt = `Analyze this innovation challenge and rate each complexity parameter independently (1-10).

COMPLEXITY PARAMETERS TO RATE:
${paramDescriptions}

FULL CHALLENGE CONTENT:
${JSON.stringify(challengeResult.data, null, 2)}

Rate each parameter based on the actual challenge content. Do NOT give the same score to all parameters — each dimension is different.`;

    // Build tool schema dynamically from master params
    const paramProperties: Record<string, any> = {};
    const requiredParams: string[] = [];
    for (const p of paramsResult.data) {
      paramProperties[p.param_key] = {
        type: "object",
        properties: {
          rating: { type: "integer", minimum: 1, maximum: 10, description: `Complexity rating for ${p.name} (1=very low, 10=very high)` },
          justification: { type: "string", description: `Brief justification for the ${p.name} rating based on challenge content` },
        },
        required: ["rating", "justification"],
        additionalProperties: false,
      };
      requiredParams.push(p.param_key);
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_complexity",
              description: "Return per-parameter complexity ratings with justifications.",
              parameters: {
                type: "object",
                properties: paramProperties,
                required: requiredParams,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assess_complexity" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded. Please try again later." } }),
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

    // Build response: map to { param_key: { rating, justification } }
    return new Response(
      JSON.stringify({ success: true, data: { ratings: parsed } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("assess-complexity error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
