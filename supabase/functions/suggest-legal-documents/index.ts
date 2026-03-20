/**
 * suggest-legal-documents — AI edge function for Legal Coordinator.
 * Analyzes a challenge spec (maturity, IP model, scope) and suggests
 * which legal documents are needed, with draft summaries for each.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are a legal compliance advisor for a global open innovation platform.

Given a challenge specification, determine which legal documents the Legal Coordinator should prepare. Consider:
- Maturity level (ideation, proof_of_concept, prototype, market_ready)
- IP model (FULL_TRANSFER, LICENSE_BACK, SHARED_IP, NO_IP)
- Solver eligibility and scope
- Governance profile (QUICK, STRUCTURED, CONTROLLED)

For each recommended document:
1. Specify the document type and tier (Tier 1 = Entry/participation, Tier 2 = Solution/award)
2. Explain WHY it's needed for this specific challenge
3. Provide a brief content summary of what the document should cover
4. Set priority: required vs recommended

Standard document types:
- NDA (Tier 1) — Non-Disclosure Agreement for challenge participants
- CHALLENGE_TERMS (Tier 1) — Terms and conditions for participation
- IP_ASSIGNMENT (Tier 2) — IP transfer deed for winning solutions
- SOLUTION_LICENSE (Tier 2) — License agreement for solutions
- ESCROW_AGREEMENT (Tier 2) — Escrow terms for prize funds (Enterprise only)
- DATA_PROTECTION (Tier 1) — Data handling and privacy terms
- COLLABORATION_AGREEMENT (Tier 2) — Terms for collaborative engagement models`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const { data: challenge, error: challengeErr } = await adminClient
      .from("challenges")
      .select("title, problem_statement, scope, description, ip_model, maturity_level, eligibility, governance_profile, operating_model, reward_structure, deliverables, solver_eligibility_types")
      .eq("id", challenge_id)
      .single();

    if (challengeErr || !challenge) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing legal docs to avoid re-suggesting attached ones
    const { data: existingDocs } = await adminClient
      .from("challenge_legal_docs")
      .select("document_type, tier, status")
      .eq("challenge_id", challenge_id);

    const userPrompt = `Analyze this challenge and suggest the required legal documents:

CHALLENGE:
${JSON.stringify(challenge, null, 2)}

EXISTING LEGAL DOCUMENTS ALREADY ATTACHED:
${JSON.stringify(existingDocs ?? [], null, 2)}

Based on the maturity level, IP model, governance profile, and scope, recommend which legal documents should be prepared. Do NOT recommend documents that are already attached.`;

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
              name: "suggest_legal_documents",
              description: "Return a structured list of recommended legal documents for the challenge.",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Brief overview of the legal posture for this challenge",
                  },
                  documents: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        document_type: {
                          type: "string",
                          description: "Document type code (NDA, CHALLENGE_TERMS, IP_ASSIGNMENT, etc.)",
                        },
                        tier: {
                          type: "string",
                          enum: ["1", "2"],
                          description: "Tier 1 = Entry/participation, Tier 2 = Solution/award",
                        },
                        title: {
                          type: "string",
                          description: "Human-readable document title",
                        },
                        rationale: {
                          type: "string",
                          description: "Why this document is needed for this specific challenge",
                        },
                        content_summary: {
                          type: "string",
                          description: "Brief summary of what the document should cover (3-5 key points)",
                        },
                        priority: {
                          type: "string",
                          enum: ["required", "recommended"],
                          description: "Whether this document is mandatory or optional",
                        },
                      },
                      required: ["document_type", "tier", "title", "rationale", "content_summary", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "documents"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_legal_documents" } },
      }),
    });

    if (!response.ok) {
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
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: suggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-legal-documents error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
