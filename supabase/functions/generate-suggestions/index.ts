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

      const content = ch[key] ?? eb[key] ?? eb[key.replace(/-/g, '_')] ?? null;
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

    // ═══ BUILD SAME CONTEXT BLOCKS AS PASS 1 ═══

    const orgBlock = buildOrgBlock(ctx.org as unknown as Record<string, unknown>);

    const industryBlock = ctx.industryPack
      ? `## INDUSTRY INTELLIGENCE\n${jsonBrief(ctx.industryPack)}`
      : '';

    const geoBlock = ctx.geoContext
      ? `## GEOGRAPHY CONTEXT\n${jsonBrief(ctx.geoContext)}`
      : '';

    const depMap = ctx.sectionDependencyMap as Record<string, { strategicRole: string; downstream: string[] }>;
    const dependencyBlock = Object.entries(depMap)
      .map(([key, info]) => {
        const downstreamStr = info.downstream.length > 0 ? info.downstream.join(', ') : '(none)';
        return `${key}: ${info.strategicRole} → downstream: [${downstreamStr}]`;
      })
      .join('\n');

    const masterDataBlock = Object.entries(ctx.masterData)
      .map(([k, opts]) => `${k}: ${opts.map(o => `${o.code} (${o.label})`).join(', ')}`)
      .join('\n');

    // Build rich context block from full digest
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

    // ═══ REFERENCE CONTENT FROM PASSING SECTIONS ═══
    const allSectionConfigs = ctx.sectionConfigs as { section_key: string; section_label: string }[];
    const passSectionKeys = new Set(
      reviews
        .filter(r => (r.status as string) === 'pass' || (r.status as string) === 'best_practice')
        .map(r => r.section_key as string)
    );

    const referenceLines: string[] = [];
    for (const config of allSectionConfigs) {
      const key = config.section_key;
      if (!passSectionKeys.has(key)) continue;
      const content = ch[key] ?? eb[key] ?? eb[key.replace(/-/g, '_')] ?? null;
      if (!content) continue;
      const displayContent = typeof content === 'string' ? stripHtml(content) : jsonBrief(content);
      referenceLines.push(`### ${config.section_label} (${key}) [PASS — reference only]\n${displayContent}`);
    }
    const referenceBlock = referenceLines.length > 0
      ? `## EXISTING CONTENT (reference — do NOT regenerate these)\n${referenceLines.join('\n\n')}`
      : '';

    // ═══ LEGAL DOCS BLOCK ═══
    const legalBlock = ctx.legalDocs.length > 0
      ? `## LEGAL DOCS\n${ctx.legalDocs.map((d: Record<string, unknown>) => `- ${d.document_type} (${d.tier}): ${d.status}`).join('\n')}`
      : '';

    // ═══ FULL SYSTEM PROMPT WITH ALL CONTEXT ═══
    const systemPrompt = `## YOUR ROLE: PRINCIPAL CONSULTANT — CONTENT GENERATION
You are generating improved, publication-ready content for an innovation challenge.
Write from the organization's perspective ("we", "our") except for evaluation/submission sections.

## ORGANIZATION CONTEXT
${orgBlock}

${industryBlock}

${geoBlock}

## MASTER DATA — HARD RULES
${masterDataBlock}
Any code NOT in this list will be REJECTED by the validator.
- For checkbox_single sections: output {"selected_id":"CODE","rationale":"..."}
- For checkbox_multi sections: output JSON array of codes ONLY from the list above
- For evaluation_criteria: weights MUST sum to exactly 100%

## SECTION DEPENDENCY MAP
${dependencyBlock}

## DEPENDENCY RULES FOR GENERATION
1. If section A depends on section B, and BOTH need generation: generate B's content FIRST in your mind, then use it for A
2. "deliverables" must align with "problem_statement" and "scope"
3. "evaluation_criteria" must cover ALL deliverables, weights sum to 100%
4. "solver_expertise" must match "deliverables" and "solution_type"
5. "phase_schedule" durations must reflect deliverable complexity
6. "submission_guidelines" must reference specific deliverables
7. "reward_structure" must be proportional to complexity and scope
8. "hook" must be compelling, derived from problem_statement
9. Always use industry-specific terminology from the Industry Intelligence above
10. Always consider geographic regulations from the Geography Context above

${contextBlock}

${referenceBlock}

${legalBlock}

Today's date: ${new Date().toISOString().split('T')[0]}

For each section below, generate improved content addressing ALL review comments.
Use the EXISTING CONTENT sections above as reference to ensure cross-section coherence.

Return JSON: { "<section_key>": { "status": "generated", "suggestion": <content in correct format>, "comments": [{"type":"strength","text":"..."}] } }`;

    const userPrompt = `# CHALLENGE: "${ch.title}"

## SECTIONS TO IMPROVE

${sectionInstructions.join('\n\n---\n\n')}

Generate improved content for ALL sections above. Reference the EXISTING CONTENT sections for cross-section coherence.
For master data sections, use ONLY codes from the MASTER DATA list. Return ONLY valid JSON.`;

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
    const parsed = (rawParsed.sections && typeof rawParsed.sections === 'object' && !Array.isArray(rawParsed.sections)
      ? rawParsed.sections
      : rawParsed) as Record<string, Record<string, unknown>>;

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
