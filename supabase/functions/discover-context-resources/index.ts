/**
 * discover-context-resources — AI-powered web search for relevant context sources.
 * Reads discovery_directives from ai_review_section_config, substitutes template variables,
 * calls AI gateway with web search, and inserts suggestions into challenge_attachments.
 * Bug 1+6 fix: Now reads ai_section_reviews to extract Pass 1 gaps for targeted discovery.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Strip HTML tags and collapse whitespace */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract actionable gaps from Pass 1 ai_section_reviews */
function extractGapMap(aiReviews: unknown): Record<string, string[]> {
  const gapMap: Record<string, string[]> = {};
  if (!Array.isArray(aiReviews)) return gapMap;
  for (const review of aiReviews) {
    if (!review?.section_key) continue;
    const actionable = (review.comments ?? [])
      .filter((c: { type?: string }) =>
        c.type === "error" || c.type === "warning" || c.type === "suggestion"
      )
      .map((c: { text?: string }) => c.text)
      .filter(Boolean);
    if (actionable.length > 0) {
      gapMap[review.section_key] = actionable.slice(0, 3);
    }
  }
  return gapMap;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challenge_id, scope } = await req.json();

    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required" } }),
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

    // 1. Fetch challenge data — now includes ai_section_reviews for gap-driven discovery
    const { data: challenge, error: chErr } = await adminClient
      .from("challenges")
      .select("title, problem_statement, scope, domain_tags, maturity_level, solution_type, currency_code, organization_id, industry_segment_id, ai_section_reviews, extended_brief")
      .eq("id", challenge_id)
      .single();
    if (chErr || !challenge) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Challenge not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch org context
    const { data: org } = await adminClient
      .from("seeker_organizations")
      .select("organization_name, industry_segment_id, hq_city, website_url, organization_description")
      .eq("id", challenge.organization_id)
      .single();

    // Get industry segment name and code
    let industryName = "";
    let industryCode = "";
    const segmentId = challenge.industry_segment_id || org?.industry_segment_id;
    if (segmentId) {
      const { data: segment } = await adminClient
        .from("industry_segments")
        .select("name, code")
        .eq("id", segmentId)
        .single();
      industryName = segment?.name ?? "";
      industryCode = segment?.code ?? "";
    }

    // 3. Fetch discovery directives
    const { data: configs } = await adminClient
      .from("ai_review_section_config")
      .select("section_key, discovery_directives")
      .eq("role_context", "curation")
      .eq("is_active", true);

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Extract Pass 1 gaps for targeted discovery (Bug 1 fix)
    const gapMap = extractGapMap(challenge.ai_section_reviews);
    const allGapText = Object.entries(gapMap)
      .map(([sec, comments]) => `${sec}: ${comments.slice(0, 2).join("; ")}`)
      .join("\n");

    // Clean problem_statement and scope (Bug 6 fix)
    const cleanProblem = stripHtml(challenge.problem_statement || "").substring(0, 500);
    const cleanScope = stripHtml(challenge.scope || "").substring(0, 400);

    // 5. Filter and sort
    const domainTags = Array.isArray(challenge.domain_tags) ? challenge.domain_tags : [];
    const primaryDomain = (domainTags[0] as Record<string, unknown>)?.name ||
      (typeof domainTags[0] === "string" ? domainTags[0] : "technology");

    const variableMap: Record<string, string> = {
      "{{domain}}": primaryDomain as string,
      "{{geography}}": org?.hq_city || "global",
      "{{industry}}": industryName || "industry",
      "{{maturityLevel}}": challenge.maturity_level || "proof_of_concept",
      "{{solution_type}}": challenge.solution_type || "innovation",
      "{{orgName}}": org?.organization_name || "organization",
      "{{currency}}": challenge.currency_code || "USD",
      "{{specificGaps}}": allGapText || "general improvement",
      "{{problemStatement}}": cleanProblem || "Not specified",
    };

    function substituteVars(text: string): string {
      let result = text;
      for (const [key, val] of Object.entries(variableMap)) {
        result = result.replaceAll(key, val);
      }
      return result;
    }

    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const activeDirectives = configs
      .filter((c: Record<string, unknown>) => {
        const d = c.discovery_directives as Record<string, unknown> | null;
        if (!d || d.skip_discovery) return false;
        if (scope && scope !== "all" && c.section_key !== scope) return false;
        return true;
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const pa = PRIORITY_ORDER[(a.discovery_directives as Record<string, unknown>)?.priority as string] ?? 3;
        const pb = PRIORITY_ORDER[(b.discovery_directives as Record<string, unknown>)?.priority as string] ?? 3;
        return pa - pb;
      });

    if (activeDirectives.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Phase 11: Merge industry-specific preferred sources into discovery directives
    try {
      if (industryCode) {
        const { data: industryPack } = await adminClient
          .from('industry_knowledge_packs')
          .select('preferred_analyst_sources, regulatory_landscape')
          .eq('industry_code', industryCode)
          .eq('is_active', true)
          .maybeSingle();

        if (industryPack?.preferred_analyst_sources?.length) {
          for (const directive of activeDirectives) {
            const d = (directive as Record<string, unknown>).discovery_directives as Record<string, unknown>;
            if (d?.resource_types) {
              for (const rt of d.resource_types as Record<string, unknown>[]) {
                rt.preferred_sources = [
                  ...new Set([
                    ...((rt.preferred_sources as string[]) || []),
                    ...(industryPack.preferred_analyst_sources as string[]),
                  ]),
                ];
              }
            }
          }
        }
        if (industryPack?.regulatory_landscape) {
          const COUNTRY_TO_REGION: Record<string, string> = {
            IN: 'india', US: 'us', DE: 'eu', FR: 'eu', IT: 'eu', ES: 'eu',
            NL: 'eu', BE: 'eu', SE: 'eu', PL: 'eu', AT: 'eu', IE: 'eu',
            GB: 'uk', AE: 'middle_east', SA: 'middle_east', QA: 'middle_east',
            SG: 'singapore', AU: 'australia', NZ: 'australia',
            JP: 'apac_other', KR: 'apac_other', MY: 'apac_other',
          };
          const countryCode = (org?.hq_city || '').toUpperCase().substring(0, 2);
          const regionCode = COUNTRY_TO_REGION[countryCode] || null;
          const regLandscape = industryPack.regulatory_landscape as Record<string, string[]>;
          const globalRegs = regLandscape.global || [];
          const regionalRegs = regionCode ? (regLandscape[regionCode] || []) : [];
          const regTerms = [...globalRegs, ...regionalRegs].join(', ');
          if (regTerms) {
            for (const directive of activeDirectives) {
              const sKey = (directive as Record<string, unknown>).section_key as string;
              if (['deliverables', 'evaluation_criteria', 'solver_expertise',
                   'submission_guidelines', 'ip_model'].includes(sKey)) {
                const d = (directive as Record<string, unknown>).discovery_directives as Record<string, unknown>;
                d.discovery_context = ((d.discovery_context as string) || '') +
                  ` Relevant regulations: ${regTerms}.`;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Industry source merge failed (non-blocking):', e);
    }

    // 6. Fetch existing URLs to deduplicate
    const { data: existingAtts } = await adminClient
      .from("challenge_attachments")
      .select("source_url")
      .eq("challenge_id", challenge_id)
      .not("source_url", "is", null);
    const existingUrls = new Set((existingAtts ?? []).map((a: Record<string, unknown>) => (a.source_url as string)?.toLowerCase()));

    // 7. Build AI prompt — now gap-driven (Bug 1 fix)
    const sectionSpecs = activeDirectives.map((c: Record<string, unknown>) => {
      const d = c.discovery_directives as Record<string, unknown>;
      const sKey = c.section_key as string;
      const sectionGaps = gapMap[sKey];
      const resourceTypes = ((d.resource_types as Record<string, unknown>[]) || []).map((rt) => ({
        type: rt.type,
        description: rt.description,
        search_queries: ((rt.search_queries as string[]) || []).map(substituteVars),
        preferred_sources: rt.preferred_sources || [],
        avoid_sources: rt.avoid_sources || [],
      }));
      return `
SECTION: ${sKey}
Priority: ${d.priority}
Max resources: ${d.max_resources}
Context: ${d.discovery_context || ""}
${sectionGaps ? `SPECIFIC GAPS FROM AI REVIEW (PRIORITIZE THESE):\n${sectionGaps.map((g: string) => `  - ${g}`).join("\n")}` : ""}
Resource types needed:
${resourceTypes.map((rt) =>
  `- Type: ${rt.type} — ${rt.description}
   Search queries: ${(rt.search_queries as string[]).join(" | ")}
   Preferred sources: ${(rt.preferred_sources as string[]).join(", ") || "any"}
   Avoid: ${(rt.avoid_sources as string[]).join(", ") || "none"}`
).join("\n")}`;
    }).join("\n\n");

    const systemPrompt = `You are a research analyst finding HIGHLY SPECIFIC external resources for this exact challenge.

CHALLENGE: "${challenge.title}"
PROBLEM: ${cleanProblem || "Not specified"}
SCOPE: ${cleanScope || "Not specified"}
ORGANIZATION: ${org?.organization_name || "Unknown"} (${industryName}, ${org?.hq_city || "global"})
DOMAIN TAGS: ${(domainTags as string[]).join(", ")}
MATURITY: ${challenge.maturity_level || "Unknown"}
SOLUTION TYPE: ${challenge.solution_type || "Unknown"}

${allGapText ? `PASS 1 AI REVIEW — SPECIFIC GAPS IDENTIFIED (USE THESE TO GUIDE SEARCH):
${allGapText}

CRITICAL: Your sources must address the SPECIFIC GAPS above, not generic domain topics.
If a gap says "stakeholder impact not quantified", find sources with QUANTIFIED stakeholder data for THIS domain.
If a gap says "KPIs are not measurable", find sources with SPECIFIC, MEASURABLE KPIs for THIS industry/domain.` : "No specific gaps identified — search for general best practices relevant to this challenge."}

For each section below, find the most relevant, authoritative external resources that DIRECTLY ADDRESS the identified gaps.
Return a JSON array of objects with these fields:
- title: Resource title (specific, not generic)
- url: Full URL (must be a REAL, accessible URL)
- section_key: Which section this addresses
- addresses_gap: Which specific gap from the review this source helps resolve (if any)
- resource_type: Type of resource (industry_report|benchmark_data|regulatory|case_study|framework_guide|technical_standard|market_data)
- relevance_explanation: 2-3 sentences explaining EXACTLY how this addresses the flagged gap
- confidence_score: 0.0 to 1.0

RULES:
- Only suggest real, accessible URLs from authoritative sources
- Prefer publications from 2023-2025
- Do NOT suggest generic blog posts or opinion pieces
- Each URL must be unique
- Prioritize sources that resolve the SPECIFIC GAPS over generic domain resources
- Maximum total suggestions: ${Math.min(activeDirectives.length * 3, 30)}`;

    const userPrompt = `Find relevant resources for these sections:\n\n${sectionSpecs}\n\nReturn ONLY a valid JSON array. No markdown, no code fences.`;

    // 8. Call AI gateway
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
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "AI rate limit exceeded. Please try again later." } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response
    let suggestions: Record<string, unknown>[] = [];
    try {
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      suggestions = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      console.error("Failed to parse AI suggestions:", rawContent.substring(0, 500));
      suggestions = [];
    }

    // 9. Deduplicate and insert — include addresses_gap in relevance_explanation
    const inserted: Record<string, unknown>[] = [];
    for (const s of suggestions) {
      if (!s.url || !s.section_key) continue;
      const normalizedUrl = (s.url as string).toLowerCase().replace(/\/+$/, "");
      if (existingUrls.has(normalizedUrl)) continue;
      existingUrls.add(normalizedUrl);

      const gapPrefix = s.addresses_gap ? `[Addresses: ${s.addresses_gap}] ` : "";
      const explanation = `${gapPrefix}${(s.relevance_explanation as string) || ""}`.substring(0, 1000);

      const { error: insertErr } = await adminClient
        .from("challenge_attachments")
        .insert({
          challenge_id,
          section_key: s.section_key,
          source_type: "url",
          source_url: s.url,
          url_title: ((s.title as string) || "").substring(0, 500) || null,
          discovery_source: "ai_suggested",
          discovery_status: (
            typeof s.confidence_score === "number" && s.confidence_score >= 0.85
              ? "accepted"
              : "suggested"
          ),
          resource_type: s.resource_type || null,
          relevance_explanation: explanation || null,
          confidence_score: typeof s.confidence_score === "number" ? Math.min(Math.max(s.confidence_score, 0), 1) : null,
          suggested_sections: [s.section_key],
          extraction_status: "pending",
        });

      if (!insertErr) {
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
