/**
 * extract-correction-patterns — Analyze curator corrections and harvest learning patterns.
 *
 * Processes curator_corrections rows where curator_action = 'rejected_rewritten'
 * (significant rewrites). Uses AI to extract what the curator changed and why,
 * then upserts results into section_example_library as 'excellent' examples.
 *
 * Prompt 13 enhancements:
 * - Correction class taxonomy (factual/style/structural/terminology/quantification/framework/omission)
 * - Semantic deduplication: before inserting, check for similar existing rules
 * - Activation gating: new examples start dormant (is_active=false), auto-activate at confidence ≥ 0.7 + 2 distinct curators
 *
 * Designed for pg_cron or manual invocation. Batch size: 10 per run.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 10;
const ACTIVATION_CONFIDENCE_THRESHOLD = 0.7;
const ACTIVATION_CURATOR_THRESHOLD = 2;
const CONFIDENCE_INCREMENT = 0.15;

const VALID_CORRECTION_CLASSES = [
  'factual', 'style', 'structural', 'terminology',
  'quantification', 'framework', 'omission',
];

interface CorrectionRow {
  id: string;
  challenge_id: string;
  section_key: string;
  ai_content: string | null;
  curator_content: string | null;
  edit_distance_percent: number;
  curator_action: string;
  curator_id: string | null;
}

/**
 * Build the AI prompt to extract a learning pattern from a curator rewrite.
 */
function buildExtractionPrompt(row: CorrectionRow): string {
  return `You are analyzing a curator's correction of an AI-generated challenge section.

SECTION: ${row.section_key}
EDIT DISTANCE: ${row.edit_distance_percent}%

AI VERSION:
${row.ai_content ?? "(empty)"}

CURATOR VERSION:
${row.curator_content ?? "(empty)"}

Analyze what the curator changed and why. Return a JSON object with:
{
  "correction_class": "One of: factual, style, structural, terminology, quantification, framework, omission",
  "pattern_summary": "One sentence describing the correction pattern",
  "quality_issues_in_ai": ["list of specific quality issues in the AI version"],
  "curator_improvements": ["list of specific improvements the curator made"],
  "learning_rule": "A reusable instruction for the AI to avoid this mistake in future. Be specific and actionable.",
  "annotation": "Brief note for the example library"
}

CORRECTION CLASS DEFINITIONS:
- factual: AI stated incorrect facts (wrong law names, wrong numbers, wrong dates)
- style: Curator changed tone, voice, sentence structure, or depth (e.g., expanded from 4 to 7 sentences)
- structural: Curator reorganized content layout (e.g., flat list → tiered structure)
- terminology: Curator corrected domain-specific terms or jargon
- quantification: Curator added or corrected specific numbers, metrics, or benchmarks
- framework: Curator added or corrected named frameworks, methodologies, or standards
- omission: Curator added content the AI missed entirely`;
}

/**
 * Check for existing similar rules and either deduplicate or insert new.
 * Returns true if a new example was inserted, false if merged with existing.
 */
