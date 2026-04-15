/**
 * generate-context-digest — Synthesizes accepted context sources into a 600-word grounded digest.
 * Quality gate: filters out empty/placeholder sources. Uses full text (15K chars per source).
 * Outputs clean HTML (not markdown) for direct RichTextEditor consumption.
 *
 * D5 FIX: Smarter hasRealContent — rejects seed content, accepts good summaries
 * D6 FIX: When user explicitly regenerates, update digest_text AND reset curator_edited
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

/** D5 FIX: Smarter content quality check */
function hasRealContent(att: Record<string, unknown>): boolean {
  const text = ((att.extracted_text as string) || '').trim();
  const summary = ((att.extracted_summary as string) || '').trim();

  // Reject seed content markers
  if (text.startsWith('[SEED_CONTENT')) return false;
  // Reject old-style seed content (search snippets masquerading as content)
  if (text.startsWith('Title:') && text.includes('Search snippet:') && text.length < 500) return false;
  // Reject placeholder/failed content
  if (text.startsWith('[') && text.length < 200) return false;

  // Accept if extracted text has real substance
  if (text.length >= 200) return true;
  // Accept if summary is substantial enough (even if text is sparse)
  if (summary.length >= 50) return true;

  return false;
}

/** Post-process: convert residual markdown to HTML */
function sanitizeToHtml(text: string): string {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, (_: string, t: string) => `<h3>${t}</h3>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>(?:\s*<li>[\s\S]*?<\/li>)*)/g, '<ul>$1</ul>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = crypto.randomUUID().substring(0, 8);

  try {
    const { challenge_id } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "challenge_id is required", correlationId } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[${correlationId}] generate-context-digest START for ${challenge_id}`);

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

    // P4 FIX: Include extraction_quality in query for quality-aware digest
    // GAP 4 FIX: Exclude low-quality sources from digest
    const { data: attachments, error: attErr } = await adminClient
      .from("challenge_attachments")
      .select("section_key, file_name, url_title, source_url, source_type, extracted_summary, extracted_key_data, extracted_text, resource_type, extraction_method, extraction_status, extraction_quality")
      .eq("challenge_id", challenge_id)
      .eq("discovery_status", "accepted")
      .in("extraction_status", ["completed", "partial"])
      .not("extraction_quality", "in", '("low","seed")');

    if (attErr) throw new Error(attErr.message);
    if (!attachments || attachments.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NO_SOURCES", message: "No accepted sources to digest", correlationId } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const usableAttachments = attachments.filter(hasRealContent);
    if (usableAttachments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NO_EXTRACTABLE_CONTENT", message: `${attachments.length} source(s) accepted but none have sufficient text. Try re-extracting sources or adding URLs with richer content.`, correlationId },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // P4 FIX: Sort by extraction_quality — high quality sources first
    const qualityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, seed: 3 };
    usableAttachments.sort((a, b) => {
      const qa = qualityOrder[(a as Record<string, unknown>).extraction_quality as string] ?? 3;
      const qb = qualityOrder[(b as Record<string, unknown>).extraction_quality as string] ?? 3;
      return qa - qb;
    });

    const { data: challenge } = await adminClient
      .from("challenges")
      .select("title, problem_statement, scope, organization_id, domain_tags, maturity_level, solution_type, ai_section_reviews")
      .eq("id", challenge_id)
      .single();

    // GAP 5 FIX: Extract gap sections from Pass 1 reviews for targeted digest
    let gapSectionsInstruction = '';
    if (challenge?.ai_section_reviews) {
      const reviews = Array.isArray(challenge.ai_section_reviews) ? challenge.ai_section_reviews : [];
      const gapSections = reviews
        .filter((r: Record<string, unknown>) => r.status === 'needs_revision' || r.status === 'generated')
        .map((r: Record<string, unknown>) => r.section_key as string)
        .filter(Boolean);
      if (gapSections.length > 0) {
        gapSectionsInstruction = `\n\nCHALLENGE GAPS TO FILL: This challenge has gaps in these sections: ${gapSections.join(', ')}. Focus your digest on information that fills these gaps. Do NOT produce a generic overview — prioritize facts, data, and context relevant to these specific sections.`;
        console.log(`[${correlationId}] Gap-targeted digest for ${gapSections.length} sections: ${gapSections.join(', ')}`);
      }
    }

    let orgContext = "";
    if (challenge?.organization_id) {
      const { data: org } = await adminClient
        .from("seeker_organizations")
        .select("organization_name, hq_city, organization_description")
        .eq("id", challenge.organization_id)
        .single();
      if (org) orgContext = `Organization: ${org.organization_name} (${org.hq_city || "global"}). ${org.organization_description || ""}`;
    }

    // P4 FIX: Quality-aware text budgets — high quality sources get more tokens
    const sourceBlocks = usableAttachments.map((att: Record<string, unknown>, i: number) => {
      const name = (att.url_title || att.file_name || att.source_url || `Source ${i + 1}`) as string;
      const quality = (att.extraction_quality as string) ?? 'low';
      const textBudget = quality === 'high' ? 15000 : quality === 'medium' ? 8000 : 3000;
      const fullText = ((att.extracted_text as string) ?? '').substring(0, textBudget);
      const summary = (att.extracted_summary as string) ?? '';
      const keyData = att.extracted_key_data ? JSON.stringify(att.extracted_key_data, null, 2) : '';
      return `[SOURCE ${i + 1}: ${name}] [${att.resource_type || att.source_type}] [Section: ${att.section_key}] [Quality: ${quality}]
URL: ${(att.source_url as string) ?? 'N/A'}
${fullText ? `FULL CONTENT:\n${fullText}` : ''}
${summary ? `\nAI SUMMARY:\n${summary}` : ''}
${keyData ? `\nSTRUCTURED DATA:\n${keyData}` : ''}`;
    }).join('\n\n═══════════════════════════════════\n\n');

    // Raw context block for Pass 2 grounding — only usable attachments
    const rawContextBySection: Record<string, string[]> = {};
    for (const att of usableAttachments) {
      const sKey = att.section_key as string;
      if (!rawContextBySection[sKey]) rawContextBySection[sKey] = [];
      const name = (att.url_title || att.file_name || att.source_url || 'Unnamed') as string;
      const type = att.source_type === 'url' ? 'WEB URL' : 'DOCUMENT';
      let block = `[${type}] ${name}`;
      if (att.source_url) block += `\nURL: ${att.source_url}`;
      if (att.extracted_summary) block += `\n\nSUMMARY:\n${att.extracted_summary}`;
      if (att.extracted_text) block += `\n\nFULL TEXT:\n${(att.extracted_text as string).substring(0, 8000)}`;
      if (att.extracted_key_data) block += `\n\nSTRUCTURED DATA:\n${JSON.stringify(att.extracted_key_data, null, 2)}`;
      rawContextBySection[sKey].push(block);
    }
    const rawContextBlock = Object.entries(rawContextBySection)
      .map(([sec, blocks]) => `\n═══ ${sec.replace(/_/g, ' ').toUpperCase()} ═══\n${blocks.join('\n\n---\n')}`)
      .join('\n\n')
      .substring(0, 150000);

    const systemPrompt = `You are an expert research analyst synthesizing verified external context for a business challenge curation team.

CHALLENGE: "${challenge?.title || "Unknown"}"
PROBLEM: ${challenge?.problem_statement || "Not specified"}
${orgContext}
${gapSectionsInstruction}

Synthesize the provided source materials into a comprehensive 600-word context digest.

Structure your digest as valid HTML with these sections.
Use <h3> for section headings, <p> for paragraphs, <ul><li> for bullet lists, <strong> for emphasis.
Do NOT use markdown (**bold**, ### headings, - bullets). Output clean HTML only.

Sections:
<h3>Organization Context</h3> — Key facts about the organization
<h3>Industry Landscape</h3> — Market trends, size, growth
<h3>Regulatory Environment</h3> — Applicable regulations, compliance
<h3>Technology Context</h3> — Technology trends and maturity
<h3>Competitive Intelligence</h3> — Competitor approaches, benchmarks
<h3>Key Numbers</h3> — Critical statistics as a <ul> list
<h3>Risks</h3> — Key risks as a <ul> list

Rules:
- ONLY state facts that appear in the provided sources
- Do NOT invent statistics or claims
- Reference source numbers in brackets, e.g., [Source 1]
- Be specific with numbers, dates, and names
- Keep to ~600 words

After the digest, output a JSON block with key facts:
\`\`\`json
{
  "market_size": "...",
  "adoption_rate": "...",
  "avg_roi": "...",
  "key_regulations": ["..."],
  "key_competitors": ["..."],
  "key_benchmarks": ["..."]
}
\`\`\``;

    const aiResp = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Synthesize these ${usableAttachments.length} sources:\n\n${sourceBlocks}` },
      ],
      max_tokens: 6000,
      temperature: 0.2,
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "AI rate limit exceeded" } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted" } }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await aiResp.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let digestText = rawContent;
    let keyFacts: Record<string, unknown> | null = null;

    // Use safeJsonParse for key facts extraction
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      const parsed = safeJsonParse<Record<string, unknown> | null>(jsonMatch[1].trim(), null);
      if (parsed) {
        keyFacts = parsed;
        digestText = rawContent.replace(/```json[\s\S]*?```/, "").trim();
      }
    }

    // Post-process: ensure clean HTML, strip residual markdown
    digestText = sanitizeToHtml(digestText);

    const { data: existingDigest } = await adminClient
      .from("challenge_context_digest")
      .select("curator_edited, digest_text")
      .eq("challenge_id", challenge_id)
      .maybeSingle();

    const newDigestText = digestText.substring(0, 10000);

    // D6 FIX: When user explicitly regenerates, ALWAYS update digest_text
    // and reset curator_edited so Pass 2 reads fresh content
    if (existingDigest) {
      const { error: updateErr } = await adminClient
        .from("challenge_context_digest")
        .update({
          digest_text: newDigestText,
          original_digest_text: newDigestText,
          key_facts: keyFacts,
          source_count: usableAttachments.length,
          generated_at: new Date().toISOString(),
          raw_context_block: rawContextBlock,
          raw_context_updated_at: new Date().toISOString(),
          curator_edited: false,
          curator_edited_at: null,
        })
        .eq("challenge_id", challenge_id);
      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { error: upsertErr } = await adminClient
        .from("challenge_context_digest")
        .upsert({
          challenge_id,
          digest_text: newDigestText,
          original_digest_text: newDigestText,
          key_facts: keyFacts,
          source_count: usableAttachments.length,
          generated_at: new Date().toISOString(),
          raw_context_block: rawContextBlock,
          raw_context_updated_at: new Date().toISOString(),
        }, { onConflict: "challenge_id" });
      if (upsertErr) throw new Error(upsertErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          digest_text: newDigestText.substring(0, 500) + (newDigestText.length > 500 ? "..." : ""),
          source_count: usableAttachments.length,
          total_accepted: attachments.length,
          skipped_empty: attachments.length - usableAttachments.length,
          curator_edit_reset: !!existingDigest?.curator_edited,
          correlationId,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${correlationId}] generate-context-digest error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message, correlationId } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
