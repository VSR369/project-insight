/**
 * suggest-legal-documents — AI edge function for Legal Coordinator.
 * Analyzes a challenge spec (maturity, IP model, scope) and generates
 * full, legally robust document content for each recommended document.
 * Persists suggestions to challenge_legal_docs with status='ai_suggested'.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are a senior legal counsel drafting documents for a global open innovation platform.

Given a challenge specification, determine which legal documents the Legal Coordinator should prepare AND generate the FULL legal document text for each.

Consider:
- Maturity level (ideation, proof_of_concept, prototype, market_ready)
- IP model (FULL_TRANSFER, LICENSE_BACK, SHARED_IP, NO_IP)
- Solver eligibility and scope
- Governance profile (QUICK, STRUCTURED, CONTROLLED)

Standard document types:
- NDA (Tier 1) — Non-Disclosure Agreement for challenge participants
- CHALLENGE_TERMS (Tier 1) — Terms and conditions for participation
- IP_ASSIGNMENT (Tier 2) — IP transfer deed for winning solutions
- SOLUTION_LICENSE (Tier 2) — License agreement for solutions
- ESCROW_AGREEMENT (Tier 2) — Escrow terms for prize funds (Enterprise only)
- DATA_PROTECTION (Tier 1) — Data handling and privacy terms
- COLLABORATION_AGREEMENT (Tier 2) — Terms for collaborative engagement models

CRITICAL CONTENT REQUIREMENTS — For each document, generate COMPLETE, LEGALLY ROBUST text:

**NDA must include:**
- Definitions (Confidential Information, Disclosing Party, Receiving Party, Purpose)
- Scope of confidentiality obligations
- Exclusions from confidential information (public domain, independent development, prior knowledge)
- Permitted disclosures (legal requirement, professional advisors)
- Term and duration of obligations (minimum 3 years post-disclosure)
- Remedies for breach (injunctive relief, damages)
- Return/destruction of confidential materials
- Governing law and jurisdiction
- No license or IP transfer by disclosure

**CHALLENGE_TERMS must include:**
- Eligibility requirements and representations
- Challenge submission process and deadlines
- Evaluation criteria and judging methodology
- Intellectual property rights during evaluation
- Disqualification grounds
- Prize/reward structure and payment terms
- Warranties and representations by participants
- Limitation of liability
- Indemnification obligations
- Dispute resolution mechanism
- Amendment and withdrawal provisions
- Force majeure clause
- Severability and entire agreement

**IP_ASSIGNMENT must include:**
- Definition of assigned IP (inventions, works, designs, data)
- Scope of assignment (worldwide, perpetual, irrevocable)
- Consideration and acknowledgment
- Moral rights waiver (where applicable)
- Further assurance obligations
- Warranty of originality and non-infringement
- No encumbrances on assigned IP
- Governing law

**SOLUTION_LICENSE must include:**
- Grant of license (scope, territory, duration, exclusivity)
- Licensed materials definition
- Permitted use and restrictions
- Sublicensing rights (if any)
- Royalty/fee structure (if applicable)
- Representations and warranties
- Indemnification
- Termination triggers and consequences
- Survival clauses

**DATA_PROTECTION must include:**
- Data controller/processor identification
- Categories of personal data processed
- Purpose and legal basis for processing
- Data subject rights
- International transfer safeguards
- Security measures
- Breach notification obligations
- Data retention and deletion
- Sub-processor management
- Audit rights

**ESCROW_AGREEMENT must include:**
- Escrow agent appointment and responsibilities
- Deposit conditions and timing
- Release conditions and triggers
- Interest/returns on escrowed funds
- Dispute resolution for escrow
- Fees and expenses
- Termination and return of funds

**COLLABORATION_AGREEMENT must include:**
- Scope of collaboration
- Roles and responsibilities of each party
- IP ownership during and after collaboration
- Confidentiality obligations
- Term and termination
- Dispute resolution
- Liability allocation

Reference the specific challenge details (title, IP model, maturity level, scope) in each document to make them contextually specific rather than generic templates.

Use clear, unambiguous legal language. Number all clauses. Include proper recitals/preamble referencing the challenge.`;

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

    // Fetch existing non-suggested docs (already accepted/attached)
    const { data: existingDocs } = await adminClient
      .from("challenge_legal_docs")
      .select("document_type, tier, status")
      .eq("challenge_id", challenge_id)
      .neq("status", "ai_suggested");

    const userPrompt = `Analyze this challenge and generate the required legal documents with FULL legal text:

CHALLENGE:
${JSON.stringify(challenge, null, 2)}

EXISTING LEGAL DOCUMENTS ALREADY ATTACHED:
${JSON.stringify(existingDocs ?? [], null, 2)}

Based on the maturity level, IP model, governance profile, and scope, recommend which legal documents should be prepared. Do NOT recommend documents that are already attached. For each document, generate the COMPLETE legal document text — not a summary, not bullet points, but full clauses ready for legal review.`;

    const response = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
          {
            type: "function",
            function: {
              name: "suggest_legal_documents",
              description: "Return a structured list of recommended legal documents with full legal text for the challenge.",
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
                          description: "Generate the FULL legal document text — complete numbered clauses, definitions, obligations, liability terms, governing law, dispute resolution, and all legally required sections. The output must be a complete, ready-for-review legal document, NOT a summary or bullet points. Reference the specific challenge title, IP model, and maturity level within the document.",
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

    // ── Persist suggestions to DB ──
    // First, delete any prior ai_suggested rows for this challenge (allows re-generation)
    await adminClient
      .from("challenge_legal_docs")
      .delete()
      .eq("challenge_id", challenge_id)
      .eq("status", "ai_suggested");

    // Insert new suggestions
    if (suggestions.documents && suggestions.documents.length > 0) {
      const rows = suggestions.documents.map((doc: any) => ({
        challenge_id,
        document_type: doc.document_type,
        tier: doc.tier === "1" ? "TIER_1" : doc.tier === "2" ? "TIER_2" : doc.tier,
        status: "ai_suggested",
        lc_status: null,
        document_name: doc.title,
        content_summary: doc.content_summary,
        rationale: doc.rationale,
        priority: doc.priority,
        maturity_level: challenge.maturity_level ?? null,
        created_by: user.id,
        attached_by: user.id,
      }));

      const { error: insertErr } = await adminClient
        .from("challenge_legal_docs")
        .insert(rows);

      if (insertErr) {
        console.error("Failed to persist suggestions:", insertErr.message);
        return new Response(
          JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to save suggestions: " + insertErr.message } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
