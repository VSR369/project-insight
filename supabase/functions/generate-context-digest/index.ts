/**
 * generate-context-digest — Synthesizes accepted context sources into a 600-word grounded digest.
 * Quality gate: filters out empty/placeholder sources. Uses full text (15K chars per source).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Quality gate — returns true only for sources with real extractable content */
function hasRealContent(att: Record<string, unknown>): boolean {
  const text = ((att.extracted_text as string) || (att.extracted_summary as string) || '').trim();
  if (text.length < 100) return false;
  if (text.startsWith('[')) return false; // placeholder markers like "[PDF content could not..."
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challenge_id } = await req.json();

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

    // 1. Fetch accepted attachments
    const { data: attachments, error: attErr } = await adminClient
      .from("challenge_attachments")
      .select("section_key, file_name, url_title, source_url, source_type, extracted_summary, extracted_key_data, extracted_text, resource_type, extraction_method")
      .eq("challenge_id", challenge_id)
      .eq("discovery_status", "accepted");

    if (attErr) throw new Error(attErr.message);
    if (!attachments || attachments.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NO_SOURCES", message: "No accepted sources to digest" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Quality gate: filter out empty/placeholder sources
    const usableAttachments = attachments.filter(hasRealContent);
    if (usableAttachments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "NO_EXTRACTABLE_CONTENT",
            message: `No sources have extractable content yet. ${attachments.length} source(s) accepted but none have sufficient text content for digest generation.`,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch challenge + org context
    const { data: challenge } = await adminClient
      .from("challenges")
      .select("title, problem_statement, scope, organization_id, domain_tags, maturity_level, solution_type")
      .eq("id", challenge_id)
      .single();

    let orgContext = "";
    if (challenge?.organization_id) {
      const { data: org } = await adminClient
        .from("seeker_organizations")
        .select("organization_name, hq_city, organization_description")
        .eq("id", challenge.organization_id)
        .single();
      if (org) {
        orgContext = `Organization: ${org.organization_name} (${org.hq_city || "global"}). ${org.organization_description || ""}`;
      }
    }

    // 3. Compile source material — full text up to 15K per source
    const sourceBlocks = usableAttachments.map((att: Record<string, unknown>, i: number) => {
      const name = (att.url_title || att.file_name || att.source_url || `Source ${i + 1}`) as string;
      const fullText = ((att.extracted_text as string) ?? '').substring(0, 15000);
      const summary = (att.extracted_summary as string) ?? '';
      const keyData = att.extracted_key_data ? JSON.stringify(att.extracted_key_data, null, 2) : '';

      return `[SOURCE ${i + 1}: ${name}] [${att.resource_type || att.source_type}] [Section: ${att.section_key}]
URL: ${(att.source_url as string) ?? 'N/A'}

${fullText ? `FULL CONTENT:\n${fullText}` : ''}
${summary ? `\nAI SUMMARY:\n${summary}` : ''}
${keyData ? `\nSTRUCTURED DATA:\n${keyData}` : ''}`;
    }).join('\n\n═══════════════════════════════════\n\n');

    // 3b. Build raw context block for Pass 2 grounding
    const rawContextBySection: Record<string, string[]> = {};
    for (const att of attachments) {
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

    // 4. Call AI to synthesize
    const systemPrompt = `You are an expert research analyst synthesizing verified external context for a business challenge curation team.

CHALLENGE: "${challenge?.title || "Unknown"}"
PROBLEM: ${challenge?.problem_statement || "Not specified"}
${orgContext}

Synthesize the provided source materials into a comprehensive 600-word context digest.

Structure your digest with these sections:
1. **Organization Context** — Key facts about the organization and its position
2. **Industry Landscape** — Market trends, size, growth relevant to the challenge
3. **Regulatory Environment** — Applicable regulations, compliance requirements
4. **Technology Context** — Relevant technology trends and maturity
5. **Competitive Intelligence** — Competitor approaches, industry benchmarks
6. **Key Numbers** — Critical statistics, KPIs, benchmarks (as bullet points)
7. **Risks** — Key risks and considerations

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
          { role: "user", content: `Synthesize these ${usableAttachments.length} sources:\n\n${sourceBlocks}` },
        ],
        max_tokens: 6000,
        temperature: 0.2,
      }),
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

    // 5. Extract digest text and key facts
    let digestText = rawContent;
    let keyFacts: Record<string, unknown> | null = null;

    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      try {
        keyFacts = JSON.parse(jsonMatch[1].trim());
        digestText = rawContent.replace(/```json[\s\S]*?```/, "").trim();
      } catch {
        // Keep full text if JSON parsing fails
      }
    }

    // 6. Check if curator has edited the digest before upserting
    const { data: existingDigest } = await adminClient
      .from("challenge_context_digest")
      .select("curator_edited, digest_text")
      .eq("challenge_id", challenge_id)
      .maybeSingle();

    const newDigestText = digestText.substring(0, 10000);

    if (existingDigest?.curator_edited) {
      const { error: updateErr } = await adminClient
        .from("challenge_context_digest")
        .update({
          original_digest_text: newDigestText,
          key_facts: keyFacts,
          source_count: usableAttachments.length,
          generated_at: new Date().toISOString(),
          raw_context_block: rawContextBlock,
          raw_context_updated_at: new Date().toISOString(),
        })
        .eq("challenge_id", challenge_id);
      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { error: upsertErr } = await adminClient
        .from("challenge_context_digest")
        .upsert(
          {
            challenge_id,
            digest_text: newDigestText,
            original_digest_text: newDigestText,
            key_facts: keyFacts,
            source_count: usableAttachments.length,
            generated_at: new Date().toISOString(),
            raw_context_block: rawContextBlock,
            raw_context_updated_at: new Date().toISOString(),
          },
          { onConflict: "challenge_id" },
        );
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
          curator_edit_preserved: !!existingDigest?.curator_edited,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-context-digest error:", err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
