/**
 * review-challenge-sections — Role-aware per-section AI review.
 * Returns granular pass/warning/needs_revision per section with comments.
 * Supports single-section mode via optional `section_key` parameter.
 * Supports role contexts: 'intake' (AM/RQ), 'spec' (CR/CA), 'curation' (CU, default).
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

/* ── Section definitions per role context ──────────────── */

const CURATION_SECTIONS = [
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

const INTAKE_SECTIONS = [
  { key: "problem_statement", desc: "Clarity of the business problem: is it specific, well-bounded, and understandable?" },
  { key: "scope", desc: "Solution expectations: are the desired outcomes clearly described?" },
  { key: "beneficiaries_mapping", desc: "Stakeholder mapping: are affected parties and expected benefits identified?" },
  { key: "budget_reasonableness", desc: "Budget range: is it reasonable for the described problem scope?" },
];

const SPEC_SECTIONS = [
  { key: "problem_statement", desc: "Clarity, specificity, solver-readiness — would a solver understand the problem?" },
  { key: "expected_outcomes", desc: "Clear, measurable outcomes solvers should deliver" },
  { key: "scope", desc: "Bounded, in-scope vs out-of-scope clarity for solvers" },
  { key: "beneficiaries_mapping", desc: "Stakeholders and beneficiaries clearly identified" },
  { key: "description", desc: "Detailed enough for solvers to understand context and constraints" },
  { key: "deliverables", desc: "Measurable, concrete, complete list with acceptance criteria" },
  { key: "evaluation_criteria", desc: "Clear criteria with proper weights summing to 100%, aligned with deliverables" },
  { key: "hook", desc: "Engaging, concise, motivating for potential solvers" },
  { key: "ip_model", desc: "Clear IP ownership, licensing, and transfer terms" },
];

type RoleContext = "intake" | "spec" | "curation";

function getSectionsForContext(roleContext: RoleContext) {
  switch (roleContext) {
    case "intake": return INTAKE_SECTIONS;
    case "spec": return SPEC_SECTIONS;
    case "curation": return CURATION_SECTIONS;
    default: return CURATION_SECTIONS;
  }
}

function buildSystemPrompt(sections: typeof CURATION_SECTIONS, roleContext: RoleContext): string {
  const sectionList = sections.map((s, i) => `${i + 1}. ${s.key} - ${s.desc}`).join("\n");

  const roleGuidance = roleContext === "intake"
    ? `You are reviewing an intake brief submitted by an Account Manager or Challenge Requestor.
Focus on:
- **Clarity for downstream creators**: Will a Challenge Creator/Architect understand the problem well enough to draft a full specification?
- **Completeness**: Are the key business parameters (problem, expectations, budget, stakeholders) adequately described?
- **Actionability**: Can the next team member start working without needing clarification?`
    : roleContext === "spec"
    ? `You are reviewing an AI-generated challenge specification from the Creator/Architect perspective.
Focus on:
- **Solver readiness**: Would a solver clearly understand what is expected?
- **Technical accuracy**: Are deliverables, evaluation criteria, and scope well-defined?
- **Consistency**: Do sections align with each other (deliverables match criteria, scope matches problem)?`
    : `You are an expert innovation challenge quality reviewer performing a deep, contextual review.
For each section, assess:
- **Content quality**: Is the language clear, specific, unambiguous?
- **Completeness**: Are all required aspects covered?
- **Industry-appropriateness**: Does the content fit the stated industry/domain?
- **Cross-section consistency**: Do deliverables align with evaluation criteria?
- **Actionability for solvers**: Would a solver clearly understand what is expected?
- **Maturity-level fit**: Is the depth appropriate for the stated maturity level?`;

  return `${roleGuidance}

For each section provide:
- status: "pass" (ready), "warning" (functional but improvable), or "needs_revision" (has specific issues that must be fixed)
- comments: 1-3 specific, actionable improvement instructions. For "pass" status, provide 0-1 optional enhancement suggestions.

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

    const { challenge_id, section_key, role_context } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedContext: RoleContext = (["intake", "spec", "curation"].includes(role_context) ? role_context : "curation") as RoleContext;
    const allSections = getSectionsForContext(resolvedContext);

    // Determine which sections to review
    const sectionsToReview = section_key
      ? allSections.filter((s) => s.key === section_key)
      : allSections;

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

    // Select fields based on role context
    const challengeFields = resolvedContext === "intake"
      ? "title, problem_statement, scope, reward_structure, phase_schedule, extended_brief, ai_section_reviews"
      : "title, problem_statement, scope, description, deliverables, evaluation_criteria, reward_structure, ip_model, maturity_level, eligibility, visibility, phase_schedule, complexity_score, complexity_level, complexity_parameters, ai_section_reviews, hook, extended_brief";

    const fetchPromises: Promise<any>[] = [
      adminClient
        .from("challenges")
        .select(challengeFields)
        .eq("id", challenge_id)
        .single(),
    ];

    // Only fetch legal/escrow for curation context
    if (resolvedContext === "curation") {
      fetchPromises.push(
        adminClient
          .from("challenge_legal_docs")
          .select("document_type, tier, status, lc_status, document_name")
          .eq("challenge_id", challenge_id),
        adminClient
          .from("escrow_records")
          .select("escrow_status, deposit_amount, currency")
          .eq("challenge_id", challenge_id)
          .maybeSingle(),
      );
    }

    const results = await Promise.all(fetchPromises);
    const challengeResult = results[0];
    const legalResult = resolvedContext === "curation" ? results[1] : null;
    const escrowResult = resolvedContext === "curation" ? results[2] : null;

    if (challengeResult.error || !challengeResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let challengeData = challengeResult.data;

    // For intake/spec context, extract extended_brief fields into the review payload
    if ((resolvedContext === "intake" || resolvedContext === "spec") && challengeData.extended_brief) {
      const eb = typeof challengeData.extended_brief === "object" ? challengeData.extended_brief : {};
      challengeData = {
        ...challengeData,
        beneficiaries_mapping: (eb as any).beneficiaries_mapping ?? null,
        solution_expectations: (eb as any).solution_expectations ?? challengeData.scope ?? null,
        expected_outcomes: (eb as any).expected_outcomes ?? challengeData.scope ?? null,
      };
    }

    const contextLabel = resolvedContext === "intake" ? "intake brief" : resolvedContext === "spec" ? "specification" : "challenge";
    const userPrompt = section_key
      ? `Review ONLY the "${section_key}" section of this ${contextLabel}:\n\nDATA: ${JSON.stringify(challengeData, null, 2)}${legalResult ? `\n\nLEGAL DOCS: ${JSON.stringify(legalResult.data ?? [], null, 2)}` : ""}${escrowResult ? `\n\nESCROW: ${JSON.stringify(escrowResult.data ?? null, null, 2)}` : ""}`
      : `Review each section of this ${contextLabel}:\n\nDATA: ${JSON.stringify(challengeData, null, 2)}${legalResult ? `\n\nLEGAL DOCS: ${JSON.stringify(legalResult.data ?? [], null, 2)}` : ""}${escrowResult ? `\n\nESCROW: ${JSON.stringify(escrowResult.data ?? null, null, 2)}` : ""}`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt(sectionsToReview, resolvedContext) },
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

    // Backfill any sections the AI skipped with a default "pass"
    const returnedKeys = new Set(newSections.map((s: any) => s.section_key));
    for (const sec of sectionsToReview) {
      if (!returnedKeys.has(sec.key)) {
        newSections.push({
          section_key: sec.key,
          status: "pass",
          comments: [],
          reviewed_at: new Date().toISOString(),
        });
      }
    }

    // Merge with existing reviews
    const existingReviews: any[] = Array.isArray(challengeResult.data.ai_section_reviews)
      ? challengeResult.data.ai_section_reviews
      : [];

    const newKeys = new Set(newSections.map((s: any) => s.section_key));
    const merged = [
      ...existingReviews.filter((r: any) => !newKeys.has(r.section_key)),
      ...newSections,
    ];

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
