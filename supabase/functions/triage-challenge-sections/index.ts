/**
 * triage-challenge-sections — Phase 1 lightweight AI triage.
 *
 * Batched parallel architecture: splits sections into batches of 4,
 * fires all batches via Promise.all for focused LLM attention per batch.
 * Returns JSON array: { id, status, confidence, issues[] }
 *
 * Confidence scoring: LLM returns 0.0-1.0 confidence per section.
 * Auto-downgrade: any section with confidence < 0.75 is forced to "warning".
 *
 * Supports optional `section_keys` parameter for targeted batch calls.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const BATCH_SIZE = 4;

const TRIAGE_SYSTEM_PROMPT = `You are a curator review assistant.

Analyze each section and return ONLY a JSON array. No explanations.

For each section return:
{
  "id": "section_id",
  "status": "pass" | "warning" | "inferred",
  "confidence": 0.0-1.0,
  "issues": ["short issue description"]
}

Rules:
- "pass" = content is complete, correctly formatted, no issues
- "warning" = content exists but has specific problems (list them)
- "inferred" = section is empty or has only placeholder text
- issues array max 3 items, each under 15 words
- confidence: 0.9-1.0 = very certain, 0.7-0.89 = reasonably certain, below 0.7 = uncertain
- If confidence < 0.75, set status to "warning" even if content seems acceptable — err on the side of caution
- Return JSON only. No markdown. No preamble.`;

/** Section keys for curation context */
const CURATION_SECTION_KEYS = [
  "problem_statement", "scope", "deliverables", "expected_outcomes",
  "evaluation_criteria", "reward_structure", "phase_schedule",
  "submission_guidelines", "eligibility", "complexity", "ip_model",
  "legal_docs", "escrow_funding", "maturity_level", "hook",
  "submission_deadline", "challenge_visibility", "effort_level",
  "domain_tags", "visibility", "solver_expertise",
  "context_and_background", "root_causes", "affected_stakeholders",
  "current_deficiencies", "preferred_approach", "approaches_not_of_interest",
];

const INTAKE_SECTION_KEYS = [
  "problem_statement", "scope", "beneficiaries_mapping", "budget_reasonableness",
];

const SPEC_SECTION_KEYS = [
  "problem_statement", "expected_outcomes", "scope", "beneficiaries_mapping",
  "description", "deliverables", "evaluation_criteria", "hook", "ip_model",
];

type RoleContext = "intake" | "spec" | "curation";

function getSectionKeys(roleContext: RoleContext): string[] {
  switch (roleContext) {
    case "intake": return INTAKE_SECTION_KEYS;
    case "spec": return SPEC_SECTION_KEYS;
    case "curation": return CURATION_SECTION_KEYS;
  }
}

/** Split array into chunks of given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Build a compact section summary for the triage prompt.
 */
function buildTriageUserPrompt(
  sectionKeys: string[],
  challengeData: Record<string, any>,
): string {
  const parts: string[] = ["Sections to triage:\n"];

  for (const key of sectionKeys) {
    let content = extractSectionContent(key, challengeData);
    if (content && content.length > 500) {
      content = content.substring(0, 497) + "...";
    }
    parts.push(`[${key}]: ${content || "[empty]"}`);
  }

  return parts.join("\n");
}

/**
 * Extract section content from challenge data by key.
 */
function extractSectionContent(key: string, data: Record<string, any>): string | null {
  const ebMap: Record<string, string> = {
    context_and_background: "context_background",
    root_causes: "root_causes",
    affected_stakeholders: "affected_stakeholders",
    current_deficiencies: "current_deficiencies",
    preferred_approach: "preferred_approach",
    approaches_not_of_interest: "approaches_not_of_interest",
  };

  if (ebMap[key] && data.extended_brief) {
    const eb = typeof data.extended_brief === "object" ? data.extended_brief : {};
    const val = eb[ebMap[key]];
    if (val == null) return null;
    return typeof val === "string" ? val : JSON.stringify(val);
  }

  const val = data[key];
  if (val == null) return null;
  if (typeof val === "string") return val.trim() || null;
  return JSON.stringify(val);
}

interface TriageResult {
  id: string;
  status: "pass" | "warning" | "inferred";
  confidence: number;
  issues: string[];
}

/**
 * Execute a single batch triage call against the AI gateway.
 */
