/**
 * refine-challenge-section — AI-powered section refinement.
 * Accepts role_context to tailor refinement prompts per role:
 *   'intake' → brief clarity for AM/RQ
 *   'spec'   → solver-readiness for CR/CA
 *   'curation' → publication quality for CU (default)
 *
 * Phase 5C: Master-data sections inject allowed codes so AI can only
 * pick from valid options — never prose.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Sections whose AI output must be a JSON array of valid codes */
const MULTI_CODE_SECTIONS = new Set(["eligibility", "visibility"]);

/** Sections whose AI output must be a single valid code string */
const SINGLE_CODE_SECTIONS = new Set([
  "ip_model",
  "maturity_level",
  "complexity",
  "challenge_visibility",
  "effort_level",
]);

/** Map section keys to their format type for prompt building */
const SECTION_FORMAT_MAP: Record<string, string> = {
  problem_statement: 'rich_text', scope: 'rich_text', hook: 'rich_text',
  deliverables: 'line_items', expected_outcomes: 'line_items', submission_guidelines: 'line_items',
  evaluation_criteria: 'table', reward_structure: 'table', affected_stakeholders: 'table',
  phase_schedule: 'schedule_table',
  complexity: 'checkbox_single', ip_model: 'checkbox_single', maturity_level: 'checkbox_single',
  eligibility: 'checkbox_multi', visibility: 'checkbox_multi',
  challenge_visibility: 'select', effort_level: 'radio',
  domain_tags: 'tag_input', solver_expertise: 'custom',
  context_and_background: 'rich_text', root_causes: 'line_items',
  current_deficiencies: 'line_items', extended_brief_expected_outcomes: 'line_items',
  preferred_approach: 'rich_text', approaches_not_of_interest: 'line_items',
};

/**
 * Build system prompt. When Phase 1 `issues` are provided, use a minimal
 * focused prompt. Otherwise fall back to the verbose role-aware prompt
 * for manual refinement calls.
 */
function getSystemPrompt(roleContext: string, issues?: string[]): string {
  // ── Phase 2 minimal prompt (issues supplied from triage) ──
  if (issues && issues.length > 0) {
    return `You are fixing a specific curator section.

Return ONLY the corrected content in the same format as the input.
- If line items: return a JSON array of strings
- If rich text: return clean HTML
- If table: return JSON array of row objects
- If schedule table: return JSON array of phase objects
- If checkbox/select: return the code value(s) from allowed options only
No explanation. No preamble. Corrected content only.`;
  }

  // ── Legacy verbose prompts for manual refinement ──
  if (roleContext === "intake") {
    return `You are an expert business brief writer helping Account Managers and Challenge Requestors improve their intake submissions.

Your task: Rewrite or improve a specific section of an intake brief based on the reviewer's instructions.

Rules:
- Follow the reviewer's instructions precisely.
- Focus on clarity, specificity, and completeness for downstream Challenge Creators/Architects.
- Use clear, professional business language — avoid jargon unless appropriate to the domain.
- Be specific and actionable — replace vague phrases with concrete descriptions.
- For text fields, return plain text or HTML (matching the input format).
- Keep the length appropriate — provide enough detail without padding.
- Do NOT add markdown formatting unless the input already uses it.`;
  }

  if (roleContext === "spec") {
    return `You are an expert innovation challenge specification writer helping Challenge Creators and Architects refine their specifications.

Your task: Rewrite or improve a specific section of a challenge specification based on the reviewer's instructions.

Rules:
- Follow the reviewer's instructions precisely.
- Ensure the content is solver-ready: a solver should clearly understand expectations from this section alone.
- Maintain consistency with the challenge context (title, maturity level, domain).
- Use clear, professional, unambiguous language appropriate for innovation challenges.
- Be specific and actionable — avoid vague phrases like "as needed" or "if applicable."
- For text fields, return plain text or HTML (matching the input format).
- For structured fields (deliverables, evaluation_criteria), return valid JSON matching the input structure.
- Do NOT add markdown formatting unless the input already uses it.`;
  }

  // Default: curation context
  return `You are an expert innovation challenge specification writer.

Your task: Rewrite or improve a specific section of a challenge specification based on the curator's instructions.

Rules:
- Follow the curator's instructions precisely — they describe what to improve, add, remove, or restructure.
- Maintain consistency with the challenge context (title, maturity level, industry, domain tags, and other sections).
- Use clear, professional, unambiguous language appropriate for innovation challenges.
- Be specific and actionable — avoid vague phrases like "as needed" or "if applicable."
- Preserve the original intent and facts while improving quality per the instructions.
- For text fields, return plain text or HTML (matching the input format).
- For structured fields (deliverables, evaluation_criteria, reward_structure, phase_schedule), return valid JSON matching the input structure.
- Do NOT add markdown formatting unless the input already uses it.
- Keep the length appropriate — don't pad unnecessarily but don't over-compress either.
- For master-data selection sections (eligibility, visibility, ip_model, maturity_level, complexity, effort_level, challenge_visibility), return ONLY the code values from the provided allowed options. Never invent new codes.`;
}

