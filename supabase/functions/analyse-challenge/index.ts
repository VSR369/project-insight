/**
 * analyse-challenge — Unified Pass 1: ONE AI call to analyse ALL sections.
 * Returns overall assessment + per-section status/comments/cross-section issues.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildUnifiedContext } from "../_shared/buildUnifiedContext.ts";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";
import { safeJsonParse } from "../_shared/safeJsonParse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripHtml(s: unknown): string {
  if (!s || typeof s !== 'string') return '(empty)';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 3000) || '(empty)';
}

function jsonBrief(v: unknown): string {
  if (!v) return '(empty)';
  if (typeof v === 'string') return v.substring(0, 2000);
  try { return JSON.stringify(v).substring(0, 2000); } catch { return '(empty)'; }
}

function buildOrgBlock(org: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`Organization: ${org.orgName ?? '(unknown)'}`);
  if (org.tradeBrand) lines.push(`Brand: ${org.tradeBrand}`);
  if (org.orgDescription) lines.push(`About: ${(org.orgDescription as string).substring(0, 400)}`);
  if (org.orgType) lines.push(`Type: ${org.orgType}`);
  if (org.hqCity || org.hqCountry) lines.push(`HQ: ${[org.hqCity, org.hqCountry].filter(Boolean).join(', ')}`);
  if (org.websiteUrl) lines.push(`Website: ${org.websiteUrl}`);
  if (org.operatingModel) lines.push(`Operating Model: ${org.operatingModel}`);
  const industries = org.industries as { name: string; isPrimary: boolean }[] | undefined;
  if (industries?.length) lines.push(`Industries: ${industries.map(i => i.name).join(', ')}`);
  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = crypto.randomUUID().substring(0, 8);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Auth required", correlationId } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token", correlationId } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { challenge_id } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id required", correlationId } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[${correlationId}] analyse-challenge START for ${challenge_id}`);

    const ctx = await buildUnifiedContext(challenge_id, correlationId);
    const sectionConfigs = ctx.sectionConfigs as { section_key: string; section_label: string; section_description: string | null; importance_level: string }[];
    const eb = ctx.extendedBrief;
    const ch = ctx.challenge;

    const sectionContentLines: string[] = [];
    const sectionListLines: string[] = [];

    for (const config of sectionConfigs) {
      const key = config.section_key;
      let content = ch[key] ?? eb[key] ?? eb[key.replace(/-/g, '_')] ?? null;
      const displayContent = content
        ? (typeof content === 'string' ? stripHtml(content) : jsonBrief(content))
        : '(empty — not yet filled)';
      sectionListLines.push(`${config.section_label} [${config.importance_level}]: ${config.section_description ?? key}`);
      sectionContentLines.push(`### ${config.section_label} (${key})\n${displayContent}`);
    }

    const orgBlock = buildOrgBlock(ctx.org as unknown as Record<string, unknown>);
    const masterDataBlock = Object.entries(ctx.masterData)
      .map(([key, options]) => `${key}: ${options.map(o => `${o.code} (${o.label})`).join(', ')}`)
      .join('\n');

    const dependencyBlock = Object.entries(ctx.sectionDependencyMap)
      .map(([key, info]) => {
        const downstreamStr = info.downstream.length > 0 ? info.downstream.join(', ') : '(none)';
        return `${key}: ${info.strategicRole} → downstream: [${downstreamStr}]`;
      })
      .join('\n');

    const industryBlock = ctx.industryPack
      ? `## INDUSTRY INTELLIGENCE\n${jsonBrief(ctx.industryPack)}`
      : '';
    const geoBlock = ctx.geoContext
      ? `## GEOGRAPHY CONTEXT\n${jsonBrief(ctx.geoContext)}`
      : '';

    const systemPrompt = `## YOUR ROLE: DOMAIN EXPERT CONSULTANT
You are a PRINCIPAL CONSULTANT performing a comprehensive challenge quality review.
For each section, assess content quality, completeness, industry fit, cross-section consistency, and solver comprehension.

## ORGANIZATION CONTEXT
${orgBlock}

${industryBlock}
${geoBlock}

## MASTER DATA CONSTRAINTS
${masterDataBlock}

## SECTION DEPENDENCY MAP
${dependencyBlock}

${ctx.contextDigest ? `## VERIFIED CONTEXT\n${ctx.contextDigest.substring(0, 3000)}` : ''}

## SECTIONS TO REVIEW
${sectionListLines.join('\n')}

Return JSON:
{
  "overall_assessment": {
    "score": <0-100>,
    "readiness": "ready"|"needs_work"|"major_gaps",
    "summary": "<2-3 sentences>",
    "cross_section_issues": [{"sections":["a","b"],"issue":"...","severity":"error"|"warning"}]
  },
  "sections": {
    "<section_key>": {
      "status": "pass"|"warning"|"needs_revision",
      "score": <0-100>,
      "comments": [{"type":"error"|"warning"|"suggestion"|"strength"|"best_practice","text":"..."}],
      "dependency_gaps": [],
      "industry_alignment": "..."
    }
  }
}

RULES: Every section must appear. Comments must be specific and actionable. No "suggestion" field.`;

    const userPrompt = `# CHALLENGE: ${ch.title}\n\n${sectionContentLines.join('\n\n')}\n\n## LEGAL DOCS\n${ctx.legalDocs.length > 0 ? ctx.legalDocs.map((d: Record<string, unknown>) => `- ${d.document_type} (${d.tier}): ${d.status}`).join('\n') : '(none)'}\n\nAnalyze now. Return ONLY JSON.`;

    const model = (ctx.globalConfig?.critical_model ?? ctx.globalConfig?.default_model ?? 'google/gemini-3-flash-preview') as string;
    const aiResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 12000,
      temperature: 0.2,
    }, model);

    if (!aiResp.ok) {
      const s = aiResp.status;
      if (s === 402) return new Response(JSON.stringify({ success: false, error: { code: "AI_CREDITS_EXHAUSTED", message: "Credits exhausted", correlationId } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 429) return new Response(JSON.stringify({ success: false, error: { code: "AI_RATE_LIMITED", message: "Rate limited", correlationId } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI returned ${s}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<Record<string, unknown>>(rawContent, {});

    const sections = (parsed.sections ?? {}) as Record<string, Record<string, unknown>>;
    const reviews: Record<string, unknown>[] = [];
    for (const [sectionKey, sr] of Object.entries(sections)) {
      reviews.push({
        section_key: sectionKey, status: sr.status ?? 'needs_revision', score: sr.score ?? 0,
        comments: sr.comments ?? [], dependency_gaps: sr.dependency_gaps ?? [],
        industry_alignment: sr.industry_alignment ?? null,
        reviewed_at: new Date().toISOString(), addressed: false,
      });
    }

    console.log(`[${correlationId}] Analysis complete. Score: ${(parsed.overall_assessment as Record<string, unknown>)?.score ?? 'N/A'}`);

    return new Response(JSON.stringify({
      success: true,
      data: { overall_assessment: parsed.overall_assessment ?? { score: 0, readiness: 'major_gaps', summary: 'Parse failed' }, reviews, correlationId },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(`[${correlationId}] ERROR:`, err);
    return new Response(JSON.stringify({
      success: false, error: { code: "ANALYSIS_FAILED", message: err instanceof Error ? err.message : "Unknown", correlationId },
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
