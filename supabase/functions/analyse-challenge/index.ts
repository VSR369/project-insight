/**
 * analyse-challenge — Unified Pass 1: ONE AI call to analyse ALL sections.
 *
 * Returns overall assessment + per-section status, comments, cross-section issues.
 * No suggestions generated — that's Pass 2 (generate-suggestions).
 *
 * Replaces the wave-by-wave Pass 1 calls to review-challenge-sections.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildUnifiedContext } from "../_shared/buildUnifiedContext.ts";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";
import { safeJsonParse } from "../_shared/safeJsonParse.ts";
import { buildContextIntelligence, detectDomainFrameworks, INTELLIGENCE_DIRECTIVE } from "../review-challenge-sections/contextIntelligence.ts";
import { buildIndustryIntelligence, buildGeographyContext } from "../review-challenge-sections/industryGeoPrompt.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = crypto.randomUUID().substring(0, 8);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required", correlationId } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify auth
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

    // ── Build unified context ──
    const ctx = await buildUnifiedContext(challenge_id, correlationId);

    // ── Build section content document ──
    const sectionConfigs = ctx.sectionConfigs as { section_key: string; section_label: string; section_description: string | null; importance_level: string; required_elements: string[]; quality_criteria: unknown }[];
    const eb = ctx.extendedBrief;
    const ch = ctx.challenge;

    // Map all section content
    const sectionContentLines: string[] = [];
    const sectionListLines: string[] = [];

    for (const config of sectionConfigs) {
      const key = config.section_key;
      // Try direct column first, then extended_brief
      let content = ch[key] ?? eb[key] ?? null;
      if (content === null || content === undefined) {
        // Check JSONB field mapping
        const ebKey = key.replace(/-/g, '_');
        content = eb[ebKey] ?? null;
      }

      const displayContent = content
        ? (typeof content === 'string' ? stripHtml(content) : jsonBrief(content))
        : '(empty — not yet filled)';

      sectionListLines.push(`${config.section_label} [${config.importance_level}]: ${config.section_description ?? key}`);
      sectionContentLines.push(`### ${config.section_label} (${key})\n${displayContent}`);
    }

    // ── Build intelligence layers ──
    const domainTags = Array.isArray(ch.domain_tags) ? ch.domain_tags : [];
    const frameworks = detectDomainFrameworks(
      domainTags.map((t: unknown) => typeof t === 'object' && t !== null ? (t as Record<string, unknown>).name as string : String(t)),
      ch.problem_statement as string,
      ch.scope as string,
    );

    const contextIntelligence = buildContextIntelligence(ch, {
      maturityLevel: ch.maturity_level,
      complexityLevel: ch.complexity_level,
      solutionType: ch.solution_type,
    }, ctx.org);

    const industryIntelligence = ctx.industryPack ? buildIndustryIntelligence(ctx.industryPack) : '';
    const geoIntelligence = ctx.geoContext ? buildGeographyContext(ctx.geoContext) : '';

    // ── Master data constraints ──
    const masterDataBlock = Object.entries(ctx.masterData)
      .map(([key, options]) => `${key}: ${options.map(o => `${o.code} (${o.label})`).join(', ')}`)
      .join('\n');

    // ── Build the prompt ──
    const systemPrompt = `${INTELLIGENCE_DIRECTIVE}

${contextIntelligence}

${industryIntelligence}

${geoIntelligence}

${frameworks.length > 0 ? `## RELEVANT FRAMEWORKS\n${frameworks.join(', ')}` : ''}

## MASTER DATA CONSTRAINTS
When reviewing master-data-backed sections (maturity_level, ip_model, eligibility, visibility, solution_type), 
the section MUST use ONLY codes from these allowed values:
${masterDataBlock}

${ctx.contextDigest ? `## CONTEXT DIGEST (from verified external sources)\n${ctx.contextDigest.substring(0, 3000)}` : ''}

## YOUR TASK: COMPREHENSIVE CHALLENGE ANALYSIS

Analyze ALL sections of this challenge holistically. For each section:
1. Assess quality, completeness, industry-appropriateness, and cross-section consistency
2. Identify specific gaps, errors, and improvement opportunities
3. Flag cross-section dependencies (e.g., deliverables must align with evaluation criteria)

SECTIONS TO REVIEW:
${sectionListLines.join('\n')}

Return a JSON object with this EXACT structure:
{
  "overall_assessment": {
    "score": <number 0-100>,
    "readiness": "ready" | "needs_work" | "major_gaps",
    "summary": "<2-3 sentence overall assessment>",
    "cross_section_issues": [
      { "sections": ["section_a", "section_b"], "issue": "<description>", "severity": "error" | "warning" }
    ]
  },
  "sections": {
    "<section_key>": {
      "status": "pass" | "warning" | "needs_revision",
      "score": <number 0-100>,
      "comments": [
        { "type": "error" | "warning" | "suggestion" | "strength" | "best_practice", "text": "<specific actionable comment>" }
      ],
      "dependency_gaps": ["<related section key that has inconsistency>"],
      "industry_alignment": "<brief note on industry-specific considerations>"
    }
  }
}

CRITICAL RULES:
- Every section MUST appear in the response
- Comments must be SPECIFIC and ACTIONABLE — reference domain knowledge
- "pass" sections still get 1-2 "strength" or "best_practice" comments
- Cross-section issues MUST flag real inconsistencies (not generic advice)
- Empty sections get "needs_revision" with a comment explaining what's needed
- DO NOT include any "suggestion" field — this is analysis only`;

    const userPrompt = `# CHALLENGE: ${ch.title}

## SECTION CONTENTS

${sectionContentLines.join('\n\n')}

## LEGAL DOCUMENTS
${ctx.legalDocs.length > 0
  ? ctx.legalDocs.map((d: Record<string, unknown>) => `- ${d.document_type} (${d.tier}): ${d.status}`).join('\n')
  : '(no legal docs attached)'}

${ctx.rateCard ? `## RATE CARD\nEffort floor: $${(ctx.rateCard as Record<string, unknown>).effort_rate_floor}/hr, Reward floor: $${(ctx.rateCard as Record<string, unknown>).reward_floor_amount}` : ''}

Analyze this challenge now. Return ONLY the JSON object.`;

    console.log(`[${correlationId}] Calling AI for analysis (${sectionConfigs.length} sections)`);

    const model = ctx.globalConfig?.critical_model as string || ctx.globalConfig?.default_model as string || 'google/gemini-3-flash-preview';
    const aiResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 12000,
      temperature: 0.2,
    }, model);

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "AI_CREDITS_EXHAUSTED", message: "AI credits exhausted", correlationId } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "AI_RATE_LIMITED", message: "Rate limited — try again shortly", correlationId } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI returned ${status}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<Record<string, unknown>>(rawContent, {});

    console.log(`[${correlationId}] AI analysis complete. Overall score: ${(parsed.overall_assessment as Record<string, unknown>)?.score ?? 'N/A'}`);

    // ── Convert to SectionReview[] format for compatibility ──
    const sections = (parsed.sections ?? {}) as Record<string, Record<string, unknown>>;
    const reviews: Record<string, unknown>[] = [];

    for (const [sectionKey, sectionResult] of Object.entries(sections)) {
      reviews.push({
        section_key: sectionKey,
        status: sectionResult.status ?? 'needs_revision',
        score: sectionResult.score ?? 0,
        comments: sectionResult.comments ?? [],
        dependency_gaps: sectionResult.dependency_gaps ?? [],
        industry_alignment: sectionResult.industry_alignment ?? null,
        reviewed_at: new Date().toISOString(),
        addressed: false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          overall_assessment: parsed.overall_assessment ?? { score: 0, readiness: 'major_gaps', summary: 'Analysis failed to parse' },
          reviews,
          correlationId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(`[${correlationId}] analyse-challenge ERROR:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "ANALYSIS_FAILED",
          message: err instanceof Error ? err.message : "Unknown error",
          correlationId,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