async function triageBatch(
  batchKeys: string[],
  challengeData: Record<string, any>,
  modelToUse: string,
  apiKey: string,
): Promise<TriageResult[]> {
  const userPrompt = buildTriageUserPrompt(batchKeys, challengeData);

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [
        { role: "system", content: TRIAGE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "triage_sections",
            description: "Return triage results for the sections in this batch.",
            parameters: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", description: "section_key" },
                      status: { type: "string", enum: ["pass", "warning", "inferred"] },
                      confidence: { type: "number", description: "0.0-1.0 certainty of status assessment" },
                      issues: {
                        type: "array",
                        items: { type: "string" },
                        description: "Short issue descriptions, max 3 items",
                      },
                    },
                    required: ["id", "status", "confidence", "issues"],
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
      tool_choice: { type: "function", function: { name: "triage_sections" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

  const parsed = JSON.parse(toolCall.function.arguments);
  const sections: TriageResult[] = (parsed.sections ?? []).map((s: any) => ({
    id: s.id,
    status: s.status,
    confidence: typeof s.confidence === "number" ? s.confidence : 0.5,
    issues: Array.isArray(s.issues) ? s.issues : [],
  }));

  // Auto-downgrade: low confidence pass → warning
  for (const section of sections) {
    if (section.status === "pass" && section.confidence < 0.75) {
      section.status = "warning";
      if (!section.issues.some(i => i.toLowerCase().includes("confidence"))) {
        section.issues.push("Low confidence — flagged for manual review.");
      }
    }
  }

  return sections;
}

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

    const { challenge_id, role_context, section_keys } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedContext: RoleContext = (["intake", "spec", "curation"].includes(role_context) ? role_context : "curation") as RoleContext;
    
    // Use provided section_keys or default to full set for the role
    const allKeys = Array.isArray(section_keys) && section_keys.length > 0
      ? section_keys as string[]
      : getSectionKeys(resolvedContext);

    // Fetch challenge data with service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch model from global config
    const { data: globalConfig } = await adminClient
      .from("ai_review_global_config")
      .select("default_model")
      .eq("id", 1)
      .single();
    const modelToUse = globalConfig?.default_model || "google/gemini-3-flash-preview";

    // Fetch minimal challenge data
    const { data: challengeData, error: challengeError } = await adminClient
      .from("challenges")
      .select("title, problem_statement, scope, description, deliverables, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, visibility, challenge_visibility, phase_schedule, complexity_level, hook, extended_brief, submission_deadline, effort_level, domain_tags, solver_expertise_requirements, solver_eligibility_types, solver_visibility_types")
      .eq("id", challenge_id)
      .single();

    if (challengeError || !challengeData) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Batched parallel triage ──────────────────────────────────
    const batches = chunk(allKeys, BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batches.map(batch => 
        triageBatch(batch, challengeData, modelToUse, LOVABLE_API_KEY)
          .catch(err => {
            // Handle specific error types
            if (err.message === "RATE_LIMIT" || err.message === "PAYMENT_REQUIRED") throw err;
            // For other errors, return fallback inferred results for this batch
            console.error(`Batch triage failed for [${batch.join(", ")}]:`, err);
            return batch.map(key => ({
              id: key,
              status: "inferred" as const,
              confidence: 0,
              issues: ["Section was not evaluated — please review manually."],
            }));
          })
      )
    );

    // Flatten all batch results
    const triageResults: TriageResult[] = batchResults.flat();
    const now = new Date().toISOString();

    // Backfill any missing sections
    const returnedIds = new Set(triageResults.map(r => r.id));
    for (const key of allKeys) {
      if (!returnedIds.has(key)) {
        triageResults.push({
          id: key,
          status: "inferred",
          confidence: 0,
          issues: ["Section was not evaluated — please review manually."],
        });
      }
    }

    // Convert to SectionReview format for frontend compatibility
    const sectionReviews = triageResults.map(t => ({
      section_key: t.id,
      status: t.status === "inferred" ? "needs_revision" as const : t.status,
      triage_status: t.status,
      confidence: t.confidence,
      comments: t.issues,
      reviewed_at: now,
      phase: "triage" as const,
    }));

    // Persist triage results to DB (only if we triaged the full set)
    if (!section_keys) {
      const { error: updateError } = await adminClient
        .from("challenges")
        .update({ ai_section_reviews: sectionReviews })
        .eq("id", challenge_id);

      if (updateError) {
        console.error("Failed to persist triage results:", updateError);
      }
    }

    // Classify for frontend routing
    const passSections = triageResults.filter(t => t.status === "pass").map(t => t.id);
    const warningSections = triageResults.filter(t => t.status === "warning").map(t => t.id);
    const inferredSections = triageResults.filter(t => t.status === "inferred").map(t => t.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          triage: triageResults,
          sections: sectionReviews,
          all_reviews: sectionReviews,
          routing: {
            pass: passSections,
            warning: warningSections,
            inferred: inferredSections,
            phase2_queue: [...warningSections, ...inferredSections],
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Handle rate limit and payment errors with proper status codes
    if (error instanceof Error) {
      if (error.message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded." } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (error.message === "PAYMENT_REQUIRED") {
        return new Response(
          JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.error("triage-challenge-sections error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
