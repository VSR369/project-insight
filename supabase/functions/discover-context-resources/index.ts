/**
 * discover-context-resources — AI-powered web search for relevant context sources.
 * Reads discovery_directives from ai_review_section_config, substitutes template variables,
 * calls AI gateway with web search, and inserts suggestions into challenge_attachments.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

    // 1. Fetch challenge data
    const { data: challenge, error: chErr } = await adminClient
      .from("challenges")
      .select("title, problem_statement, scope, domain_tags, maturity_level, solution_type, currency_code, organization_id")
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
      .select("name, industry_segment_id, country, city, website, description")
      .eq("id", challenge.organization_id)
      .single();

    // Get industry segment name and code
    let industryName = "";
    let industryCode = "";
    if (org?.industry_segment_id) {
      const { data: segment } = await adminClient
        .from("industry_segments")
        .select("name, code")
        .eq("id", org.industry_segment_id)
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

    // 4. Filter and sort
    const domainTags = Array.isArray(challenge.domain_tags) ? challenge.domain_tags : [];
    const primaryDomain = (domainTags[0] as any)?.name || (typeof domainTags[0] === "string" ? domainTags[0] : "technology");

    const variableMap: Record<string, string> = {
      "{{domain}}": primaryDomain,
      "{{geography}}": org?.country || "global",
      "{{industry}}": industryName || "industry",
      "{{maturityLevel}}": challenge.maturity_level || "proof_of_concept",
      "{{solution_type}}": challenge.solution_type || "innovation",
      "{{orgName}}": org?.name || "organization",
      "{{currency}}": challenge.currency_code || "USD",
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
      .filter((c: any) => {
        const d = c.discovery_directives;
        if (!d || d.skip_discovery) return false;
        if (scope && scope !== "all" && c.section_key !== scope) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const pa = PRIORITY_ORDER[a.discovery_directives?.priority] ?? 3;
        const pb = PRIORITY_ORDER[b.discovery_directives?.priority] ?? 3;
        return pa - pb;
      });

    if (activeDirectives.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Fetch existing URLs to deduplicate
    const { data: existingAtts } = await adminClient
      .from("challenge_attachments")
      .select("source_url")
      .eq("challenge_id", challenge_id)
      .not("source_url", "is", null);
    const existingUrls = new Set((existingAtts ?? []).map((a: any) => a.source_url?.toLowerCase()));

    // 6. Build AI prompt
    const sectionSpecs = activeDirectives.map((c: any) => {
      const d = c.discovery_directives;
      const resourceTypes = (d.resource_types || []).map((rt: any) => ({
        type: rt.type,
        description: rt.description,
        search_queries: (rt.search_queries || []).map(substituteVars),
        preferred_sources: rt.preferred_sources || [],
        avoid_sources: rt.avoid_sources || [],
      }));
      return `
SECTION: ${c.section_key}
Priority: ${d.priority}
Max resources: ${d.max_resources}
Context: ${d.discovery_context || ""}
Resource types needed:
${resourceTypes.map((rt: any) =>
  `- Type: ${rt.type} — ${rt.description}
   Search queries: ${rt.search_queries.join(" | ")}
   Preferred sources: ${rt.preferred_sources.join(", ") || "any"}
   Avoid: ${rt.avoid_sources.join(", ") || "none"}`
).join("\n")}`;
    }).join("\n\n");

    const systemPrompt = `You are a research analyst finding relevant external resources for an innovation challenge platform.

CHALLENGE: "${challenge.title}"
PROBLEM: ${challenge.problem_statement || "Not specified"}
SCOPE: ${challenge.scope || "Not specified"}
ORGANIZATION: ${org?.name || "Unknown"} (${industryName}, ${org?.country || "global"})
DOMAIN: ${primaryDomain}
MATURITY: ${challenge.maturity_level || "Unknown"}

For each section below, find the most relevant, authoritative external resources.
Return a JSON array of objects with these fields:
- title: Resource title
- url: Full URL
- section_key: Which section this is for
- resource_type: Type of resource (e.g., industry_report, benchmark_data, regulatory)
- relevance_explanation: 2-3 sentences explaining why this is relevant
- confidence_score: 0.0 to 1.0 confidence in relevance

IMPORTANT:
- Only suggest real, accessible URLs from authoritative sources
- Prefer recent publications (2023-2025)
- Do NOT suggest generic blog posts or opinion pieces
- Each URL must be unique
- Maximum total suggestions: ${Math.min(activeDirectives.length * 3, 25)}`;

    const userPrompt = `Find relevant resources for these sections:\n\n${sectionSpecs}\n\nReturn ONLY a valid JSON array. No markdown, no code fences.`;

    // 7. Call AI gateway
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

    // Parse JSON from response (strip markdown fences if present)
    let suggestions: any[] = [];
    try {
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      suggestions = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      console.error("Failed to parse AI suggestions:", rawContent.substring(0, 500));
      suggestions = [];
    }

    // 8. Deduplicate and insert
    const inserted: any[] = [];
    for (const s of suggestions) {
      if (!s.url || !s.section_key) continue;
      const normalizedUrl = s.url.toLowerCase().replace(/\/+$/, "");
      if (existingUrls.has(normalizedUrl)) continue;
      existingUrls.add(normalizedUrl);

      const { error: insertErr } = await adminClient
        .from("challenge_attachments")
        .insert({
          challenge_id,
          section_key: s.section_key,
          source_type: "url",
          source_url: s.url,
          url_title: s.title?.substring(0, 500) || null,
          discovery_source: "ai_suggested",
          discovery_status: "suggested",
          resource_type: s.resource_type || null,
          relevance_explanation: s.relevance_explanation?.substring(0, 1000) || null,
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
  } catch (err: any) {
    console.error("discover-context-resources error:", err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
