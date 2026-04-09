/**
 * check-challenge-quality — AI edge function for Creator AI Review.
 * Enriched with governance, industry, geography, and rate card context.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchChallengeContext } from "./contextFetcher.ts";
import { buildSystemPrompt, buildUserPrompt } from "./promptBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const JSON_CT = { ...corsHeaders, "Content-Type": "application/json" };

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "assess_challenge_quality",
    description: "Return a structured quality assessment of the challenge specification.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "number", description: "Overall quality score 0-100" },
        completeness_score: { type: "number", description: "Completeness score 0-100" },
        clarity_score: { type: "number", description: "Clarity score 0-100" },
        solver_readiness_score: { type: "number", description: "Solver readiness score 0-100" },
        legal_compliance_score: { type: "number", description: "Legal compliance score 0-100" },
        governance_alignment_score: { type: "number", description: "Governance mode alignment score 0-100" },
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
        },
        industry_relevance_notes: {
          type: "array",
          items: { type: "string" },
          description: "Industry-specific observations and recommendations",
        },
        rate_card_assessment: {
          type: "object",
          properties: {
            is_within_range: { type: "boolean" },
            recommendation: { type: "string" },
          },
          description: "Prize reasonableness vs rate card benchmarks",
        },
        flagged_checklist_items: {
          type: "array",
          items: {
            type: "object",
            properties: { checklist_key: { type: "string" }, reason: { type: "string" } },
            required: ["checklist_key", "reason"],
          },
        },
        strengths: { type: "array", items: { type: "string" }, description: "2-4 notable strengths" },
      },
      required: [
        "overall_score", "completeness_score", "clarity_score", "solver_readiness_score",
        "legal_compliance_score", "governance_alignment_score", "summary", "gaps",
        "legal_gaps", "flagged_checklist_items", "strengths",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }), { status: 401, headers: JSON_CT });
    }

    const body = await req.json();
    const challengeId = body.challenge_id ?? body.challengeId;
    const governanceMode = (body.governanceMode as string) ?? "STRUCTURED";
    const engagementModel = (body.engagementModel as string) ?? null;
    const industrySegmentId = (body.industrySegmentId as string) ?? null;

    if (!challengeId) {
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }), { status: 400, headers: JSON_CT });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Fetch all enrichment context
    let ctx;
    try {
      ctx = await fetchChallengeContext(adminClient, { challengeId, engagementModel, industrySegmentId });
    } catch (e) {
      if (e instanceof Error && e.message === "CHALLENGE_NOT_FOUND") {
        return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }), { status: 404, headers: JSON_CT });
      }
      throw e;
    }

    const reviewScope = (body.reviewScope as string) ?? undefined;
    const params = { governanceMode, engagementModel, reviewScope };
    const systemPrompt = buildSystemPrompt(ctx, params);
    const userPrompt = buildUserPrompt(ctx, params);

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "assess_challenge_quality" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded." } }), { status: 429, headers: JSON_CT });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }), { status: 402, headers: JSON_CT });
      console.error("AI gateway error:", response.status, errText);
      // Return 200 with fallback signal so client SDK can read the structured error body
      return new Response(JSON.stringify({
        success: false,
        error: { code: "AI_SERVICE_UNAVAILABLE", message: "The AI service is temporarily unavailable. Please try again in 30 seconds." },
        fallback: true,
      }), { status: 200, headers: JSON_CT });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

    return new Response(JSON.stringify({ success: true, data: JSON.parse(toolCall.function.arguments) }), { status: 200, headers: JSON_CT });
  } catch (error) {
    console.error("check-challenge-quality error:", error);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }), { status: 500, headers: JSON_CT });
  }
});
