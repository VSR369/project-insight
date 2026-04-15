/**
 * discover-context-resources — 5-phase real web search + AI relevance scoring.
 *
 * PHASE 1: LLM generates targeted search queries from challenge context + gaps
 * PHASE 2: Serper API executes searches → real URLs with real snippets
 * PHASE 3: HEAD accessibility pre-check per URL — skip blocked/paywalled
 * PHASE 4: LLM scores relevance of accessible URLs (reads real snippets)
 * PHASE 5: Insert sources — auto-accept high-confidence, suggest the rest
 *
 * P4 FIX: Accept gap_sections from Pass 1 analysis for targeted discovery
 * P4 FIX: Include organization tab context in discovery prompts
 * P4 FIX: Set extraction_quality column on insert
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";
import { safeJsonParse } from "../_shared/safeJsonParse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SERPER_URL = "https://google.serper.dev/search";
const AUTO_ACCEPT_CONFIDENCE = 0.85;

const PAYWALL_DOMAINS = [
  "gartner.com", "mckinsey.com", "hbr.org", "wsj.com", "ft.com",
  "bloomberg.com", "reuters.com/plus", "statista.com", "forrester.com",
  "idc.com", "bcg.com/publications", "bain.com/insights",
];

function isKnownPaywall(url: string): boolean {
  const lower = url.toLowerCase();
  return PAYWALL_DOMAINS.some(d => lower.includes(d));
}

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

function extractGapMap(aiReviews: unknown): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!Array.isArray(aiReviews)) return map;
  for (const r of aiReviews) {
    if (!r?.section_key) continue;
    const comments = (r.comments ?? [])
      .filter((c: { type?: string }) => ["error", "warning", "suggestion"].includes(c.type ?? ""))
      .map((c: { text?: string }) => c.text)
      .filter(Boolean);
    if (comments.length > 0) map[r.section_key] = comments.slice(0, 3);
  }
  return map;
}

/**
 * P4 FIX: Build comprehensive challenge context including Organization tab fields.
 * Organization context is now first-class — included in discovery prompts.
 */
function buildChallengeContext(
  ch: Record<string, unknown>,
  eb: Record<string, unknown>,
  org: Record<string, unknown> | null,
): string {
  const lines: string[] = [];

  // P4: Organization context (Tab 1) — now first-class
  if (org) {
    const orgParts: string[] = [];
    if (org.organization_name) orgParts.push(`Name: ${org.organization_name}`);
    if (org.organization_description) orgParts.push(`Description: ${brief(org.organization_description as string, 400)}`);
    if (org.website_url) orgParts.push(`Website: ${org.website_url}`);
    if (org.hq_city) orgParts.push(`HQ: ${org.hq_city}${org.hq_country_id ? `, ${org.hq_country_id}` : ''}`);
    if (org.operating_model) orgParts.push(`Operating Model: ${org.operating_model}`);
    if (orgParts.length > 0) lines.push(`ORGANIZATION:\n${orgParts.join("\n")}`);
  }

  if (ch.problem_statement) lines.push(`PROBLEM:\n${brief(stripHtml(ch.problem_statement), 600)}`);
  if (ch.scope) lines.push(`SCOPE:\n${brief(stripHtml(ch.scope), 400)}`);
  if (ch.expected_outcomes) lines.push(`OUTCOMES:\n${brief(stripHtml(ch.expected_outcomes), 400)}`);
  if (eb.context_background) lines.push(`CONTEXT:\n${brief(stripHtml(eb.context_background as string), 400)}`);
  if (eb.root_causes) lines.push(`ROOT CAUSES:\n${brief(safeJson(eb.root_causes), 300)}`);
  if (eb.current_deficiencies) lines.push(`DEFICIENCIES:\n${brief(stripHtml(eb.current_deficiencies as string), 300)}`);
  if (eb.preferred_approach) lines.push(`APPROACH:\n${brief(stripHtml(eb.preferred_approach as string), 300)}`);
  if (ch.deliverables) lines.push(`DELIVERABLES:\n${brief(safeJson(ch.deliverables), 400)}`);
  if (ch.success_metrics_kpis) lines.push(`KPIs:\n${brief(safeJson(ch.success_metrics_kpis), 300)}`);
  if (ch.solver_expertise_requirements) lines.push(`EXPERTISE:\n${brief(safeJson(ch.solver_expertise_requirements), 300)}`);
  return lines.join("\n\n");
}

// ─── PHASE 2: Serper API search ──────────────────────────────────────────────

