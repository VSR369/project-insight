/**
 * generate-suggestions — Unified Pass 2: ONE AI call to generate suggestions for ALL sections.
 *
 * Receives Pass 1 reviews + context digest + full challenge context.
 * Returns format-correct suggestions per section.
 *
 * Replaces the wave-by-wave Pass 2 calls to review-challenge-sections.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildUnifiedContext } from "../_shared/buildUnifiedContext.ts";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";
import { safeJsonParse } from "../_shared/safeJsonParse.ts";
// NOTE: Cannot import across function boundaries. Format maps inlined below.

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

    const { challenge_id, pass1_reviews } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id required", correlationId } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[${correlationId}] generate-suggestions START for ${challenge_id}`);

    // ── Build unified context ──
    const ctx = await buildUnifiedContext(challenge_id, correlationId);
    const ch = ctx.challenge;
    const eb = ctx.extendedBrief;

    // ── Determine which sections need suggestions ──
    // Use provided pass1_reviews or load from DB
    let reviews: Record<string, unknown>[] = pass1_reviews ?? [];
    if (reviews.length === 0) {
      const aiReviews = ch.ai_section_reviews;
      if (Array.isArray(aiReviews)) {
        reviews = aiReviews as Record<string, unknown>[];
      }
    }

    // Filter to sections that need suggestions (not pass status)
    const sectionsNeedingSuggestions = reviews.filter((r: Record<string, unknown>) => {
      const status = r.status as string;
      return status === 'needs_revision' || status === 'warning' || status === 'generated';
    });

    if (sectionsNeedingSuggestions.length === 0) {
      console.log(`[${correlationId}] All sections pass — no suggestions needed`);
      return new Response(
        JSON.stringify({ success: true, data: { reviews: [], correlationId, message: "All sections pass — no suggestions needed" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[${correlationId}] Generating suggestions for ${sectionsNeedingSuggestions.length} sections`);

    // ── Build per-section format instructions ──
    const sectionInstructions: string[] = [];
    const sectionConfigs = ctx.sectionConfigs as Record<string, unknown>[];
    const configMap = new Map(sectionConfigs.map(c => [c.section_key as string, c]));

    for (const review of sectionsNeedingSuggestions) {
      const key = review.section_key as string;
      const config = configMap.get(key);
      const format = SECTION_FORMAT_MAP[key] ?? 'rich_text';
      const formatInstruction = EXTENDED_BRIEF_FORMAT_INSTRUCTIONS[key] ?? `Format: ${format}`;

      // Current content
      let content = ch[key] ?? eb[key] ?? null;
      if (!content) {
        const ebKey = key.replace(/-/g, '_');
        content = eb[ebKey] ?? null;
      }
      const currentContent = content
        ? (typeof content === 'string' ? stripHtml(content) : jsonBrief(content))
        : '(empty)';

      const comments = (review.comments as Record<string, unknown>[])?.map(
        (c: Record<string, unknown>) => `[${c.type}] ${c.text}`
      ).join('\n') ?? '';

      sectionInstructions.push(`### ${key} (${config?.section_label ?? key})
STATUS: ${review.status}
CURRENT CONTENT: ${currentContent}
PASS 1 COMMENTS:
${comments}
FORMAT INSTRUCTION: ${formatInstruction}
${config?.dos ? `DO: ${config.dos}` : ''}
${config?.donts ? `DON'T: ${config.donts}` : ''}`);
    }

    // ── Master data constraints ──
    const masterDataBlock = Object.entries(ctx.masterData)
      .map(([key, options]) => `${key}: ${options.map(o => `${o.code} (${o.label})`).join(', ')}`)
      .join('\n');

    // ── Context intelligence ──
    const contextIntelligence = buildContextIntelligence(ch, {
      maturityLevel: ch.maturity_level,
      complexityLevel: ch.complexity_level,
      solutionType: ch.solution_type,
    }, ctx.org);

    // ── System prompt ──
    const systemPrompt = `${INTELLIGENCE_DIRECTIVE}

${contextIntelligence}

## MASTER DATA CONSTRAINTS — HARD RULES
For master-data-backed sections, you MUST use ONLY these codes:
${masterDataBlock}
Any suggestion using a code NOT in this list will be REJECTED.

${ctx.contextDigest ? `## VERIFIED CONTEXT (from external sources)\n${ctx.contextDigest.substring(0, 4000)}` : ''}

## YOUR TASK: GENERATE IMPROVED CONTENT

For each section below, generate an IMPROVED version that addresses ALL Pass 1 comments.
Write from the SEEKING ORGANIZATION'S perspective ("we", "our", "us") — except evaluation_criteria and submission_guidelines which use neutral procedural voice.

CRITICAL RULES:
1. Each section MUST follow its specific FORMAT INSTRUCTION exactly
2. Master-data-backed sections MUST use ONLY allowed codes
3. evaluation_criteria weights MUST sum to exactly 100%
4. phase_schedule dates MUST be in the future relative to today (${new Date().toISOString().split('T')[0]})
5. Preserve any creator-provided intent — improve, don't replace
6. Cross-reference other sections for consistency

Return a JSON object:
{
  "<section_key>": {
    "status": "generated",
    "suggestion": <the improved content in the correct format>,
    "comments": [
      { "type": "strength" | "best_practice", "text": "<what was improved>" }
    ]
  }
}

ONLY include sections that need suggestions. Match the format exactly.`;

    const userPrompt = `# CHALLENGE: ${ch.title}

## SECTIONS NEEDING SUGGESTIONS

${sectionInstructions.join('\n\n---\n\n')}

Generate improved content for ALL sections above. Return ONLY the JSON object.`;

    const model = ctx.globalConfig?.critical_model as string || ctx.globalConfig?.default_model as string || 'google/gemini-3-flash-preview';
    const aiResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 16000,
      temperature: 0.3,
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
          JSON.stringify({ success: false, error: { code: "AI_RATE_LIMITED", message: "Rate limited", correlationId } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI returned ${status}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<Record<string, Record<string, unknown>>>(rawContent, {});

    console.log(`[${correlationId}] AI suggestions generated for ${Object.keys(parsed).length} sections`);

    // ── Merge suggestions into review format ──
    const suggestionReviews: Record<string, unknown>[] = [];

    for (const [sectionKey, sectionResult] of Object.entries(parsed)) {
      const suggestion = sectionResult.suggestion;
      const suggestionStr = typeof suggestion === 'string'
        ? suggestion
        : suggestion ? JSON.stringify(suggestion) : null;

      // Find original review to merge comments
      const originalReview = reviews.find((r: Record<string, unknown>) => r.section_key === sectionKey);

      suggestionReviews.push({
        section_key: sectionKey,
        status: sectionResult.status ?? 'generated',
        comments: [
          ...((originalReview?.comments as unknown[]) ?? []),
          ...((sectionResult.comments as unknown[]) ?? []),
        ],
        suggestion: suggestionStr,
        reviewed_at: new Date().toISOString(),
        addressed: false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reviews: suggestionReviews,
          correlationId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(`[${correlationId}] generate-suggestions ERROR:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: err instanceof Error ? err.message : "Unknown error",
          correlationId,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
