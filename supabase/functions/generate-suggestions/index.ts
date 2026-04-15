/**
 * generate-suggestions — Unified Pass 2: ONE AI call for all section suggestions.
 * Receives Pass 1 reviews + context digest + full context. Returns format-correct suggestions.
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

/* ── Inline format map (cannot import cross-function) ── */
const SECTION_FORMAT_MAP: Record<string, string> = {
  problem_statement: 'rich_text', scope: 'rich_text', hook: 'rich_text',
  context_and_background: 'rich_text',
  deliverables: 'line_items', expected_outcomes: 'line_items',
  submission_guidelines: 'line_items', root_causes: 'line_items',
  current_deficiencies: 'line_items', preferred_approach: 'line_items',
  approaches_not_of_interest: 'line_items',
  evaluation_criteria: 'table', affected_stakeholders: 'table',
  success_metrics_kpis: 'table', data_resources_provided: 'table',
  phase_schedule: 'schedule_table', reward_structure: 'custom',
  solver_expertise: 'custom', complexity: 'complexity_assessment',
  ip_model: 'checkbox_single', maturity_level: 'checkbox_single',
  eligibility: 'checkbox_multi', visibility: 'checkbox_multi',
  domain_tags: 'tag_input', solution_type: 'checkbox_multi',
};

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  rich_text: 'Output: formatted markdown/HTML. No JSON.',
  line_items: 'Output: JSON array of strings or objects per section spec.',
  table: 'Output: JSON array of row objects with keys from section definition.',
  schedule_table: 'Output: JSON array of phase objects: {phase_name, duration_days, start_date, end_date}.',
  checkbox_multi: 'Output: JSON array of codes from allowed values ONLY.',
  checkbox_single: 'Output: {"selected_id":"CODE","rationale":"..."}. Code MUST be from allowed values.',
  custom: 'Output: structured JSON appropriate to section.',
  tag_input: 'Output: JSON array of tag strings.',
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
      return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Auth required", correlationId } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError) {
      return new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token", correlationId } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { challenge_id, pass1_reviews } = await req.json();
    if (!challenge_id) {
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id required", correlationId } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[${correlationId}] generate-suggestions START for ${challenge_id}`);

    const ctx = await buildUnifiedContext(challenge_id, correlationId);
    const ch = ctx.challenge;
    const eb = ctx.extendedBrief;

    let reviews: Record<string, unknown>[] = pass1_reviews ?? [];
    if (reviews.length === 0 && Array.isArray(ch.ai_section_reviews)) {
      reviews = ch.ai_section_reviews as Record<string, unknown>[];
    }

    // Generate for ALL non-pass sections (broadened filter)
    const needsSuggestions = reviews.filter((r) => {
      const status = (r.status as string) ?? '';
      return status !== 'pass' && status !== 'best_practice' && status !== '';
    });

    if (needsSuggestions.length === 0) {
      return new Response(JSON.stringify({ success: true, data: { reviews: [], correlationId, message: "All pass" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[${correlationId}] Generating for ${needsSuggestions.length} sections`);

    const configMap = new Map((ctx.sectionConfigs as Record<string, unknown>[]).map(c => [c.section_key as string, c]));
    const sectionInstructions: string[] = [];

    for (const review of needsSuggestions) {
      const key = review.section_key as string;
      const config = configMap.get(key);
      const format = SECTION_FORMAT_MAP[key] ?? 'rich_text';
      const formatInstr = FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.rich_text;

      let content = ch[key] ?? eb[key] ?? eb[key.replace(/-/g, '_')] ?? null;
      const currentContent = content ? (typeof content === 'string' ? stripHtml(content) : jsonBrief(content)) : '(empty)';
      const comments = (review.comments as Record<string, unknown>[])?.map(c => `[${c.type}] ${c.text}`).join('\n') ?? '';

      sectionInstructions.push(`### ${key} (${(config as Record<string, unknown>)?.section_label ?? key})
STATUS: ${review.status}
CURRENT: ${currentContent}
COMMENTS:\n${comments}
FORMAT: ${formatInstr}
${(config as Record<string, unknown>)?.dos ? `DO: ${(config as Record<string, unknown>).dos}` : ''}
${(config as Record<string, unknown>)?.donts ? `DON'T: ${(config as Record<string, unknown>).donts}` : ''}`);
    }

    const masterDataBlock = Object.entries(ctx.masterData)
      .map(([k, opts]) => `${k}: ${opts.map(o => `${o.code} (${o.label})`).join(', ')}`)
      .join('\n');

    // Build rich context block from full digest (key_facts + raw_context_block)
    const digestFull = ctx.contextDigestFull;
    let contextBlock = '';
    if (digestFull?.digestText) {
      contextBlock += `## VERIFIED CONTEXT DIGEST\n${digestFull.digestText.substring(0, 4000)}\n\n`;
      if (digestFull.keyFacts) {
        contextBlock += `## KEY FACTS\n${JSON.stringify(digestFull.keyFacts, null, 2).substring(0, 2000)}\n\n`;
      }
      if (digestFull.rawContextBlock) {
        contextBlock += `## RAW SOURCE CONTEXT (extracted from verified sources)\n${digestFull.rawContextBlock.substring(0, 8000)}\n\n`;
      }
      if (digestFull.curatorEdited) {
        contextBlock += `Note: Digest has been edited by the curator — prioritize edited content.\n`;
      }
    } else if (ctx.contextDigest) {
      contextBlock = `## VERIFIED CONTEXT\n${ctx.contextDigest.substring(0, 4000)}`;
    }

    const systemPrompt = `You are a PRINCIPAL CONSULTANT generating improved challenge content.
Write from the organization's perspective ("we", "our") except evaluation/submission sections.

## MASTER DATA — HARD RULES
${masterDataBlock}
Any code NOT in this list will be REJECTED.

${contextBlock}

Today's date: ${new Date().toISOString().split('T')[0]}

For each section, generate improved content addressing ALL comments.
Return JSON: { "<section_key>": { "status": "generated", "suggestion": <content in correct format>, "comments": [{"type":"strength","text":"..."}] } }`;

    const userPrompt = `# CHALLENGE: ${ch.title}\n\n${sectionInstructions.join('\n\n---\n\n')}\n\nGenerate now. ONLY JSON.`;

    const model = (ctx.globalConfig?.critical_model ?? ctx.globalConfig?.default_model ?? 'google/gemini-3-flash-preview') as string;
    const aiResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 16000, temperature: 0.3,
    }, model);

    if (!aiResp.ok) {
      const s = aiResp.status;
      if (s === 402) return new Response(JSON.stringify({ success: false, error: { code: "AI_CREDITS_EXHAUSTED", message: "Credits exhausted", correlationId } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 429) return new Response(JSON.stringify({ success: false, error: { code: "AI_RATE_LIMITED", message: "Rate limited", correlationId } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI returned ${s}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? '{}';
    const rawParsed = safeJsonParse<Record<string, unknown>>(rawContent, {});
    // Handle {sections: {...}} wrapper from some AI models
    const parsed = (rawParsed.sections && typeof rawParsed.sections === 'object' && !Array.isArray(rawParsed.sections)
      ? rawParsed.sections
      : rawParsed) as Record<string, Record<string, unknown>>;

    // Filter out meta keys that aren't section data
    const META_KEYS = new Set(['overall_assessment', 'sections', 'summary', 'metadata']);

    console.log(`[${correlationId}] Suggestions for ${Object.keys(parsed).filter(k => !META_KEYS.has(k)).length} sections`);

    const suggestionReviews: Record<string, unknown>[] = [];
    for (const [sectionKey, sr] of Object.entries(parsed).filter(([k]) => !META_KEYS.has(k))) {
      const suggestion = sr.suggestion;
      const suggestionStr = typeof suggestion === 'string' ? suggestion : suggestion ? JSON.stringify(suggestion) : null;
      const originalReview = reviews.find(r => r.section_key === sectionKey);

      suggestionReviews.push({
        section_key: sectionKey,
        status: sr.status ?? 'generated',
        comments: [...((originalReview?.comments as unknown[]) ?? []), ...((sr.comments as unknown[]) ?? [])],
        suggestion: suggestionStr,
        reviewed_at: new Date().toISOString(),
        addressed: false,
      });
    }

    return new Response(JSON.stringify({ success: true, data: { reviews: suggestionReviews, correlationId } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(`[${correlationId}] ERROR:`, err);
    return new Response(JSON.stringify({ success: false, error: { code: "GENERATION_FAILED", message: err instanceof Error ? err.message : "Unknown", correlationId } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
