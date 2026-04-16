/**
 * embed-curator-corrections — Generate embeddings for unprocessed curator corrections.
 *
 * Fetches curator_corrections rows where embedding IS NULL,
 * generates embeddings via AI gateway (text-embedding-3-small),
 * and writes them back. Designed for pg_cron or manual invocation.
 *
 * Batch size: up to 50 rows per invocation to stay within limits.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 50;
const EMBEDDING_MODEL = "text-embedding-3-small";

interface CorrectionRow {
  id: string;
  ai_content: string | null;
  curator_content: string | null;
  section_key: string;
  curator_action: string;
}

/**
 * Build embedding input text from correction row.
 * Combines section key, action, and content for meaningful embedding.
 */
function buildEmbeddingText(row: CorrectionRow): string {
  const parts: string[] = [`section: ${row.section_key}`, `action: ${row.curator_action}`];

  if (row.ai_content) {
    const aiText = row.ai_content.length > 2000
      ? row.ai_content.slice(0, 2000) + "…"
      : row.ai_content;
    parts.push(`ai_suggestion: ${aiText}`);
  }

  if (row.curator_content) {
    const curText = row.curator_content.length > 2000
      ? row.curator_content.slice(0, 2000) + "…"
      : row.curator_content;
    parts.push(`curator_version: ${curText}`);
  }

  return parts.join("\n");
}

/**
 * Call OpenAI-compatible embeddings endpoint via AI gateway.
 */
async function generateEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Embedding API error ${resp.status}: ${errText}`);
  }

  const result = await resp.json();
  return result.data.map((d: { embedding: number[] }) => d.embedding);
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

    // Fetch unembedded corrections
    const { data: rows, error: fetchErr } = await adminClient
      .from("curator_corrections")
      .select("id, ai_content, curator_content, section_key, curator_action")
      .is("embedding", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      console.error("[embed-curator-corrections] Fetch error:", fetchErr.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "FETCH_ERROR", message: fetchErr.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0, message: "No unembedded corrections found" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Skip rows with no content at all
    const validRows = (rows as CorrectionRow[]).filter(
      (r) => r.ai_content || r.curator_content,
    );

    if (validRows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0, message: "No rows with content to embed" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build texts and generate embeddings
    const texts = validRows.map(buildEmbeddingText);
    const embeddings = await generateEmbeddings(texts, apiKey);

    // Update each row with its embedding
    let updated = 0;
    for (let i = 0; i < validRows.length; i++) {
      const { error: updateErr } = await adminClient
        .from("curator_corrections")
        .update({ embedding: JSON.stringify(embeddings[i]) } as Record<string, unknown>)
        .eq("id", validRows[i].id);

      if (updateErr) {
        console.warn(`[embed-curator-corrections] Update failed for ${validRows[i].id}:`, updateErr.message);
      } else {
        updated++;
      }
    }

    console.log(`[embed-curator-corrections] Processed ${updated}/${validRows.length} corrections`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { processed: updated, total: validRows.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[embed-curator-corrections] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