async function deduplicateOrInsert(
  adminClient: ReturnType<typeof createClient>,
  correction: CorrectionRow,
  pattern: Record<string, unknown>,
): Promise<'inserted' | 'merged' | 'error'> {
  const learningRule = (pattern.learning_rule as string) ?? null;
  const correctionClass = VALID_CORRECTION_CLASSES.includes(pattern.correction_class as string)
    ? (pattern.correction_class as string)
    : null;

  if (!learningRule) return 'error';

  // Search for existing rules with same section_key and similar learning_rule
  const { data: existing } = await adminClient
    .from('section_example_library' as string)
    .select('id, learning_rule, activation_confidence, distinct_curator_count, is_active')
    .eq('section_key', correction.section_key)
    .not('learning_rule', 'is', null)
    .eq('source_type', 'curator_correction')
    .limit(50);

  if (existing && existing.length > 0) {
    // Simple substring-based similarity: check if the core rule overlaps
    const ruleWords = new Set(learningRule.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));

    for (const ex of existing as Record<string, unknown>[]) {
      const existingRule = (ex.learning_rule as string) ?? '';
      const existingWords = new Set(existingRule.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
      const overlap = [...ruleWords].filter((w: string) => existingWords.has(w)).length;
      const similarity = overlap / Math.max(ruleWords.size, existingWords.size, 1);

      if (similarity > 0.5) {
        // Similar rule found — increment confidence and curator count
        const newConfidence = Math.min(
          1.0,
          (ex.activation_confidence as number ?? 0.5) + CONFIDENCE_INCREMENT,
        );
        const curatorId = correction.curator_id;
        const newCuratorCount = (ex.distinct_curator_count as number ?? 1) + (curatorId ? 1 : 0);

        // Auto-activate if thresholds met
        const shouldActivate = newConfidence >= ACTIVATION_CONFIDENCE_THRESHOLD
          && newCuratorCount >= ACTIVATION_CURATOR_THRESHOLD;

        await adminClient
          .from('section_example_library' as string)
          .update({
            activation_confidence: newConfidence,
            distinct_curator_count: newCuratorCount,
            is_active: shouldActivate || (ex.is_active as boolean),
          } as Record<string, unknown>)
          .eq('id', ex.id as string);

        console.log(
          `[extract-correction-patterns] Merged with existing rule ${ex.id} ` +
          `(confidence: ${newConfidence}, curators: ${newCuratorCount}, active: ${shouldActivate || (ex.is_active as boolean)})`,
        );
        return 'merged';
      }
    }
  }

  // No similar rule found — insert new dormant example
  const curatorContent = typeof correction.curator_content === 'string'
    ? { text: correction.curator_content }
    : correction.curator_content;

  const { error: insertErr } = await adminClient
    .from('section_example_library' as string)
    .insert({
      section_key: correction.section_key,
      quality_tier: 'excellent',
      content: curatorContent,
      source_challenge_id: correction.challenge_id,
      source_type: 'curator_correction',
      annotation: (pattern.annotation as string) ?? 'Curator-corrected version',
      learning_rule: learningRule,
      correction_class: correctionClass,
      activation_confidence: 0.5,
      distinct_curator_count: 1,
      is_active: false, // Dormant until activation threshold met
      domain_tags: [],
    } as Record<string, unknown>);

  if (insertErr) {
    console.warn(`[extract-correction-patterns] Insert failed:`, insertErr.message);
    return 'error';
  }

  return 'inserted';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "MISSING_API_KEY", message: "LOVABLE_API_KEY not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch unprocessed significant rewrites (rejected_rewritten with content)
    const { data: rows, error: fetchErr } = await adminClient
      .from("curator_corrections")
      .select("id, challenge_id, section_key, ai_content, curator_content, edit_distance_percent, curator_action, curator_id")
      .eq("curator_action", "rejected_rewritten")
      .is("pattern_extracted", null)
      .not("ai_content", "is", null)
      .not("curator_content", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      console.error("[extract-correction-patterns] Fetch error:", fetchErr.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "FETCH_ERROR", message: fetchErr.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0, message: "No unprocessed corrections found" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const corrections = rows as CorrectionRow[];
    let processed = 0;
    let inserted = 0;
    let merged = 0;

    for (const correction of corrections) {
      try {
        const prompt = buildExtractionPrompt(correction);

        const resp = await callAIWithFallback(apiKey, {
          messages: [
            { role: "system", content: "You are a learning pattern extractor. Respond only with valid JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: "json_object" },
        });

        if (!resp.ok) {
          console.warn(`[extract-correction-patterns] AI call failed for ${correction.id}: ${resp.status}`);
          continue;
        }

        const aiResult = await resp.json();
        const content = aiResult.choices?.[0]?.message?.content;
        if (!content) continue;

        let pattern: Record<string, unknown>;
        try {
          pattern = JSON.parse(content);
        } catch {
          console.warn(`[extract-correction-patterns] Invalid JSON from AI for ${correction.id}`);
          continue;
        }

        // Mark correction as processed
        await adminClient
          .from("curator_corrections")
          .update({ pattern_extracted: true } as Record<string, unknown>)
          .eq("id", correction.id);

        // Deduplicate or insert
        const result = await deduplicateOrInsert(adminClient, correction, pattern);
        if (result === 'inserted') inserted++;
        if (result === 'merged') merged++;

        processed++;
      } catch (rowErr) {
        const msg = rowErr instanceof Error ? rowErr.message : "Unknown";
        console.warn(`[extract-correction-patterns] Row ${correction.id} error:`, msg);
      }
    }

    console.log(
      `[extract-correction-patterns] Processed ${processed}/${corrections.length}, ` +
      `inserted ${inserted} new, merged ${merged} with existing`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { processed, inserted, merged, total: corrections.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract-correction-patterns] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
