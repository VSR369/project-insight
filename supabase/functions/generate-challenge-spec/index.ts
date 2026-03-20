/**
 * generate-challenge-spec — AI edge function that drafts challenge fields.
 * Uses Lovable AI Gateway (Google Gemini) to generate structured fields
 * from a problem statement + maturity level + optional template context.
 *
 * Fetches solver eligibility categories from md_solver_eligibility at runtime
 * so the AI selects real master-data codes instead of free-text eligibility.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Build the system prompt dynamically with solver categories injected. */
function buildSystemPrompt(solverCategories: SolverCategory[]): string {
  const solverList = solverCategories
    .map(
      (s) =>
        `  - "${s.code}" — ${s.label}: ${s.description ?? "No description"}` +
        (s.requires_auth ? " [Requires Auth]" : "") +
        (s.requires_certification ? " [Requires Certification]" : "") +
        (s.requires_provider_record ? " [Requires Provider Record]" : "")
    )
    .join("\n");

  return `You are an expert open innovation challenge designer for a global platform similar to HeroX, Kaggle, and InnoCentive.

Given a problem statement and maturity level, generate a complete challenge specification as structured JSON using the suggest_challenge_spec tool.

Guidelines:
- Title: Clear, compelling, under 100 characters
- Problem Statement: Refine the user's input into a professional challenge brief (200-500 words)
- Scope: Define boundaries, constraints, and what's in/out of scope
- Description: Detailed context including background, current state, and desired outcomes
- Deliverables: 3-7 specific, measurable deliverables as a JSON array of strings. Each deliverable should be a clear, actionable item (e.g., "Working prototype with API documentation", "Technical feasibility report with cost analysis")
- Evaluation Criteria: 3-6 weighted criteria (weights must sum to 100), each with name, weight, and description. Distribute weights based on relative importance.
- Hook: A compelling 1-2 sentence hook to attract solvers
- IP Model: Recommend one of: "IP-EA" (Exclusive Assignment), "IP-NEL" (Non-Exclusive License), "IP-EL" (Exclusive License), "IP-JO" (Joint Ownership), "IP-NONE" (No Transfer) based on the challenge nature

For solver eligibility, select 1-3 solver category codes from the platform's master data that best match the challenge requirements. The available solver categories are:

${solverList}

Select categories based on:
- Challenge complexity and domain expertise needed
- IP sensitivity and confidentiality requirements
- Maturity level (blueprint/poc → broader categories; prototype/pilot → more specialized)
- Whether certification or authentication is needed

Also provide free-text eligibility_notes with any additional qualification details.

Maturity level context:
- blueprint: Early-stage concept exploration — focus on novel ideas and approaches
- poc: Proof of concept — focus on feasibility and working evidence
- prototype: Working demo — focus on end-to-end functional implementation
- pilot: Real-world test — focus on deployment readiness and measurable outcomes`;
}

interface SolverCategory {
  code: string;
  label: string;
  description: string | null;
  requires_auth: boolean;
  requires_provider_record: boolean;
  requires_certification: boolean;
  default_visibility: string | null;
  default_enrollment: string | null;
  default_submission: string | null;
}

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

    // Fetch solver eligibility categories from master data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: solverCategories, error: solverError } = await serviceClient
      .from("md_solver_eligibility")
      .select("code, label, description, requires_auth, requires_provider_record, requires_certification, default_visibility, default_enrollment, default_submission")
      .eq("is_active", true)
      .order("display_order");

    if (solverError) {
      console.error("Failed to fetch solver categories:", solverError.message);
      throw new Error("Failed to load solver eligibility data");
    }

    const categories: SolverCategory[] = solverCategories ?? [];
    const validCodes = categories.map((c) => c.code);

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

    const systemPrompt = buildSystemPrompt(categories);

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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
                    description: "3-7 specific deliverables, each a clear actionable item",
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
                  solver_eligibility_codes: {
                    type: "array",
                    items: { type: "string" },
                    description: `1-3 solver category codes from: ${validCodes.join(", ")}`,
                  },
                  eligibility_notes: {
                    type: "string",
                    description: "Free-text additional eligibility qualifications and notes",
                  },
                  hook: { type: "string", description: "1-2 sentence compelling hook" },
                  ip_model: {
                    type: "string",
                    enum: ["IP-EA", "IP-NEL", "IP-EL", "IP-JO", "IP-NONE"],
                    description: "Recommended IP model",
                  },
                },
                required: [
                  "title", "problem_statement", "scope", "description",
                  "deliverables", "evaluation_criteria", "solver_eligibility_codes",
                  "eligibility_notes", "hook", "ip_model",
                ],
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

    // Validate and filter solver codes against master data
    const selectedCodes: string[] = Array.isArray(spec.solver_eligibility_codes)
      ? spec.solver_eligibility_codes.filter((c: string) => validCodes.includes(c))
      : [];

    // Fallback: if no valid codes selected, use the first (most open) category
    if (selectedCodes.length === 0 && categories.length > 0) {
      selectedCodes.push(categories[0].code);
    }

    spec.solver_eligibility_codes = selectedCodes;
    spec.eligibility_notes = spec.eligibility_notes ?? "";

    // Derive access control fields from the first selected category's defaults
    const primaryCategory = categories.find((c) => c.code === selectedCodes[0]);
    spec.challenge_visibility = primaryCategory?.default_visibility ?? "public";
    spec.challenge_enrollment = primaryCategory?.default_enrollment ?? "open_auto";
    spec.challenge_submission = primaryCategory?.default_submission ?? "all_enrolled";

    // Also include the full solver category details for the frontend to render
    spec.solver_eligibility_details = selectedCodes.map((code: string) => {
      const cat = categories.find((c) => c.code === code);
      return cat
        ? {
            code: cat.code,
            label: cat.label,
            description: cat.description,
            requires_auth: cat.requires_auth,
            requires_provider_record: cat.requires_provider_record,
            requires_certification: cat.requires_certification,
          }
        : { code, label: code, description: null, requires_auth: false, requires_provider_record: false, requires_certification: false };
    });

    // Keep legacy eligibility field mapped from notes
    spec.eligibility = spec.eligibility_notes;

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
