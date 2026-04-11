/**
 * discover-context-resources — Challenge-contextual AI source discovery.
 *
 * FULL CONTEXT APPROACH:
 * - All 27 challenge section fields injected into prompt
 * - Extended brief subsections unpacked
 * - Existing accepted documents + URLs (with extracted text) read as context
 * - Pass 1 AI review comments (gaps) used to target search queries
 * - Stale AI suggestions cleared before each run
 * - Confidence threshold: ≥0.85 auto-accepted, lower = suggested for curator review
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(text: unknown): string {
  if (!text || typeof text !== "string") return "";
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function safeJson(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val.substring(0, 800);
  try { return JSON.stringify(val).substring(0, 800); } catch { return ""; }
}

function brief(text: string, maxLen = 600): string {
  return text.trim().substring(0, maxLen);
}

/** Extract all actionable gaps from Pass 1 ai_section_reviews */
function extractGapMap(aiReviews: unknown): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!Array.isArray(aiReviews)) return map;
  for (const r of aiReviews) {
    if (!r?.section_key) continue;
    const comments = (r.comments ?? [])
      .filter((c: { type?: string }) =>
        c.type === "error" || c.type === "warning" || c.type === "suggestion"
      )
      .map((c: { text?: string }) => c.text)
      .filter(Boolean);
    if (comments.length > 0) map[r.section_key] = comments.slice(0, 3);
  }
  return map;
}

/** Build a rich context block from all challenge sections */
function buildChallengeContext(
  ch: Record<string, unknown>,
  eb: Record<string, unknown>,
): string {
  const lines: string[] = [];

  if (ch.problem_statement) lines.push(`PROBLEM STATEMENT:\n${brief(stripHtml(ch.problem_statement), 800)}`);
  if (ch.scope) lines.push(`SCOPE:\n${brief(stripHtml(ch.scope), 600)}`);
  if (ch.expected_outcomes) lines.push(`EXPECTED OUTCOMES:\n${brief(stripHtml(ch.expected_outcomes), 500)}`);

  if (eb.context_background) lines.push(`CONTEXT & BACKGROUND:\n${brief(stripHtml(eb.context_background), 500)}`);
  if (eb.root_causes) lines.push(`ROOT CAUSES:\n${brief(safeJson(eb.root_causes), 400)}`);
  if (eb.affected_stakeholders) lines.push(`AFFECTED STAKEHOLDERS:\n${brief(safeJson(eb.affected_stakeholders), 400)}`);
  if (eb.current_deficiencies) lines.push(`CURRENT DEFICIENCIES:\n${brief(stripHtml(eb.current_deficiencies), 400)}`);
  if (eb.preferred_approach) lines.push(`PREFERRED APPROACH:\n${brief(stripHtml(eb.preferred_approach), 400)}`);
  if (eb.approaches_not_of_interest) lines.push(`APPROACHES TO AVOID:\n${brief(stripHtml(eb.approaches_not_of_interest), 300)}`);

  if (ch.deliverables) lines.push(`DELIVERABLES:\n${brief(safeJson(ch.deliverables), 600)}`);
  if (ch.success_metrics_kpis) lines.push(`SUCCESS METRICS / KPIs:\n${brief(safeJson(ch.success_metrics_kpis), 500)}`);
  if (ch.data_resources_provided) lines.push(`DATA RESOURCES PROVIDED:\n${brief(safeJson(ch.data_resources_provided), 400)}`);

  if (ch.complexity_level) lines.push(`COMPLEXITY: ${ch.complexity_level} (score: ${ch.complexity_score ?? "N/A"})`);
  if (ch.solver_expertise_requirements) lines.push(`SOLVER EXPERTISE:\n${brief(safeJson(ch.solver_expertise_requirements), 400)}`);

  if (ch.evaluation_criteria) lines.push(`EVALUATION CRITERIA:\n${brief(safeJson(ch.evaluation_criteria), 500)}`);
  if (ch.reward_structure) lines.push(`REWARD STRUCTURE:\n${brief(safeJson(ch.reward_structure), 300)}`);
  if (ch.submission_guidelines) lines.push(`SUBMISSION GUIDELINES:\n${brief(stripHtml(ch.submission_guidelines), 400)}`);
  if (ch.ip_model) lines.push(`IP MODEL: ${ch.ip_model}`);

  return lines.join("\n\n");
}

