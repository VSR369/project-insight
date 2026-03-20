/**
 * check-challenge-quality — AI edge function for curation quality analysis.
 * Scores challenge completeness, identifies gaps, and assesses solver readiness.
 * Also evaluates attached legal documents for tier coverage and compliance.
 * Used by curators alongside the manual 14-point checklist.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are an expert innovation challenge quality reviewer for a global open innovation platform.

Analyze a challenge specification AND its attached legal documents to provide a structured quality assessment using the assess_challenge_quality tool.

Scoring criteria:
- Completeness (0-100): Are all required fields filled with substantive content?
- Clarity (0-100): Is the problem clearly defined? Would a solver understand exactly what's needed?
- Solver Readiness (0-100): Could a qualified solver start working on this challenge today?
- Legal Compliance (0-100): Are required legal documents attached and approved? Tier 1 (Entry) and Tier 2 (Solution) docs should be present based on maturity level.
- Overall Score (0-100): Weighted average considering all factors including legal readiness

For each gap found, categorize severity as:
- "critical": Missing essential information that blocks solver participation
- "warning": Important information that should be added for better outcomes
- "suggestion": Nice-to-have improvements

For legal gaps, check:
- Are Tier 1 (Entry) documents attached? (NDA, Challenge Terms)
- Are Tier 2 (Solution) documents attached? (IP Assignment, Solution License)
- Have documents been reviewed by the Legal Coordinator?
- Are any required documents missing for the challenge's maturity level?

Flag checklist items that need curator attention with specific reasons.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Authenticate
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

    // Fetch challenge data and legal docs using service role for full access
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const [challengeResult, legalDocsResult] = await Promise.all([
      adminClient
        .from("challenges")
        .select("title, problem_statement, scope, description, deliverables, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, visibility, hook, phase_schedule")
        .eq("id", challenge_id)
        .single(),
      adminClient
        .from("challenge_legal_docs")
        .select("document_type, tier, status, lc_status, document_name, maturity_level")
        .eq("challenge_id", challenge_id),
    ]);

    if (challengeResult.error || !challengeResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const challenge = challengeResult.data;
    const legalDocs = legalDocsResult.data ?? [];

    // Build legal docs summary for AI context
    const legalSummary = {
      total_documents: legalDocs.length,
      by_tier: {
        tier_1: legalDocs.filter((d) => d.tier === "1" || d.tier === "tier_1"),
        tier_2: legalDocs.filter((d) => d.tier === "2" || d.tier === "tier_2"),
      },
      statuses: legalDocs.map((d) => ({
        name: d.document_name || d.document_type,
        tier: d.tier,
        status: d.status,
        lc_review_status: d.lc_status,
      })),
    };

    const userPrompt = `Analyze this challenge specification and its legal documents for quality, solver readiness, and legal compliance:

CHALLENGE SPECIFICATION:
${JSON.stringify(challenge, null, 2)}

LEGAL DOCUMENTS:
${JSON.stringify(legalSummary, null, 2)}`;

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
              name: "assess_challenge_quality",
              description: "Return a structured quality assessment of the challenge specification and legal compliance.",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "Overall quality score 0-100" },
                  completeness_score: { type: "number", description: "Completeness score 0-100" },
                  clarity_score: { type: "number", description: "Clarity score 0-100" },
                  solver_readiness_score: { type: "number", description: "Solver readiness score 0-100" },
                  legal_compliance_score: { type: "number", description: "Legal document compliance score 0-100" },
                  summary: { type: "string", description: "2-3 sentence quality summary" },
                  gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string" },
                        severity: { type: "string", enum: ["critical", "warning", "suggestion"] },
                        message: { type: "string" },
                      },
                      required: ["field", "severity", "message"],
                    },
                    description: "List of identified gaps or issues in the specification",
                  },
                  legal_gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        document_type: { type: "string" },
                        tier: { type: "string" },
                        severity: { type: "string", enum: ["critical", "warning", "suggestion"] },
                        message: { type: "string" },
                      },
                      required: ["document_type", "tier", "severity", "message"],
                    },
                    description: "List of legal document gaps or compliance issues",
                  },
                  flagged_checklist_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        checklist_key: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["checklist_key", "reason"],
                    },
                    description: "Checklist items that need curator attention",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 notable strengths of the challenge",
                  },
                },
                required: ["overall_score", "completeness_score", "clarity_score", "solver_readiness_score", "legal_compliance_score", "summary", "gaps", "legal_gaps", "flagged_checklist_items", "strengths"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assess_challenge_quality" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded. Please wait." } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const assessment = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: assessment }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-challenge-quality error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
