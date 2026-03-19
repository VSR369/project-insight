/**
 * generate-challenge-spec — AI edge function that drafts challenge fields.
 * Uses Lovable AI Gateway (Google Gemini) to generate 9 structured fields
 * from a problem statement + maturity level + optional template context.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are an expert open innovation challenge designer for a global platform similar to HeroX, Kaggle, and InnoCentive.

Given a problem statement and maturity level, generate a complete challenge specification as structured JSON using the suggest_challenge_spec tool.

Guidelines:
- Title: Clear, compelling, under 100 characters
- Problem Statement: Refine the user's input into a professional challenge brief (200-500 words)
- Scope: Define boundaries, constraints, and what's in/out of scope
- Description: Detailed context including background, current state, and desired outcomes
- Deliverables: 3-7 specific, measurable deliverables as a JSON array of strings
- Evaluation Criteria: 3-6 weighted criteria (weights must sum to 100), each with name, weight, and description
- Eligibility: Who should participate and minimum qualifications
- Hook: A compelling 1-2 sentence hook to attract solvers
- IP Model: Recommend one of: "IP-EA" (Exclusive Assignment), "IP-NEL" (Non-Exclusive License), "IP-EL" (Exclusive License), "IP-JO" (Joint Ownership), "IP-NONE" (No Transfer) based on the challenge nature

Maturity level context:
- blueprint: Early-stage concept exploration — focus on novel ideas and approaches
- poc: Proof of concept — focus on feasibility and working evidence
- prototype: Working demo — focus on end-to-end functional implementation
- pilot: Real-world test — focus on deployment readiness and measurable outcomes`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Authenticate user
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

    const { problem_statement, maturity_level, template_id } = await req.json();

    if (!problem_statement || typeof problem_statement !== "string" || problem_statement.trim().length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Problem statement must be at least 20 characters" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Problem Statement: ${problem_statement.trim()}
Maturity Level: ${maturity_level || "blueprint"}
${template_id ? `Template Context: ${template_id}` : ""}

Generate a complete challenge specification.`;

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
              name: "suggest_challenge_spec",
              description: "Return a structured challenge specification with all required fields.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Challenge title (under 100 chars)" },
                  problem_statement: { type: "string", description: "Professional challenge brief (200-500 words)" },
                  scope: { type: "string", description: "Scope, boundaries, constraints" },
                  description: { type: "string", description: "Detailed context and background" },
                  deliverables: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-7 specific deliverables",
                  },
                  evaluation_criteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        weight: { type: "number" },
                        description: { type: "string" },
                      },
                      required: ["name", "weight", "description"],
                    },
                    description: "3-6 weighted criteria summing to 100",
                  },
                  eligibility: { type: "string", description: "Eligibility requirements" },
                  hook: { type: "string", description: "1-2 sentence compelling hook" },
                  ip_model: {
                    type: "string",
                    enum: ["IP-EA", "IP-NEL", "IP-EL", "IP-JO", "IP-NONE"],
                    description: "Recommended IP model: IP-EA (Exclusive Assignment/Full Transfer), IP-NEL (Non-Exclusive License), IP-EL (Exclusive License), IP-JO (Joint Ownership/Shared), IP-NONE (No Transfer/Solver Retains)",
                  },
                },
                required: ["title", "problem_statement", "scope", "description", "deliverables", "evaluation_criteria", "eligibility", "hook", "ip_model"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_challenge_spec" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded. Please wait and try again." } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted. Contact support." } }),
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

    const spec = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: spec }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-challenge-spec error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
