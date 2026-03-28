/**
 * generate-challenge-spec — AI edge function that drafts challenge fields.
 * Uses Lovable AI Gateway (Google Gemini) to generate structured fields
 * from a problem statement + maturity level + optional template context.
 *
 * Fetches solver eligibility categories from md_solver_eligibility at runtime
 * so the AI selects real master-data codes instead of free-text eligibility.
 *
 * Outputs TWO solver type arrays:
 *   - solver_eligibility_codes: who can submit solutions
 *   - visible_solver_codes: who can discover/view but NOT submit
 *
 * Also generates 13 Category B "extended brief" fields for deeper challenge context.
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

DELIVERABLES (CRITICAL — derive directly from the problem statement):
- Carefully analyze the problem statement to identify EACH distinct aspect or requirement
- For EACH identified aspect, create a specific, concrete, measurable deliverable
- Generate 3-7 deliverables total — each must be a tangible work product that a solver would produce
- Each deliverable MUST directly address a specific part of the stated problem
- Format each deliverable as: "[Type of artifact/output] that [specific purpose tied to problem]"
- Examples of GOOD deliverables:
  * "Working API prototype with integration documentation demonstrating real-time data sync"
  * "Cost-benefit analysis report comparing at least 3 alternative approaches with quantified ROI"
  * "Test results dataset with statistical analysis proving 95%+ accuracy on benchmark cases"
  * "Technical architecture diagram showing component interactions, data flows, and failure modes"
  * "Deployment-ready container image with CI/CD pipeline configuration and monitoring setup"
- Examples of BAD deliverables (DO NOT USE): "Innovative solution", "High-quality output", "Comprehensive analysis", "Best practices document"
- The deliverables should collectively form a complete solution to the stated problem

EVALUATION CRITERIA (CRITICAL — must be structured, weighted, and problem-specific):
- Analyze the problem statement to determine what factors matter most for selecting the best solution
- Generate 3-6 criteria, each with:
  - name: Short descriptive label (2-4 words) that clearly identifies the assessment dimension
  - weight: Integer percentage reflecting relative importance. ALL weights MUST sum to EXACTLY 100.
  - description: 1-2 sentences explaining EXACTLY how this criterion will be scored — what constitutes excellent (high score) vs poor (low score) performance
- Weight distribution MUST reflect the specific problem's priorities:
  * For technical challenges: emphasize feasibility, accuracy, scalability
  * For business challenges: emphasize ROI, implementation cost, time-to-value
  * For research challenges: emphasize novelty, rigor, reproducibility
  * For design challenges: emphasize usability, aesthetics, accessibility
- Example for a data pipeline challenge:
  * Data Quality & Accuracy (30%) — "Solutions scoring high demonstrate <1% error rate on test data with comprehensive validation. Low scores show >5% errors or missing validation."
  * Scalability & Performance (25%) — "Solutions must handle 10x current volume. High scores show linear scaling, low scores show degradation beyond 2x."
  * Implementation Feasibility (20%) — "Evaluated on realistic resource requirements and timeline. High scores use proven tech stacks, low scores require unproven dependencies."
  * Documentation & Maintainability (15%) — "Code documentation, architecture diagrams, and runbooks. High scores enable team onboarding in <1 week."
  * Cost Efficiency (10%) — "Total cost of ownership over 3 years. High scores show <50% of current costs, low scores show marginal improvement."

- Hook: A compelling 1-2 sentence hook to attract solvers
- IP Model: Recommend one of: "IP-EA" (Exclusive Assignment), "IP-NEL" (Non-Exclusive License), "IP-EL" (Exclusive License), "IP-JO" (Joint Ownership), "IP-NONE" (No Transfer) based on the challenge nature

EXTENDED BRIEF FIELDS (generate all of these for richer challenge context):
- context_background: 2-4 paragraphs of rich context — industry background, why this problem matters now, what has been tried before
- root_causes: Analysis of the underlying causes of the problem (2-3 paragraphs)
- affected_stakeholders: Array of 3-7 stakeholder groups impacted by this problem
- current_deficiencies: What's wrong with current approaches or solutions (2-3 paragraphs)
- expected_outcomes: Array of 3-5 measurable outcomes the seeker expects
- preferred_approach: Guidance on preferred methodologies or approaches (1-2 paragraphs, or empty if open-ended)
- approaches_not_of_interest: Approaches the seeker does NOT want (1 paragraph, or empty if none)
- scoring_rubrics: For each evaluation criterion, provide a 5-level scoring rubric with score (1-5), label, and description

- reward_description: A paragraph describing the reward structure and what solvers can expect
- phase_notes: Notes about the expected timeline and phasing of the challenge
- complexity_notes: Assessment of the technical and organizational complexity

SOLVER TYPES — TWO SEPARATE SELECTIONS (CRITICAL):

You must select solver types for TWO distinct access levels from the same master data.
IMPORTANT: Select EXACTLY ONE code for each — do NOT select multiple.

1. **solver_eligibility_codes** — Who can VIEW AND SUBMIT solutions. Select exactly 1 code.
2. **visible_solver_codes** — Who can DISCOVER and VIEW the challenge but CANNOT submit. Select exactly 1 code that is BROADER than eligible.

DETERMINISTIC SELECTION RULES (apply in order):

Rule 1 — IP-sensitive challenges (ip_model is IP-EA or IP-EL) OR advanced maturity (pilot, prototype):
  - Eligible: "certified_expert"
  - Visible: "registered"

Rule 2 — Domain-expert challenges (poc maturity, technical/specialized problems):
  - Eligible: "registered"
  - Visible: "open_community"

Rule 3 — Open innovation / ideation (blueprint maturity, ip_model is IP-NONE or IP-NEL):
  - Eligible: "open_community"
  - Visible: "open_community"

Rule 4 — DEFAULT (when no other rule matches):
  - Eligible: "registered"
  - Visible: "open_community"

CONSTRAINT: visible_solver_codes MUST be strictly BROADER than solver_eligibility_codes.
Broadness hierarchy (narrowest to broadest): certified_expert < certified_competent < certified_basic < expert_invitee < registered < signed_in < open_community < hybrid
The ONLY exception is when both are "open_community" (Rule 3).
NEVER select the same code for both eligible and visible unless both are "open_community".

Available solver categories:

${solverList}

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
      .select("code, label, description, requires_auth, requires_provider_record, requires_certification, default_visibility")
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

Generate a complete challenge specification including all extended brief fields.`;

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
              description: "Return a structured challenge specification with all required fields including extended brief.",
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
                    description: "3-7 specific deliverables derived from the problem statement.",
                  },
                  evaluation_criteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Short descriptive label (2-4 words)" },
                        weight: { type: "number", description: "Integer percentage, all must sum to exactly 100" },
                        description: { type: "string", description: "1-2 sentences explaining scoring methodology" },
                      },
                      required: ["name", "weight", "description"],
                    },
                    description: "3-6 weighted evaluation criteria summing to exactly 100%.",
                  },
                  solver_eligibility_codes: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 1,
                    description: `Exactly 1 solver category code for who can VIEW AND SUBMIT. From: ${validCodes.join(", ")}`,
                  },
                  visible_solver_codes: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 1,
                    description: `Exactly 1 solver category code for who can DISCOVER/VIEW only. Must be BROADER than eligible. From: ${validCodes.join(", ")}`,
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
                  // Extended brief fields (Category B)
                  context_background: {
                    type: "string",
                    description: "2-4 paragraphs of rich industry context and background",
                  },
                  root_causes: {
                    type: "string",
                    description: "Analysis of underlying causes of the problem (2-3 paragraphs)",
                  },
                  affected_stakeholders: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-7 stakeholder groups impacted by this problem",
                  },
                  current_deficiencies: {
                    type: "string",
                    description: "What's wrong with current approaches or solutions (2-3 paragraphs)",
                  },
                  expected_outcomes: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 measurable outcomes the seeker expects",
                  },
                  preferred_approach: {
                    type: "string",
                    description: "Guidance on preferred methodologies (1-2 paragraphs, or empty)",
                  },
                  approaches_not_of_interest: {
                    type: "string",
                    description: "Approaches the seeker does NOT want (1 paragraph, or empty)",
                  },
                  scoring_rubrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        criterion_name: { type: "string" },
                        levels: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              score: { type: "number" },
                              label: { type: "string" },
                              description: { type: "string" },
                            },
                            required: ["score", "label", "description"],
                          },
                        },
                      },
                      required: ["criterion_name", "levels"],
                    },
                    description: "5-level scoring rubric per evaluation criterion",
                  },
                  reward_description: {
                    type: "string",
                    description: "Paragraph describing reward structure expectations",
                  },
                  phase_notes: {
                    type: "string",
                    description: "Notes about expected timeline and phasing",
                  },
                  complexity_notes: {
                    type: "string",
                    description: "Assessment of technical and organizational complexity",
                  },
                },
                required: [
                  "title", "problem_statement", "scope", "description",
                  "deliverables", "evaluation_criteria", "solver_eligibility_codes",
                  "visible_solver_codes", "eligibility_notes", "hook", "ip_model",
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

    // Validate and filter eligible solver codes against master data
    const selectedEligibleCodes: string[] = Array.isArray(spec.solver_eligibility_codes)
      ? spec.solver_eligibility_codes.filter((c: string) => validCodes.includes(c))
      : [];

    // Validate and filter visible solver codes against master data
    const selectedVisibleCodes: string[] = Array.isArray(spec.visible_solver_codes)
      ? spec.visible_solver_codes.filter((c: string) => validCodes.includes(c))
      : [];

    // Broadness hierarchy for post-processing: narrowest → broadest
    const BREADTH_ORDER = ["certified_expert", "certified_competent", "certified_basic", "expert_invitee", "registered", "signed_in", "open_community", "hybrid"];

    // Fallback: if no valid eligible codes, default to registered
    if (selectedEligibleCodes.length === 0) {
      selectedEligibleCodes.push("registered");
    }

    // Fallback: if no visible codes, default to open_community
    if (selectedVisibleCodes.length === 0) {
      selectedVisibleCodes.push("open_community");
    }

    // Keep only 1 code each (take the broadest selected)
    const getBroadest = (codes: string[]) => {
      let best = codes[0];
      for (const c of codes) {
        if (BREADTH_ORDER.indexOf(c) > BREADTH_ORDER.indexOf(best)) best = c;
      }
      return best;
    };
    const eligibleCode = getBroadest(selectedEligibleCodes);
    let visibleCode = getBroadest(selectedVisibleCodes);

    // Post-processing: visible must be strictly broader than eligible (unless both open_community)
    const eligibleRank = BREADTH_ORDER.indexOf(eligibleCode);
    const visibleRank = BREADTH_ORDER.indexOf(visibleCode);
    if (eligibleCode !== "open_community" && visibleRank <= eligibleRank) {
      // Bump visible to the next broader tier
      const nextBroaderIndex = Math.min(eligibleRank + 1, BREADTH_ORDER.length - 1);
      visibleCode = BREADTH_ORDER[nextBroaderIndex];
    }

    spec.solver_eligibility_codes = [eligibleCode];
    spec.visible_solver_codes = [visibleCode];
    spec.eligibility_notes = spec.eligibility_notes ?? "";

    // Build hydrated details for eligible solvers
    const buildDetails = (codes: string[]) =>
      codes.map((code: string) => {
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

    spec.solver_eligibility_details = buildDetails([eligibleCode]);
    spec.solver_visibility_details = buildDetails([visibleCode]);

    // Derive visibility from the eligible category's defaults
    const primaryCategory = categories.find((c) => c.code === eligibleCode);
    spec.challenge_visibility = primaryCategory?.default_visibility ?? "public";

    // Keep legacy eligibility field mapped from notes
    spec.eligibility = spec.eligibility_notes;

    // Package extended brief fields into a single object
    spec.extended_brief = {
      context_background: spec.context_background ?? "",
      root_causes: spec.root_causes ?? "",
      affected_stakeholders: spec.affected_stakeholders ?? [],
      current_deficiencies: spec.current_deficiencies ?? "",
      expected_outcomes: spec.expected_outcomes ?? [],
      preferred_approach: spec.preferred_approach ?? "",
      approaches_not_of_interest: spec.approaches_not_of_interest ?? "",
      scoring_rubrics: spec.scoring_rubrics ?? [],
      
      reward_description: spec.reward_description ?? "",
      phase_notes: spec.phase_notes ?? "",
      complexity_notes: spec.complexity_notes ?? "",
    };

    // Clean up top-level extended fields (they're now in extended_brief)
    delete spec.context_background;
    delete spec.root_causes;
    delete spec.affected_stakeholders;
    delete spec.current_deficiencies;
    delete spec.expected_outcomes;
    delete spec.preferred_approach;
    delete spec.approaches_not_of_interest;
    delete spec.scoring_rubrics;
    delete spec.effort_level;
    delete spec.reward_description;
    delete spec.phase_notes;
    delete spec.complexity_notes;

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