/**
 * Fetch allowed master-data codes from DB for a given section.
 */
async function fetchMasterDataCodes(
  supabaseClient: ReturnType<typeof createClient>,
  sectionKey: string,
): Promise<{ code: string; label: string; description: string | null }[] | null> {
  if (sectionKey === "eligibility" || sectionKey === "visibility") {
    const { data } = await supabaseClient
      .from("md_solver_eligibility")
      .select("code, label, description")
      .eq("is_active", true)
      .order("display_order");
    return data ?? null;
  }
  if (sectionKey === "complexity") {
    const { data } = await supabaseClient
      .from("md_challenge_complexity")
      .select("complexity_code, complexity_label")
      .eq("is_active", true)
      .order("display_order");
    return (data ?? []).map((r: any) => ({ code: r.complexity_code, label: r.complexity_label, description: null }));
  }
  // ip_model, maturity_level, challenge_visibility, effort_level are static for now
  const STATIC_OPTIONS: Record<string, { code: string; label: string; description: string | null }[]> = {
    ip_model: [
      { code: "full_transfer", label: "Full IP Transfer", description: null },
      { code: "licensed", label: "Licensed Use", description: null },
      { code: "shared", label: "Shared IP", description: null },
      { code: "open_source", label: "Open Source", description: null },
      { code: "retained", label: "Solver Retains", description: null },
    ],
    maturity_level: [
      { code: "BLUEPRINT", label: "Blueprint", description: null },
      { code: "POC", label: "Proof of Concept", description: null },
      { code: "PROTOTYPE", label: "Prototype", description: null },
      { code: "PILOT", label: "Pilot", description: null },
      { code: "PRODUCTION", label: "Production", description: null },
    ],
    effort_level: [
      { code: "low", label: "Low", description: null },
      { code: "medium", label: "Medium", description: null },
      { code: "high", label: "High", description: null },
      { code: "expert", label: "Expert", description: null },
    ],
    challenge_visibility: [
      { code: "public", label: "Public", description: null },
      { code: "registered_users", label: "Registered Users", description: null },
      { code: "invite_only", label: "Invite Only", description: null },
    ],
  };
  return STATIC_OPTIONS[sectionKey] ?? null;
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

    const { challenge_id, section_key, current_content, curator_instructions, context, role_context } = await req.json();

    if (!challenge_id || !section_key || !curator_instructions) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id, section_key, and curator_instructions are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedRoleContext = ["intake", "spec", "curation"].includes(role_context) ? role_context : "curation";

    const contextParts: string[] = [];
    if (context?.title) contextParts.push(`Challenge Title: ${context.title}`);
    if (context?.maturity_level) contextParts.push(`Maturity Level: ${context.maturity_level}`);
    if (context?.domain_tags?.length) contextParts.push(`Domain Tags: ${context.domain_tags.join(", ")}`);

    const instructionLabel = resolvedRoleContext === "intake" ? "REVIEWER'S" : resolvedRoleContext === "spec" ? "CREATOR'S" : "CURATOR'S";

    // ── Extended Brief subsection: approaches_not_of_interest — never AI-draft ──
    if (section_key === "approaches_not_of_interest") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            section_key,
            refined_content: JSON.stringify({ requires_human_input: true, comment: "This section requires explicit human input about excluded approaches." }),
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userPrompt = `SECTION: ${section_key}

CURRENT CONTENT:
${typeof current_content === "string" ? current_content : JSON.stringify(current_content, null, 2)}

CHALLENGE CONTEXT:
${contextParts.length > 0 ? contextParts.join("\n") : "No additional context provided."}

${instructionLabel} INSTRUCTIONS (follow these precisely):
${curator_instructions}

Rewrite the section content following the instructions. Return ONLY the refined content, nothing else.`;

    // ── Extended Brief subsection-specific format instructions ──
    const EB_FORMAT_INSTRUCTIONS: Record<string, string> = {
      root_causes: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of short phrase strings. Each item is a cause label, not a description. Max 8 items. Example: ["Timestamp mismatch between WMS and SAP", "No automated detection of reconciliation errors"]`,
      affected_stakeholders: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of row objects with keys: "stakeholder_name", "role", "impact_description" (max 100 chars), "adoption_challenge" (max 100 chars). Always populate adoption_challenge. Example: [{"stakeholder_name":"Warehouse Team","role":"End User","impact_description":"Manual reconciliation","adoption_challenge":"Resistance to new workflows"}]`,
      current_deficiencies: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of current-state observation phrases. Max 10 items. Each item must state a factual observation, not a wish. Example: ["Manual reconciliation produces 47 discrepancies weekly"]`,
      extended_brief_expected_outcomes: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of strings, one per expected outcome. Never remove existing outcomes. Example: ["Outcome 1", "Outcome 2"]`,
      context_and_background: `\n\nReturn formatted rich text (HTML or markdown matching input format). Ensure an external solver with no prior knowledge can understand the operational setting.`,
      preferred_approach: `\n\nIMPORTANT: If content already exists, do NOT rewrite it. Return the existing content unchanged. This represents the seeker's stated preferences.`,
    };
    const ebInstruction = EB_FORMAT_INSTRUCTIONS[section_key];
    if (ebInstruction) {
      userPrompt += ebInstruction;
    }

    // ── Master-data constraint injection ──
    const isMasterDataSection = MULTI_CODE_SECTIONS.has(section_key) || SINGLE_CODE_SECTIONS.has(section_key);

    if (isMasterDataSection) {
      const masterCodes = await fetchMasterDataCodes(supabaseClient, section_key);
      if (masterCodes && masterCodes.length > 0) {
        const optionsList = masterCodes
          .map((o) => `  - "${o.code}" → ${o.label}${o.description ? ` (${o.description})` : ""}`)
          .join("\n");

        if (MULTI_CODE_SECTIONS.has(section_key)) {
          userPrompt += `\n\nCRITICAL FORMAT REQUIREMENT: You MUST return ONLY a valid JSON array of code strings from the allowed options below. Pick the most appropriate codes based on the challenge context and instructions. Do NOT invent new codes. Do NOT return prose.\n\nALLOWED OPTIONS:\n${optionsList}\n\nExample output: ["certified_expert", "registered"]`;
        } else {
          userPrompt += `\n\nCRITICAL FORMAT REQUIREMENT: You MUST return ONLY a single code string (no quotes, no JSON) from the allowed options below. Pick the most appropriate option. Do NOT invent new codes. Do NOT return prose.\n\nALLOWED OPTIONS:\n${optionsList}\n\nExample output: certified_expert`;
        }
      }
    } else {
      // Standard format instructions for non-master-data sections
      const FORMAT_INSTRUCTIONS: Record<string, string> = {
        deliverables: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of strings, one per deliverable item. Example: ["Deliverable 1 description", "Deliverable 2 description"]. Do NOT return prose, markdown tables, or numbered lists — ONLY a raw JSON array.`,
        evaluation_criteria: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of objects with "name", "weight", and "description" keys. Example: [{"name":"Innovation","weight":30,"description":"..."},{"name":"Feasibility","weight":25,"description":"..."}]. Do NOT return prose, markdown tables, or numbered lists — ONLY a raw JSON array.`,
        submission_guidelines: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of strings, one per guideline item. Example: ["Guideline 1", "Guideline 2"]. Do NOT return prose paragraphs.`,
        expected_outcomes: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of strings, one per expected outcome. Example: ["Outcome 1", "Outcome 2"]. Do NOT return prose paragraphs.`,
        phase_schedule: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of phase objects with keys: "phase_name" (string), "duration_days" (number), "start_date" (ISO date YYYY-MM-DD or null), "end_date" (ISO date YYYY-MM-DD or null). Propose realistic dates based on challenge scope. Example: [{"phase_name":"Registration","duration_days":14,"start_date":"2025-07-01","end_date":"2025-07-14"}].`,
        reward_structure: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of row objects with keys: "prize_tier", "amount", "currency", "payment_trigger". Example: [{"prize_tier":"1st Place","amount":50000,"currency":"USD","payment_trigger":"upon selection"}].`,
        domain_tags: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of tag strings. Example: ["AI", "Healthcare", "Data Science"]. No prose.`,
      };

      const fmtInstruction = FORMAT_INSTRUCTIONS[section_key];
      if (fmtInstruction) {
        userPrompt += fmtInstruction;
      }
    }

    // ── Solver expertise: fetch taxonomy and inject as allowed options ──
    if (section_key === "solver_expertise") {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: challengeRow } = await adminClient
        .from("challenges")
        .select("eligibility")
        .eq("id", challenge_id)
        .single();
      let taxonomyContext = "";
      const targeting = challengeRow?.eligibility;
      let industryId: string | null = null;
      if (targeting) {
        try {
          const parsed = typeof targeting === "string" ? JSON.parse(targeting) : targeting;
          industryId = parsed?.industry_segment_id ?? null;
        } catch {}
      }
      if (industryId) {
        const { data: areas } = await adminClient
          .from("proficiency_areas")
          .select("id, name, expertise_level_id")
          .eq("industry_segment_id", industryId)
          .eq("is_active", true)
          .order("display_order");
        if (areas && areas.length > 0) {
          const areaIds = areas.map(a => a.id);
          const { data: subDomains } = await adminClient
            .from("sub_domains")
            .select("id, name, proficiency_area_id")
            .in("proficiency_area_id", areaIds)
            .eq("is_active", true)
            .order("display_order");
          const sdIds = (subDomains ?? []).map(s => s.id);
          const { data: specialities } = await adminClient
            .from("specialities")
            .select("id, name, sub_domain_id")
            .in("sub_domain_id", sdIds.length > 0 ? sdIds : ["__none__"])
            .eq("is_active", true)
            .order("display_order");
          taxonomyContext = `\n\nAVAILABLE TAXONOMY (only use IDs and names from this list):\n`;
          taxonomyContext += `PROFICIENCY AREAS:\n${(areas ?? []).map(a => `  - id:"${a.id}" name:"${a.name}"`).join("\n")}\n`;
          taxonomyContext += `SUB-DOMAINS:\n${(subDomains ?? []).map(s => `  - id:"${s.id}" name:"${s.name}" (area: ${s.proficiency_area_id})`).join("\n")}\n`;
          taxonomyContext += `SPECIALITIES:\n${(specialities ?? []).map(s => `  - id:"${s.id}" name:"${s.name}" (sub_domain: ${s.sub_domain_id})`).join("\n")}\n`;
        }
      }
      userPrompt += `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON object with keys: "proficiency_areas", "sub_domains", "specialities". Each is an array of objects with "id" and "name" keys. Only use IDs from the taxonomy below.${taxonomyContext}\n\nExample: {"proficiency_areas":[{"id":"uuid","name":"Area Name"}],"sub_domains":[{"id":"uuid","name":"SD Name"}],"specialities":[{"id":"uuid","name":"Spec Name"}]}`;
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
          { role: "system", content: getSystemPrompt(resolvedRoleContext) },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded. Please wait and try again." } }),
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
    const content = result.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ success: true, data: { section_key, refined_content: content } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refine-challenge-section error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