/** Build context from existing accepted documents and URLs */
function buildExistingSourcesContext(
  attachments: Array<Record<string, unknown>>,
): string {
  if (!attachments.length) return "";
  const blocks = attachments
    .filter(a => a.extracted_summary || a.extracted_text)
    .map((a, i) => {
      const name = (a.url_title || a.file_name || a.source_url || `Source ${i + 1}`) as string;
      const type = a.source_type === "url" ? "URL" : "DOCUMENT";
      const content = (a.extracted_summary ||
        (typeof a.extracted_text === "string" ? a.extracted_text.substring(0, 1000) : "")) as string;
      return `[${type}] ${name} [${a.section_key}]:\n${content}`;
    });
  if (!blocks.length) return "";
  return `\nEXISTING REFERENCE MATERIALS (already uploaded/accepted by curator):\n${blocks.join("\n\n---\n\n").substring(0, 6000)}\n\nIMPORTANT: Do NOT suggest sources that duplicate the above materials. Find COMPLEMENTARY sources that fill gaps these materials don't cover.`;
}

// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challenge_id, scope } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFIG_ERROR", message: "AI gateway not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ── 1. Fetch FULL challenge data ────────────────────────────────────────
    const { data: challenge, error: chErr } = await adminClient
      .from("challenges")
      .select(`
        title, problem_statement, scope, hook, description,
        deliverables, expected_outcomes, submission_guidelines,
        evaluation_criteria, reward_structure, ip_model,
        maturity_level, solution_type, solution_types,
        complexity_level, complexity_score, complexity_parameters,
        solver_expertise_requirements, solver_eligibility_types,
        success_metrics_kpis, data_resources_provided,
        phase_schedule, domain_tags, currency_code,
        operating_model, governance_profile,
        organization_id, industry_segment_id,
        ai_section_reviews, extended_brief
      `)
      .eq("id", challenge_id)
      .single();

    if (chErr || !challenge) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch org context ────────────────────────────────────────────────
    const [orgRes, segmentRes] = await Promise.all([
      adminClient
        .from("seeker_organizations")
        .select("organization_name, industry_segment_id, hq_city, hq_country_id, website_url, organization_description, annual_revenue_range, employee_count_range")
        .eq("id", challenge.organization_id)
        .single(),
      challenge.industry_segment_id
        ? adminClient.from("industry_segments").select("name, code").eq("id", challenge.industry_segment_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const org = orgRes.data as Record<string, unknown> | null;
    const segData = (segmentRes as Record<string, unknown>).data as Record<string, unknown> | null;
    const industryName = (segData?.name as string) ?? "";
    const industryCode = (segData?.code as string) ?? "";

    // ── 3. Fetch discovery directives ───────────────────────────────────────
    const { data: configs } = await adminClient
      .from("ai_review_section_config")
      .select("section_key, discovery_directives")
      .eq("role_context", "curation")
      .eq("is_active", true);

    if (!configs?.length) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0, reason: "No discovery directives configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 4. Extract Pass 1 gaps + challenge section content ──────────────────
    const gapMap = extractGapMap(challenge.ai_section_reviews);
    const hasGaps = Object.keys(gapMap).length > 0;

    const eb: Record<string, unknown> = (() => {
      if (!challenge.extended_brief) return {};
      if (typeof challenge.extended_brief === "object") return challenge.extended_brief as Record<string, unknown>;
      try { return JSON.parse(challenge.extended_brief as string); } catch { return {}; }
    })();

    const challengeContextBlock = buildChallengeContext(challenge as unknown as Record<string, unknown>, eb);

    // ── 5. Fetch existing accepted attachments for context ──────────────────
    const { data: existingAccepted } = await adminClient
      .from("challenge_attachments")
      .select("section_key, source_type, source_url, url_title, file_name, extracted_summary, extracted_text, resource_type")
      .eq("challenge_id", challenge_id)
      .eq("discovery_status", "accepted")
      .eq("extraction_status", "completed")
      .not("extracted_summary", "is", null);

    const existingSourcesContext = buildExistingSourcesContext(
      (existingAccepted ?? []) as Array<Record<string, unknown>>,
    );

    // ── 6. Fetch industry knowledge pack ────────────────────────────────────
    let industryPack: Record<string, unknown> | null = null;
    if (industryCode) {
      const { data: pack } = await adminClient
        .from("industry_knowledge_packs")
        .select("preferred_analyst_sources, regulatory_landscape, common_kpis, technology_landscape")
        .eq("industry_code", industryCode)
        .eq("is_active", true)
        .maybeSingle();
      industryPack = pack as Record<string, unknown> | null;
    }

    // ── 7. Clear stale AI suggestions ───────────────────────────────────────
    await adminClient
      .from("challenge_attachments")
      .delete()
      .eq("challenge_id", challenge_id)
      .eq("discovery_source", "ai_suggested");

    // ── 8. Build variable map for directive templates ────────────────────────
    const domainTags = Array.isArray(challenge.domain_tags) ? challenge.domain_tags : [];
    const primaryDomain = (domainTags[0] as Record<string, unknown>)?.name as string ||
      (typeof domainTags[0] === "string" ? domainTags[0] : "technology");

    const allGapLines = Object.entries(gapMap)
      .map(([sec, comments]) => `• ${sec}: ${comments.join(" | ")}`)
      .join("\n");

    const variableMap: Record<string, string> = {
      "{{domain}}": primaryDomain,
      "{{geography}}": (org?.hq_city as string) || "global",
      "{{industry}}": industryName || "industry",
      "{{maturityLevel}}": challenge.maturity_level || "proof_of_concept",
      "{{solution_type}}": challenge.solution_type || "innovation",
      "{{orgName}}": (org?.organization_name as string) || "organization",
      "{{currency}}": challenge.currency_code || "USD",
    };

    function substituteVars(text: string): string {
      return Object.entries(variableMap).reduce((r, [k, v]) => r.replaceAll(k, v), text);
    }

    // ── 9. Filter + sort directives ─────────────────────────────────────────
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const activeDirectives = (configs as Array<Record<string, unknown>>)
      .filter(c => {
        const d = c.discovery_directives as Record<string, unknown> | null;
        if (!d || d.skip_discovery) return false;
        if (scope && scope !== "all" && c.section_key !== scope) return false;
        return true;
      })
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[(a.discovery_directives as Record<string, unknown>)?.priority as string] ?? 3;
        const pb = PRIORITY_ORDER[(b.discovery_directives as Record<string, unknown>)?.priority as string] ?? 3;
        return pa - pb;
      });

    if (!activeDirectives.length) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Inject industry preferred sources
    if (industryPack?.preferred_analyst_sources) {
      for (const d of activeDirectives) {
        const dir = d.discovery_directives as Record<string, unknown>;
        for (const rt of (dir?.resource_types as Array<Record<string, unknown>>) ?? []) {
          rt.preferred_sources = [...new Set([
            ...((rt.preferred_sources as string[]) ?? []),
            ...(industryPack.preferred_analyst_sources as string[]),
          ])];
        }
      }
    }

    // ── 10. Build per-section specs with CURRENT CONTENT ────────────────────
    const sectionContentMap: Record<string, string> = {
      problem_statement: brief(stripHtml(challenge.problem_statement), 400),
      scope: brief(stripHtml(challenge.scope), 400),
      expected_outcomes: brief(stripHtml(challenge.expected_outcomes), 400),
      deliverables: brief(safeJson(challenge.deliverables), 400),
      evaluation_criteria: brief(safeJson(challenge.evaluation_criteria), 400),
      reward_structure: brief(safeJson(challenge.reward_structure), 300),
      success_metrics_kpis: brief(safeJson(challenge.success_metrics_kpis), 400),
      data_resources_provided: brief(safeJson(challenge.data_resources_provided), 300),
      solver_expertise: brief(safeJson(challenge.solver_expertise_requirements), 300),
      submission_guidelines: brief(stripHtml(challenge.submission_guidelines), 300),
      context_and_background: brief(stripHtml(eb.context_background as string), 400),
      root_causes: brief(safeJson(eb.root_causes), 400),
      affected_stakeholders: brief(safeJson(eb.affected_stakeholders), 300),
      current_deficiencies: brief(stripHtml(eb.current_deficiencies as string), 300),
      preferred_approach: brief(stripHtml(eb.preferred_approach as string), 300),
    };

    const sectionSpecs = activeDirectives.map(c => {
      const d = c.discovery_directives as Record<string, unknown>;
      const sKey = c.section_key as string;
      const sectionGaps = gapMap[sKey];
      const currentContent = sectionContentMap[sKey];
      const resourceTypes = ((d.resource_types as Array<Record<string, unknown>>) || []).map(rt => ({
        type: rt.type,
        description: rt.description,
        search_queries: ((rt.search_queries as string[]) || []).map(substituteVars),
        preferred_sources: rt.preferred_sources || [],
        avoid_sources: rt.avoid_sources || [],
      }));

      return `
SECTION: ${sKey} | Priority: ${d.priority} | Max: ${d.max_resources} sources
${currentContent ? `CURRENT CONTENT IN THIS SECTION:\n"${currentContent}"` : "(section is empty)"}
${sectionGaps ? `AI REVIEW GAPS TO ADDRESS:\n${sectionGaps.map(g => `  ⚠ ${g}`).join("\n")}` : ""}
RESOURCE TYPES NEEDED:
${resourceTypes.map(rt =>
  `  • ${rt.type}: ${rt.description}
    Search: ${(rt.search_queries as string[]).join(" | ")}
    Prefer: ${(rt.preferred_sources as string[]).join(", ") || "any authoritative source"}
    Avoid: ${(rt.avoid_sources as string[]).join(", ") || "none"}`
).join("\n")}`;
    }).join("\n\n---\n");

    // ── 11. Build the AI prompt ─────────────────────────────────────────────
    const industryKpiBlock = industryPack?.common_kpis
      ? `\nINDUSTRY STANDARD KPIs: ${(industryPack.common_kpis as string[]).join(", ")}`
      : "";

    const systemPrompt = `You are a senior research analyst finding HIGHLY SPECIFIC, CONTEXTUAL external resources for an open innovation challenge.

═══ CHALLENGE PROFILE ═══
Title: "${challenge.title}"
Organization: ${(org?.organization_name as string) || "Unknown"} | ${industryName} | ${(org?.hq_city as string) || "global"}
Solution Type: ${challenge.solution_type || "Unknown"} | Maturity: ${challenge.maturity_level || "Unknown"} | Complexity: ${challenge.complexity_level || "Unknown"}
Currency: ${challenge.currency_code || "USD"}${industryKpiBlock}

═══ FULL CHALLENGE CONTENT ═══
${challengeContextBlock}
${existingSourcesContext}

═══ PASS 1 AI REVIEW — GAPS TO FILL ═══
${hasGaps
  ? `These specific issues were flagged in the AI review. Your sources MUST directly address them:\n${allGapLines}`
  : "No specific gaps yet — find best-practice resources relevant to the challenge content above."}

═══ YOUR TASK ═══
Find REAL, ACCESSIBLE, AUTHORITATIVE external URLs that:
1. Are SPECIFIC to this challenge's actual content (not generic domain resources)
2. Directly address the flagged gaps where they exist
3. Come from credible sources (Gartner, McKinsey, IEEE, ISO, regulatory bodies, industry associations)
4. Are recent (2022–2025 preferred)
5. Are NOT paywalled or login-required
6. Do NOT duplicate the existing reference materials listed above

Return a JSON array. Each item:
{
  "title": "Exact page/report title",
  "url": "https://full-url.com/page",
  "section_key": "which section this helps",
  "addresses_gap": "which specific gap this resolves (quote the gap text)",
  "resource_type": "industry_report|benchmark_data|regulatory|case_study|framework_guide|technical_standard|market_data|api_documentation",
  "relevance_explanation": "2-3 sentences explaining EXACTLY how this content helps THIS specific challenge",
  "confidence_score": 0.0
}

CRITICAL RULES:
- confidence_score = how confident you are this URL exists AND is relevant (0.0–1.0)
- DO NOT invent URLs — only suggest real pages you know exist
- If unsure about a URL, set confidence_score < 0.7
- Maximum: ${Math.min(activeDirectives.length * 3, 35)} total sources`;

    const userPrompt = `Find targeted sources for these ${activeDirectives.length} sections:\n\n${sectionSpecs}\n\nReturn ONLY valid JSON array. No markdown fences.`;

    // ── 12. Call AI ─────────────────────────────────────────────────────────
    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 6000,
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) return new Response(JSON.stringify({ success: false, error: { code: "RATE_LIMITED" } }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED" } }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "[]";

    let suggestions: Array<Record<string, unknown>> = [];
    try {
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      suggestions = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.error("Failed to parse AI suggestions:", rawContent.substring(0, 500));
    }

    // ── 13. Fetch dedup set (only manual sources now) ───────────────────────
    const { data: manualAtts } = await adminClient
      .from("challenge_attachments")
      .select("source_url")
      .eq("challenge_id", challenge_id)
      .not("source_url", "is", null);
    const existingUrls = new Set(
      (manualAtts ?? []).map((a: Record<string, unknown>) =>
        (a.source_url as string)?.toLowerCase().replace(/\/+$/, "")
      ),
    );

    // ── 14. Insert suggestions ──────────────────────────────────────────────
    const inserted: Array<Record<string, unknown>> = [];
    for (const s of suggestions) {
      if (!s.url || !s.section_key) continue;
      const normalizedUrl = (s.url as string).toLowerCase().replace(/\/+$/, "");
      if (existingUrls.has(normalizedUrl)) continue;
      existingUrls.add(normalizedUrl);

      const gapNote = s.addresses_gap ? `[Gap: ${s.addresses_gap}] ` : "";
      const explanation = `${gapNote}${s.relevance_explanation || ""}`.substring(0, 1000);
      const score = typeof s.confidence_score === "number"
        ? Math.min(Math.max(s.confidence_score, 0), 1)
        : null;

      const { error: insertErr } = await adminClient
        .from("challenge_attachments")
        .insert({
          challenge_id,
          section_key: s.section_key,
          source_type: "url",
          source_url: s.url,
          url_title: ((s.title as string) || "").substring(0, 500) || null,
          discovery_source: "ai_suggested",
          discovery_status: score !== null && score >= 0.85 ? "accepted" : "suggested",
          resource_type: s.resource_type || null,
          relevance_explanation: explanation || null,
          confidence_score: score,
          suggested_sections: [s.section_key],
          extraction_status: "pending",
        });

      if (!insertErr) {
        if (score !== null && score >= 0.85) {
          adminClient.from("challenge_attachments")
            .select("id").eq("challenge_id", challenge_id)
            .eq("source_url", s.url as string).single()
            .then(({ data: att }) => {
              if (att?.id) {
                fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-attachment-text`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ attachment_id: att.id }),
                }).catch(() => {});
              }
            }).catch(() => {});
        }
        inserted.push({
          title: s.title,
          url: s.url,
          section_key: s.section_key,
          resource_type: s.resource_type,
          confidence_score: s.confidence_score,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, suggestions: inserted, count: inserted.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("discover-context-resources error:", err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