interface SerperResult { title: string; url: string; snippet: string; position: number; }

async function runSerperSearch(query: string, apiKey: string): Promise<SerperResult[]> {
  try {
    const resp = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5, gl: "us", hl: "en" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.organic ?? []).map((r: Record<string, unknown>) => ({
      title: (r.title as string) ?? "",
      url: (r.link as string) ?? "",
      snippet: (r.snippet as string) ?? "",
      position: (r.position as number) ?? 99,
    }));
  } catch { return []; }
}

// ─── PHASE 3: Accessibility check ────────────────────────────────────────────

type AccessStatus = "accessible" | "blocked" | "paywall" | "failed";

async function checkAccessibility(url: string): Promise<AccessStatus> {
  if (isKnownPaywall(url)) return "paywall";
  try {
    const headResp = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CogniblendBot/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (headResp.status === 200 || headResp.status === 301 || headResp.status === 302) return "accessible";
    if (headResp.status === 402) return "paywall";

    if (headResp.status === 403 || headResp.status === 405 || headResp.status === 406) {
      try {
        const getResp = await fetch(url, {
          method: "GET",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CogniblendBot/1.0)" },
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        await getResp.text();
        if (getResp.status === 200) return "accessible";
        if (getResp.status === 401 || getResp.status === 403) return "blocked";
        if (getResp.status === 402) return "paywall";
        return "failed";
      } catch { return "failed"; }
    }

    if (headResp.status === 401 || headResp.status === 407) return "blocked";
    return "failed";
  } catch { return "failed"; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // P4 FIX: Accept gap_sections from Pass 1 analysis
    const { challenge_id, scope, gap_sections } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");

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

    // ── Fetch challenge + org + segment ──────────────────────────────────────
    const { data: challenge, error: chErr } = await adminClient
      .from("challenges")
      .select(`
        title, problem_statement, scope, expected_outcomes,
        deliverables, evaluation_criteria, reward_structure, ip_model,
        maturity_level, solution_type, complexity_level, complexity_score,
        solver_expertise_requirements, success_metrics_kpis,
        data_resources_provided, domain_tags, currency_code,
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

    // P4 FIX: Fetch expanded org data including website_url & operating_model
    const [orgRes, segRes] = await Promise.all([
      adminClient.from("seeker_organizations")
        .select("organization_name, hq_city, hq_country_id, organization_description, website_url, operating_model")
        .eq("id", challenge.organization_id).single(),
      challenge.industry_segment_id
        ? adminClient.from("industry_segments").select("name, code").eq("id", challenge.industry_segment_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const org = orgRes.data as Record<string, unknown> | null;
    const seg = (segRes as Record<string, unknown>).data as Record<string, unknown> | null;
    const industryName = (seg?.name as string) ?? "general business";
    const orgName = (org?.organization_name as string) ?? "organization";
    const city = (org?.hq_city as string) ?? "global";

    const eb: Record<string, unknown> = (() => {
      if (!challenge.extended_brief) return {};
      if (typeof challenge.extended_brief === "object") return challenge.extended_brief as Record<string, unknown>;
      try { return JSON.parse(challenge.extended_brief as string); } catch { return {}; }
    })();

    // P4 FIX: Pass org into buildChallengeContext
    const challengeContextBlock = buildChallengeContext(challenge as unknown as Record<string, unknown>, eb, org);
    const gapMap = extractGapMap(challenge.ai_section_reviews);

    // P4 FIX: Merge gap_sections from Pass 1 into gapMap
    if (Array.isArray(gap_sections)) {
      for (const gs of gap_sections) {
        const key = (gs as Record<string, unknown>)?.section_key as string;
        const gaps = (gs as Record<string, unknown>)?.gaps as string[];
        if (key && Array.isArray(gaps) && gaps.length > 0 && !gapMap[key]) {
          gapMap[key] = gaps.slice(0, 3);
        }
      }
    }

    const gapLines = Object.entries(gapMap).map(([sec, gaps]) => `• ${sec}: ${gaps.join(" | ")}`).join("\n");

    const domainTags = Array.isArray(challenge.domain_tags) ? challenge.domain_tags : [];
    const primaryDomain = (domainTags[0] as Record<string, unknown>)?.name as string
      || (typeof domainTags[0] === "string" ? domainTags[0] : "technology");

    // ── Discovery directives ────────────────────────────────────────────────
    const { data: configs } = await adminClient
      .from("ai_review_section_config")
      .select("section_key, discovery_directives")
      .eq("role_context", "curation")
      .eq("is_active", true);

    const activeDirectives = (configs ?? []).filter((c: Record<string, unknown>) => {
      const d = c.discovery_directives as Record<string, unknown> | null;
      if (!d || d.skip_discovery) return false;
      if (scope && scope !== "all" && c.section_key !== scope) return false;
      return true;
    });

    // ── Fetch existing accepted URLs to deduplicate ──────────────────────────
    const { data: existing } = await adminClient
      .from("challenge_attachments")
      .select("source_url")
      .eq("challenge_id", challenge_id)
      .not("source_url", "is", null);
    const existingUrls = new Set(
      (existing ?? []).map((a: Record<string, unknown>) =>
        (a.source_url as string)?.toLowerCase().replace(/\/+$/, "")
      )
    );

    // D2 FIX: Only clear stale SUGGESTED AI sources, preserve accepted ones
    await adminClient.from("challenge_attachments").delete()
      .eq("challenge_id", challenge_id)
      .eq("discovery_source", "ai_suggested")
      .eq("discovery_status", "suggested");

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 — LLM generates targeted search queries
    // ════════════════════════════════════════════════════════════════════════

    const queryGenPrompt = `You are a senior research librarian building search queries for an innovation challenge.

CHALLENGE: "${challenge.title}"
ORGANIZATION: ${orgName} | ${industryName} | ${city}
DOMAIN: ${primaryDomain}
SOLUTION TYPE: ${challenge.solution_type || "innovation"} | MATURITY: ${challenge.maturity_level || "proof_of_concept"}

CHALLENGE CONTENT:
${challengeContextBlock}

${gapLines ? `GAPS TO ADDRESS (from Pass 1 analysis):\n${gapLines}\n` : ""}
SECTIONS NEEDING SOURCES: ${activeDirectives.map((d: Record<string, unknown>) => d.section_key).join(", ")}

Generate 12–15 highly targeted Google search queries to find FREE, ACCESSIBLE web pages relevant to this challenge.
Aim for DIVERSE sources — vary domains, perspectives, and resource types across queries.
${gapLines ? `\nPRIORITIZE queries that address the identified GAPS. At least 5 queries should directly target gap areas.\n` : ""}
Focus on: .gov sites, academic repositories (arxiv, researchgate), industry associations (IEEE, ISO, NIST), open-access reports, Wikipedia, official documentation, news articles, official product websites.
AVOID queries leading to: Gartner, McKinsey, HBR, Forrester, Statista (paywalled).
${existingUrls.size > 0 ? `\nRE-DISCOVERY RUN: ${existingUrls.size} URLs already exist. Generate DIFFERENT queries — explore alternative terminology, adjacent disciplines, regional sources, and newer publications. Do NOT repeat previous search patterns.\n` : ''}
Return ONLY a JSON array of strings. No other text.`;

    const queryGenResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [{ role: "user", content: queryGenPrompt }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    if (queryGenResp.status === 402) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "AI_CREDITS_EXHAUSTED", message: "AI credits exhausted. Please check your plan or try again later." } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (queryGenResp.status === 429) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "AI_RATE_LIMITED", message: "AI rate limit reached. Please wait a moment and try again." } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let searchQueries: string[] = [];
    if (queryGenResp.ok) {
      const qResult = await queryGenResp.json();
      const rawQ = qResult.choices?.[0]?.message?.content ?? "[]";
      const parsed = safeJsonParse<unknown>(rawQ, []);
      if (Array.isArray(parsed)) {
        searchQueries = parsed.filter((q: unknown) => typeof q === "string").slice(0, 15);
      }
    }

    if (searchQueries.length === 0) {
      searchQueries = [
        `${challenge.title} ${primaryDomain} implementation guide`,
        `${primaryDomain} ${industryName} best practices ${new Date().getFullYear()}`,
        `${primaryDomain} regulatory compliance ${city}`,
        ...Object.keys(gapMap).slice(0, 3).map(sec => `${sec.replace(/_/g, " ")} ${primaryDomain} framework`),
      ];
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2 — Execute searches via Serper API (or Gemini grounding fallback)
    // ════════════════════════════════════════════════════════════════════════

    interface CandidateSource { title: string; url: string; snippet: string; query: string; }
    const candidates: CandidateSource[] = [];
    const seenUrls = new Set<string>();

    if (SERPER_API_KEY) {
      const searchPromises = searchQueries.map(q => runSerperSearch(q, SERPER_API_KEY));
      const searchResults = await Promise.allSettled(searchPromises);

      searchResults.forEach((result, i) => {
        if (result.status !== "fulfilled") return;
        for (const r of result.value) {
          const norm = r.url.toLowerCase().replace(/\/+$/, "");
          if (seenUrls.has(norm) || existingUrls.has(norm) || !r.url.startsWith("http")) continue;
          seenUrls.add(norm);
          candidates.push({ title: r.title, url: r.url, snippet: r.snippet, query: searchQueries[i] });
        }
      });
    } else {
      console.log("SERPER_API_KEY not configured — using Gemini grounding fallback");
      const groundingResp = await callAIWithFallback(LOVABLE_API_KEY, {
        tools: [{ "google_search": {} }],
        messages: [{
          role: "user",
          content: `Search the web and find 15 real, freely accessible URLs about: ${challenge.title}.
Focus on: ${searchQueries.slice(0, 5).join("; ")}.
Return JSON array: [{"title":"...","url":"...","snippet":"..."}]. Only real URLs you found via search.`,
        }],
        max_tokens: 3000,
        temperature: 0.1,
      });

      if (groundingResp.ok) {
        const gResult = await groundingResp.json();
        const groundingMeta = gResult.candidates?.[0]?.groundingMetadata;
        if (groundingMeta?.groundingChunks) {
          for (const chunk of groundingMeta.groundingChunks) {
            const url = chunk.web?.uri ?? "";
            const title = chunk.web?.title ?? "";
            const norm = url.toLowerCase().replace(/\/+$/, "");
            if (!url || seenUrls.has(norm) || existingUrls.has(norm)) continue;
            seenUrls.add(norm);
            candidates.push({ title, url, snippet: title, query: "gemini_grounding" });
          }
        } else {
          const rawContent = gResult.choices?.[0]?.message?.content ?? "[]";
          const parsed = safeJsonParse<unknown[]>(rawContent, []);
          if (Array.isArray(parsed)) {
            for (const r of parsed) {
              const item = r as Record<string, unknown>;
              if (!item.url) continue;
              const norm = (item.url as string).toLowerCase().replace(/\/+$/, "");
              if (seenUrls.has(norm) || existingUrls.has(norm)) continue;
              seenUrls.add(norm);
              candidates.push({ title: (item.title as string) ?? "", url: item.url as string, snippet: (item.snippet as string) ?? "", query: "gemini_grounding" });
            }
          }
        }
      }
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0, auto_accepted: 0, reason: "No search results — check SERPER_API_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3 — Accessibility pre-check
    // ════════════════════════════════════════════════════════════════════════

    interface CheckedCandidate extends CandidateSource { access_status: AccessStatus; }

    const accessChecks = await Promise.allSettled(
      candidates.slice(0, 30).map(async (c): Promise<CheckedCandidate> => ({
        ...c,
        access_status: await checkAccessibility(c.url),
      }))
    );

    const allChecked = accessChecks
      .filter((r): r is PromiseFulfilledResult<CheckedCandidate> => r.status === "fulfilled")
      .map(r => r.value);

    // STRICT: Only persist accessible sources — discard blocked/failed/paywall entirely
    const usable = allChecked.filter(c => c.access_status === "accessible");
    const discardedCount = allChecked.length - usable.length;

    if (usable.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], count: 0, auto_accepted: 0, discarded: discardedCount, reason: "All candidates blocked, failed, or paywalled — none accessible" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 4 — LLM relevance scoring
    // ════════════════════════════════════════════════════════════════════════

    const scoringPrompt = `You are a senior research analyst scoring real web sources for an innovation challenge.

CHALLENGE: "${challenge.title}"
ORGANIZATION: ${orgName} | ${industryName}
DOMAIN: ${primaryDomain}

CHALLENGE CONTEXT:
${challengeContextBlock.substring(0, 2000)}

${gapLines ? `GAPS TO FILL (from Pass 1 analysis):\n${gapLines}\n` : ""}
AVAILABLE SECTIONS: ${activeDirectives.map((d: Record<string, unknown>) => d.section_key).join(", ")}

SOURCES TO SCORE:
${usable.map((c, i) => `[${i + 1}] Title: ${c.title}\nURL: ${c.url}\nSnippet: ${c.snippet}`).join("\n\n")}

Return a JSON array. Include ONLY sources with relevance_score >= 0.5.
Each item:
{
  "index": <1-based>,
  "section_key": "",
  "resource_type": "regulatory|technical_standard|framework_guide|case_study|benchmark_data|research_paper|official_documentation|news_analysis",
  "relevance_score": <0.0-1.0>,
  "relevance_explanation": "<2 sentences>",
  "addresses_gap": ""
}
${gapLines ? `\nBONUS: Sources that address identified GAPS should receive a +0.1 relevance boost.\n` : ""}
Only use section_key from AVAILABLE SECTIONS. Return ONLY valid JSON array.`;

    const scoringResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [{ role: "user", content: scoringPrompt }],
      max_tokens: 4000,
      temperature: 0.1,
    });

    if (scoringResp.status === 402) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "AI_CREDITS_EXHAUSTED", message: "AI credits exhausted during source scoring." } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (scoringResp.status === 429) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "AI_RATE_LIMITED", message: "AI rate limited during source scoring. Try again shortly." } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    interface ScoredSource {
      index: number;
      section_key: string;
      resource_type: string;
      relevance_score: number;
      relevance_explanation: string;
      addresses_gap: string;
    }

    let scored: ScoredSource[] = [];
    if (scoringResp.ok) {
      const sResult = await scoringResp.json();
      const rawS = sResult.choices?.[0]?.message?.content ?? "[]";
      const parsed = safeJsonParse<unknown>(rawS, []);
      if (Array.isArray(parsed)) {
        scored = parsed as ScoredSource[];
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 5 — Insert with extraction_quality + auto-accept
    // ════════════════════════════════════════════════════════════════════════

    const inserted: Array<Record<string, unknown>> = [];
    let autoAcceptedCount = 0;

    for (const s of scored) {
      const source = usable[s.index - 1];
      if (!source) continue;

      const shouldAutoAccept =
        s.relevance_score >= AUTO_ACCEPT_CONFIDENCE &&
        source.access_status === "accessible";

      const discoveryStatus = shouldAutoAccept ? "accepted" : "suggested";
      if (shouldAutoAccept) autoAcceptedCount++;

      const seedContent = [
        `[SEED_CONTENT - PENDING EXTRACTION]`,
        `Title: ${source.title}`,
        `URL: ${source.url}`,
        source.snippet ? `Search snippet: ${source.snippet}` : "",
        `Found via query: ${source.query}`,
        `Access status: ${source.access_status}`,
      ].filter(Boolean).join("\n");

      // P4 FIX: Set extraction_quality to 'seed' on initial insert
      const { data: newAtt, error: insertErr } = await adminClient
        .from("challenge_attachments")
        .insert({
          challenge_id,
          section_key: s.section_key,
          source_type: "url",
          source_url: source.url,
          url_title: source.title.substring(0, 500) || null,
          discovery_source: "ai_suggested",
          discovery_status: discoveryStatus,
          resource_type: s.resource_type || null,
          relevance_explanation: `${s.addresses_gap ? `[Gap: ${s.addresses_gap}] ` : ""}${s.relevance_explanation}`.substring(0, 1000),
          confidence_score: s.relevance_score,
          suggested_sections: [s.section_key],
          extraction_status: "pending",
          extracted_text: seedContent,
          access_status: source.access_status,
          extraction_quality: "seed",
        })
        .select("id")
        .single();

      if (!insertErr && newAtt?.id) {
        // Auto-accepted sources: await extraction (deterministic, not fire-and-forget)
        if (shouldAutoAccept) {
          try {
            const extResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-attachment-text`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ attachment_id: newAtt.id }),
            });
            if (!extResp.ok) {
              console.warn(`Extraction failed for ${newAtt.id}: HTTP ${extResp.status}`);
              await extResp.text(); // consume body
            } else {
              await extResp.text(); // consume body
            }
          } catch (extErr) {
            console.warn(`Extraction error for ${newAtt.id}:`, extErr);
          }
        }

        inserted.push({
          title: source.title, url: source.url,
          section_key: s.section_key, resource_type: s.resource_type,
          relevance_score: s.relevance_score, access_status: source.access_status,
          auto_accepted: shouldAutoAccept,
          addresses_gap: s.addresses_gap || null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true, suggestions: inserted, count: inserted.length,
        auto_accepted: autoAcceptedCount,
        auto_accepted_ids: inserted.filter(i => i.auto_accepted).map(i => i.id).filter(Boolean),
        suggested: inserted.length - autoAcceptedCount,
        discarded: discardedCount,
        candidates_found: candidates.length, accessible_count: usable.length, scored_relevant: scored.length,
        gaps_targeted: Object.keys(gapMap).length,
      }),
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
