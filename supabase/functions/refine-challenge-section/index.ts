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
]);

/** Map section keys to their format type for prompt building */
const SECTION_FORMAT_MAP: Record<string, string> = {
  problem_statement: 'rich_text', scope: 'rich_text', hook: 'rich_text',
  deliverables: 'line_items', expected_outcomes: 'line_items', submission_guidelines: 'line_items',
  evaluation_criteria: 'table', reward_structure: 'table', affected_stakeholders: 'table',
  phase_schedule: 'schedule_table',
  complexity: 'checkbox_single', ip_model: 'checkbox_single', maturity_level: 'checkbox_single',
  eligibility: 'checkbox_multi', visibility: 'checkbox_multi',
  domain_tags: 'tag_input', solver_expertise: 'custom',
  context_and_background: 'rich_text', root_causes: 'line_items',
  current_deficiencies: 'line_items',
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
- For master-data selection sections (eligibility, visibility, ip_model, maturity_level, complexity, challenge_visibility), return ONLY the code values from the provided allowed options. Never invent new codes.`;
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
      { code: "IP-EA", label: "Exclusive Assignment", description: "All intellectual property transfers to the challenge seeker" },
      { code: "IP-NEL", label: "Non-Exclusive License", description: "Solver retains ownership, grants license to seeker" },
      { code: "IP-EL", label: "Exclusive License", description: "Solver grants exclusive license to seeker" },
      { code: "IP-JO", label: "Joint Ownership", description: "Joint ownership between solver and seeker" },
      { code: "IP-NONE", label: "No IP Transfer", description: "Solver retains full IP ownership" },
    ],
    maturity_level: [
      { code: "BLUEPRINT", label: "Blueprint", description: null },
      { code: "POC", label: "Proof of Concept", description: null },
      { code: "PROTOTYPE", label: "Prototype", description: null },
      { code: "PILOT", label: "Pilot", description: null },
      { code: "PRODUCTION", label: "Production", description: null },
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { challenge_id, section_key, current_content, curator_instructions, issues, context, role_context } = await req.json();

    // Accept either curator_instructions (manual) or issues (Phase 2 auto)
    if (!challenge_id || !section_key || (!curator_instructions && (!issues || issues.length === 0))) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id, section_key, and either curator_instructions or issues are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasPhase1Issues = Array.isArray(issues) && issues.length > 0;

    const resolvedRoleContext = ["intake", "spec", "curation"].includes(role_context) ? role_context : "curation";

    const contextParts: string[] = [];
    if (context?.title) contextParts.push(`Challenge Title: ${context.title}`);
    if (context?.maturity_level) contextParts.push(`Maturity Level: ${context.maturity_level}`);
    const domainTags = Array.isArray(context?.domain_tags) ? context.domain_tags : (typeof context?.domain_tags === 'string' ? JSON.parse(context.domain_tags || '[]') : []);
    if (domainTags.length) contextParts.push(`Domain Tags: ${domainTags.join(", ")}`);
    if (context?.complexity) contextParts.push(`Complexity: ${context.complexity}`);
    if (context?.scope) contextParts.push(`Scope: ${context.scope}`);
    if (context?.deliverables?.length) contextParts.push(`Deliverables (${context.deliverables.length}): ${JSON.stringify(context.deliverables)}`);
    if (context?.evaluation_criteria?.length) contextParts.push(`Evaluation Criteria: ${context.evaluation_criteria.join(", ")}`);
    
    if (context?.industry) contextParts.push(`Industry: ${context.industry}`);
    if (context?.reward_pool) contextParts.push(`Total Reward Pool: ${context.currency || 'USD'} ${context.reward_pool}`);
    if (context?.problem_statement) contextParts.push(`Problem Summary: ${context.problem_statement.slice(0, 500)}`);

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

    let userPrompt: string;

    if (hasPhase1Issues) {
      // Phase 2 minimal prompt — focused on issues
      const sectionFormat = SECTION_FORMAT_MAP[section_key] || 'rich_text';
      userPrompt = `Section: ${section_key}
Section type: ${sectionFormat}

Known issues:
${issues.map((issue: string, i: number) => `${i + 1}. ${issue}`).join("\n")}

Current content:
${typeof current_content === "string" ? current_content : JSON.stringify(current_content, null, 2)}

${contextParts.length > 0 ? `Challenge context:\n${contextParts.join("\n")}\n\n` : ""}Fix the known issues and return ONLY the corrected content.`;
    } else {
      // Legacy manual refinement prompt
      userPrompt = `SECTION: ${section_key}

CURRENT CONTENT:
${typeof current_content === "string" ? current_content : JSON.stringify(current_content, null, 2)}

CHALLENGE CONTEXT:
${contextParts.length > 0 ? contextParts.join("\n") : "No additional context provided."}

${instructionLabel} INSTRUCTIONS (follow these precisely):
${curator_instructions}

Rewrite the section content following the instructions. Return ONLY the refined content, nothing else.`;
    }

    // ── Extended Brief subsection-specific format instructions ──
    const EB_FORMAT_INSTRUCTIONS: Record<string, string> = {
      root_causes: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of short phrase strings. Each item is a cause label, not a description. Max 8 items. Example: ["Timestamp mismatch between WMS and SAP", "No automated detection of reconciliation errors"]`,
      affected_stakeholders: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of row objects with keys: "stakeholder_name", "role", "impact_description" (max 100 chars), "adoption_challenge" (max 100 chars). Always populate adoption_challenge. Example: [{"stakeholder_name":"Warehouse Team","role":"End User","impact_description":"Manual reconciliation","adoption_challenge":"Resistance to new workflows"}]`,
      current_deficiencies: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of current-state observation phrases. Max 10 items. Each item must state a factual observation, not a wish. Example: ["Manual reconciliation produces 47 discrepancies weekly"]`,
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
        } else if (section_key === "ip_model") {
          userPrompt += `\n\nCRITICAL FORMAT REQUIREMENT: You MUST return ONLY a single code string (no quotes, no JSON) from the allowed options below.

SELECTION GUIDELINES — analyze the challenge context to pick the most appropriate IP model:
- "IP-EA" (Exclusive Assignment): Best when the seeker needs full ownership — e.g., proprietary algorithms, trade secrets, solutions that will be commercialized exclusively by the seeker.
- "IP-NEL" (Non-Exclusive License): Best when the solver's methodology has broad applicability and the seeker only needs usage rights — e.g., consulting frameworks, analytical models, open research.
- "IP-EL" (Exclusive License): Best when the seeker needs exclusive usage but the solver retains underlying ownership — e.g., specialized software, patentable inventions where the solver may license to non-competing industries later.
- "IP-JO" (Joint Ownership): Best for collaborative R&D where both parties contribute significant IP — e.g., co-developed technology, joint research initiatives.
- "IP-NONE" (No IP Transfer): Best for advisory/consulting challenges where the solver provides recommendations, assessments, or reviews — no tangible IP is created.

Consider: (1) What deliverables are being produced? Tangible IP (code, designs, patents) → lean toward EA or EL. Intangible (advice, analysis) → lean toward NONE or NEL. (2) Maturity level: Blueprint/POC → often NEL or NONE. Prototype/Pilot/Production → often EA or EL. (3) Reward size: Higher rewards justify stronger IP transfer expectations.

ALLOWED OPTIONS:\n${optionsList}\n\nExample output: IP-EA`;
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
        reward_structure: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON object with this structure:
{
  "type": "monetary" | "non_monetary" | "both",
  "monetary": {
    "tiers": { "platinum": <amount>, "gold": <amount>, "silver": <amount> },
    "currency": "<ISO currency code>",
    "justification": "<2-3 sentences explaining pricing rationale based on maturity, complexity, and Big-4 benchmark>"
  },
  "nonMonetary": {
    "items": ["<domain-specific item 1>", "<domain-specific item 2>", ...]
  }
}

PRICING METHODOLOGY (MANDATORY — follow these rules precisely):

1. MATURITY-STAGE BASE PRICING (approximate 50% of Big-4 consulting rates):
   - BLUEPRINT (conceptual/strategic work): Big-4 charges $50K-$200K → suggest $15K-$75K
   - POC (proof of concept/feasibility): Big-4 charges $100K-$500K → suggest $30K-$150K
   - PROTOTYPE (working demonstration): Big-4 charges $150K-$600K → suggest $50K-$200K
   - PILOT (real-world deployment): Big-4 charges $200K-$1M → suggest $75K-$300K
   - PRODUCTION (full implementation): Big-4 charges $500K-$2M → suggest $150K-$500K
   Start with the midpoint of the range for the given maturity level.

2. COMPLEXITY MULTIPLIER (applied to base):
   - Low complexity: 0.6x
   - Medium complexity: 1.0x
   - High complexity: 1.5x
   - Expert complexity: 2.0x

3. DELIVERABLE SCALING: For each deliverable beyond 3, increase total pool by 10-15%.

4. EFFORT LEVEL ADJUSTMENT: Low=0.7x, Medium=1.0x, High=1.3x, Expert=1.6x (compound with complexity).

5. IF A REWARD POOL IS ALREADY SET: Use that exact amount. Only redistribute across tiers.

6. TIER DISTRIBUTION:
   - Pool > $50K: 3 tiers — Platinum 50-60%, Gold 25-30%, Silver 15-20%
   - Pool $10K-$50K: 2 tiers — Platinum 65%, Gold 35%
   - Pool < $10K: 1 tier — Platinum 100%
   Use round numbers (nearest $500 or $1,000).

7. CURRENCY: Use challenge currency from context. Default to USD if not specified.

NON-MONETARY REWARDS (MANDATORY — domain-specific, innovative):
- NEVER suggest generic items like "certificate", "trophy", "medal", or "plaque"
- Must be directly relevant to the challenge industry/domain
- Technology domain: cloud credits, dev tool licenses, tech conference sponsorship, CTO advisory sessions, startup incubator access
- Business Strategy: co-authorship on published case study, advisory board seat, investor/VC introduction, executive mentorship
- Healthcare: clinical trial partnership, regulatory advisory session, medical journal co-publication, research grant access
- Manufacturing: factory floor pilot partnership, supply chain optimization tools, industry expo speaking slot
- Finance: fintech sandbox access, regulatory compliance consultation, industry report co-authorship
- General: pilot deployment partnership, IP licensing opportunity, co-branded publication, conference keynote slot, expert network membership
- Suggest 3-5 items that would genuinely attract top-tier solvers in the specific domain
- ALWAYS include the nonMonetary key with at least 3 items

Return ONLY the JSON object. No markdown, no explanation.`,
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
          { role: "system", content: getSystemPrompt(resolvedRoleContext, hasPhase1Issues ? issues : undefined) },
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
