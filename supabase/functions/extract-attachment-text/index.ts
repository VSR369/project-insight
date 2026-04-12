/**
 * extract-attachment-text — Extracts text content from uploaded challenge attachments and URLs.
 * Supports: PDF (text decode), images (Gemini Vision), URLs (HTML strip + meta fallback).
 * Tier 2: Always runs AI summarization — context-aware for sparse/meta-only content.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractMetaTags(rawHtml: string): {
  ogTitle: string; ogDesc: string; metaDesc: string; h1Tags: string[]; pageTitle: string;
} {
  const ogTitle = rawHtml.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
    ?? rawHtml.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1] ?? '';
  const ogDesc = rawHtml.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    ?? rawHtml.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i)?.[1] ?? '';
  const metaDesc = rawHtml.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    ?? rawHtml.match(/content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1] ?? '';
  const h1Matches = rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) ?? [];
  const h1Tags = h1Matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 3);
  const pageTitle = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
  return { ogTitle, ogDesc, metaDesc, h1Tags, pageTitle };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { attachment_id } = await req.json();
    if (!attachment_id || typeof attachment_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "attachment_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: att, error: fetchErr } = await adminClient
      .from("challenge_attachments")
      .select("*")
      .eq("id", attachment_id)
      .single();

    if (fetchErr || !att) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Attachment not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await adminClient
      .from("challenge_attachments")
      .update({ extraction_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", attachment_id);

    let extractedText = "";
    let method = "unknown";

    if (att.source_type === "url" && att.source_url) {
      try {
        const urlResp = await fetch(att.source_url, {
          headers: { "User-Agent": "CogniBlend-Curator/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        if (!urlResp.ok) throw new Error(`HTTP ${urlResp.status}: ${urlResp.statusText}`);
        const contentType = urlResp.headers.get("content-type") || "";
        const rawText = await urlResp.text();
        const meta = extractMetaTags(rawText);

        if (contentType.includes("application/pdf")) {
          // Download PDF binary and attempt text extraction
          try {
            const pdfResp = await fetch(att.source_url, {
              headers: { "User-Agent": "CogniBlend-Curator/1.0" },
              redirect: "follow",
              signal: AbortSignal.timeout(20000),
            });
            const pdfBuffer = await pdfResp.arrayBuffer();
            const pdfRaw = new TextDecoder().decode(new Uint8Array(pdfBuffer));
            const cleaned = pdfRaw
              .replace(/[^\x20-\x7E\n\r\t]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .substring(0, 50000);
            const printableRatio = cleaned.replace(/\s/g, "").length / Math.max(cleaned.length, 1);

            if (printableRatio > 0.2 && cleaned.length > 100) {
              extractedText = cleaned;
              method = "url_pdf_text";
            } else {
              extractedText = [
                meta.ogTitle ? `Title: ${meta.ogTitle}` : (meta.pageTitle ? `Title: ${meta.pageTitle}` : ""),
                meta.ogDesc ? `Description: ${meta.ogDesc}` : "",
                `URL: ${att.source_url}`,
                `Note: PDF document — binary content, text could not be decoded`,
              ].filter(Boolean).join("\n");
              method = "url_pdf_binary";
            }
          } catch {
            extractedText = [
              meta.ogTitle ? `Title: ${meta.ogTitle}` : "",
              `URL: ${att.source_url}`,
              `Note: PDF URL — download failed`,
            ].filter(Boolean).join("\n");
            method = "url_pdf_failed";
          }
        } else {
          extractedText = rawText
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[\s\S]*?<\/header>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/\s+/g, " ").trim().substring(0, 50000);
          method = "url_html";

          if (extractedText.trim().length < 500) {
            const metaParts = [
              meta.ogTitle ? `Title: ${meta.ogTitle}` : (meta.pageTitle ? `Title: ${meta.pageTitle}` : ''),
              meta.ogDesc ? `Description: ${meta.ogDesc}` : (meta.metaDesc ? `Description: ${meta.metaDesc}` : ''),
              meta.h1Tags.length > 0 ? `Headings: ${meta.h1Tags.join(' | ')}` : '',
              `URL: ${att.source_url}`,
            ].filter(Boolean);

            if (extractedText.trim().length < 100) {
              extractedText = [...metaParts, 'Note: Page requires JavaScript rendering — metadata extracted only'].join('\n');
              method = "url_meta_only";
            } else {
              extractedText = [...metaParts, '', 'Extracted content:', extractedText.trim()].join('\n');
              method = "url_html_sparse";
            }
          }
        }

        if (!att.url_title) {
          const bestTitle = meta.ogTitle || meta.pageTitle;
          if (bestTitle) {
            await adminClient.from("challenge_attachments").update({
              url_title: bestTitle.substring(0, 500),
            }).eq("id", attachment_id);
          }
        }
      } catch (fetchUrlErr: unknown) {
        const msg = fetchUrlErr instanceof Error ? fetchUrlErr.message : String(fetchUrlErr);
        extractedText = `[Failed to fetch URL: ${msg}]`;
        method = "url_error";
      }
    } else {
      // ── FILE EXTRACTION ──
      const { data: fileData, error: dlErr } = await adminClient.storage
        .from("challenge-attachments")
        .download(att.storage_path);

      if (dlErr || !fileData) {
        await adminClient.from("challenge_attachments").update({
          extraction_status: "failed",
          extraction_error: dlErr?.message || "File not found in storage",
          updated_at: new Date().toISOString(),
        }).eq("id", attachment_id);
        return new Response(
          JSON.stringify({ success: false, error: { code: "STORAGE_ERROR", message: "File not found" } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const buffer = await fileData.arrayBuffer();

      if (att.mime_type === "application/pdf") {
        const textDecoder = new TextDecoder();
        const rawText = textDecoder.decode(buffer);
        const cleaned = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim().substring(0, 50000);
        const printableRatio = cleaned.replace(/\s/g, '').length / Math.max(cleaned.length, 1);
        if (printableRatio < 0.2 || cleaned.length < 50) {
          extractedText = `[PDF content could not be extracted. File: ${att.file_name || 'unnamed'}.]`;
          method = "pdf_binary_fallback";
        } else {
          extractedText = cleaned;
          method = "pdf_text";
        }
      } else if (att.mime_type?.includes("spreadsheet") || att.mime_type?.includes("excel") || att.mime_type?.includes("csv")) {
        const textDecoder = new TextDecoder();
        const raw = textDecoder.decode(buffer);
        if (att.mime_type?.includes("csv") || att.file_name?.endsWith('.csv')) {
          extractedText = raw.substring(0, 50000);
          method = "csv_text";
        } else {
          const printableRatio = raw.replace(/[^\x20-\x7E]/g, '').length / Math.max(raw.length, 1);
          if (printableRatio < 0.3) {
            extractedText = `[Excel file could not be extracted. File: ${att.file_name || 'unnamed'}.]`;
            method = "xlsx_binary_fallback";
          } else {
            extractedText = raw.substring(0, 50000);
            method = "tabular_text";
          }
        }
      } else if (att.mime_type?.includes("wordprocessing") || att.mime_type?.includes("document") || att.mime_type === "text/plain") {
        const textDecoder = new TextDecoder();
        const raw = textDecoder.decode(buffer);
        if (att.mime_type === "text/plain") {
          extractedText = raw.substring(0, 50000);
          method = "plain_text";
        } else {
          const printableRatio = raw.replace(/[^\x20-\x7E]/g, '').length / Math.max(raw.length, 1);
          if (printableRatio < 0.3) {
            extractedText = `[Word document could not be extracted. File: ${att.file_name || 'unnamed'}.]`;
            method = "docx_binary_fallback";
          } else {
            extractedText = raw.substring(0, 50000);
            method = "docx_text";
          }
        }
      } else if (att.mime_type?.startsWith("image/")) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          extractedText = "[Image description unavailable — no API key configured]";
          method = "image_skipped";
        } else {
          try {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                max_tokens: 2000,
                messages: [{
                  role: "user",
                  content: [
                    { type: "image_url", image_url: { url: `data:${att.mime_type};base64,${base64}` } },
                    { type: "text", text: "Describe this image in detail. Extract any text, data tables, diagrams, or process flows visible." },
                  ],
                }],
              }),
            });
            const result = await resp.json();
            extractedText = result.choices?.[0]?.message?.content || "[Image description failed]";
            method = "image_description";
          } catch (imgErr: unknown) {
            const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
            extractedText = `[Image extraction failed: ${msg}]`;
            method = "image_error";
          }
        }
      } else {
        extractedText = `[Unsupported file type: ${att.mime_type}]`;
        method = "unsupported";
      }
    }

    // Save extracted text
    const updatePayload: Record<string, unknown> = {
      extracted_text: extractedText.substring(0, 100000),
      extraction_method: method,
      extraction_status: "completed",
      updated_at: new Date().toISOString(),
    };

    // ── TIER 2: Always run AI Summarization ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const isSparseOrFailed = ["url_meta_only", "url_html_sparse", "url_error",
          "url_pdf_binary", "url_pdf_failed", "pdf_binary_fallback"].includes(method);

        const tier2Prompt = isSparseOrFailed
          ? `You are a research analyst. A web page could not be fully fetched (may require JavaScript or be access-restricted).
Based ONLY on the information below, write:
1. SUMMARY: 3-5 bullet points about what this source LIKELY contains and why it is relevant to the challenge section "${att.section_key}"
2. KEY_DATA: JSON with arrays: facts[], statistics[], names[], dates[], regulations[]

AVAILABLE INFORMATION:
${extractedText}

Challenge section needing this source: ${att.section_key}
Source relevance note: ${att.relevance_explanation || "general reference"}

Return in this exact format:
SUMMARY:
- bullet 1
- bullet 2

KEY_DATA:
{"facts":[],"statistics":[],"names":[],"dates":[],"regulations":[]}`
          : `Analyze this document and provide:
1. SUMMARY: 3-5 bullet points of key information (max 600 chars total)
2. KEY_DATA: Extract as JSON with these arrays: facts[], statistics[], names[], dates[], regulations[]

Document content:
${extractedText.substring(0, 12000)}

Return in this exact format:
SUMMARY:
- bullet 1
- bullet 2

KEY_DATA:
{"facts":[],"statistics":[],"names":[],"dates":[],"regulations":[]}`;

        const tier2Resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            max_tokens: 1500,
            temperature: 0.1,
            messages: [{ role: "user", content: tier2Prompt }],
          }),
        });

        if (tier2Resp.ok) {
          const tier2Result = await tier2Resp.json();
          const tier2Content = tier2Result.choices?.[0]?.message?.content || "";

          const summaryMatch = tier2Content.match(/SUMMARY:\s*([\s\S]*?)(?=KEY_DATA:|$)/i);
          if (summaryMatch?.[1]?.trim()) {
            updatePayload.extracted_summary = summaryMatch[1].trim().substring(0, 600);
          }

          const keyDataMatch = tier2Content.match(/KEY_DATA:\s*(\{[\s\S]*\})/i);
          if (keyDataMatch?.[1]) {
            try { updatePayload.extracted_key_data = JSON.parse(keyDataMatch[1].trim()); } catch { /* skip */ }
          }
        }
      } catch (tier2Err: unknown) {
        console.error("Tier 2 summarization failed (non-blocking):", tier2Err);
      }
    }

    await adminClient.from("challenge_attachments").update(updatePayload).eq("id", attachment_id);

    return new Response(
      JSON.stringify({ success: true, data: { method, length: extractedText.length, hasSummary: !!updatePayload.extracted_summary } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("extract-attachment-text error:", err);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.attachment_id) {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await adminClient.from("challenge_attachments").update({
          extraction_status: "failed",
          extraction_error: errMsg,
          updated_at: new Date().toISOString(),
        }).eq("id", body.attachment_id);
      }
    } catch { /* best effort */ }

    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: errMsg } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
