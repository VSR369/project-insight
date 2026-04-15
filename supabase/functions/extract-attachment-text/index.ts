/**
 * extract-attachment-text — Extracts text content from uploaded challenge attachments and URLs.
 * Supports: PDF (AI vision), DOCX (XML parse), images (Gemini Vision), URLs (HTML strip + meta fallback).
 * Tier 2: Always runs AI summarization — context-aware for sparse/meta-only content.
 *
 * V2 FIX: PDF uses AI vision instead of TextDecoder. DOCX parses XML from ZIP.
 * V2 FIX: Surfaces 402/429 errors with specific codes.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback, getAIModelConfig } from "../_shared/aiModelConfig.ts";
import { parseSummaryAndKeyData } from "../_shared/safeJsonParse.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Methods that indicate placeholder/failed extraction — not real content */
const PLACEHOLDER_METHODS = new Set([
  "url_error", "url_pdf_failed", "url_pdf_binary", "url_meta_only",
  "pdf_binary_fallback", "xlsx_binary_fallback", "docx_binary_fallback",
  "image_skipped", "image_error", "unsupported",
]);

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

/** Extract text from DOCX ZIP by parsing word/document.xml */
async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("text");
    if (!docXml) return "";
    // Strip XML tags, keep text content
    const text = docXml
      .replace(/<w:p[^>]*>/gi, "\n") // paragraph breaks
      .replace(/<w:tab[^/]*\/>/gi, "\t") // tabs
      .replace(/<w:br[^/]*\/>/gi, "\n") // breaks
      .replace(/<[^>]+>/g, "") // all other tags
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'").replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text.substring(0, 50000);
  } catch (e) {
    console.error("DOCX parse error:", e);
    return "";
  }
}

/** Extract text from XLSX ZIP by parsing shared strings + sheet XML */
async function extractXlsxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    // Try shared strings first
    const ssXml = await zip.file("xl/sharedStrings.xml")?.async("text");
    const lines: string[] = [];
    if (ssXml) {
      const matches = ssXml.match(/<t[^>]*>([^<]+)<\/t>/gi) ?? [];
      for (const m of matches) {
        const val = m.replace(/<[^>]+>/g, "").trim();
        if (val) lines.push(val);
      }
    }
    // Also try sheet1 for inline values
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("text");
    if (sheetXml) {
      const cellValues = sheetXml.match(/<v>([^<]+)<\/v>/gi) ?? [];
      for (const m of cellValues) {
        const val = m.replace(/<[^>]+>/g, "").trim();
        if (val && !lines.includes(val)) lines.push(val);
      }
    }
    return lines.join(" | ").substring(0, 50000);
  } catch (e) {
    console.error("XLSX parse error:", e);
    return "";
  }
}

/** Chunked base64 encoder — avoids stack overflow for large buffers */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Use AI vision to read PDF pages as images (base64) */
async function extractPdfViaVision(
  buffer: ArrayBuffer,
  apiKey: string,
  fileName: string,
): Promise<{ text: string; method: string }> {
  const base64 = arrayBufferToBase64(buffer);

  try {
    const resp = await callAIWithFallback(apiKey, {
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${base64}` },
          },
          {
            type: "text",
            text: `Extract ALL text content from this PDF document "${fileName}". Include headings, paragraphs, tables, bullet points, and any data. Preserve structure with line breaks. Return ONLY the extracted text, no commentary.`,
          },
        ],
      }],
    });

    if (resp.status === 402) {
      return { text: `[AI credits exhausted — PDF cannot be processed. File: ${fileName}]`, method: "pdf_credits_exhausted" };
    }
    if (resp.status === 429) {
      return { text: `[Rate limited — PDF processing delayed. File: ${fileName}]`, method: "pdf_rate_limited" };
    }
    if (!resp.ok) {
      // Fallback to TextDecoder for non-AI errors
      return extractPdfTextDecoder(buffer, fileName);
    }

    const result = await resp.json();
    const content = result.choices?.[0]?.message?.content || "";
    if (content && content.length > 50) {
      return { text: content.substring(0, 50000), method: "pdf_ai_vision" };
    }
    // AI returned empty — fallback
    return extractPdfTextDecoder(buffer, fileName);
  } catch {
    return extractPdfTextDecoder(buffer, fileName);
  }
}

/** Legacy TextDecoder fallback for PDFs when AI vision unavailable */
function extractPdfTextDecoder(buffer: ArrayBuffer, fileName: string): { text: string; method: string } {
  const rawText = new TextDecoder().decode(new Uint8Array(buffer));
  const cleaned = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim().substring(0, 50000);
  const printableRatio = cleaned.replace(/\s/g, '').length / Math.max(cleaned.length, 1);
  if (printableRatio < 0.2 || cleaned.length < 50) {
    return { text: `[PDF content could not be extracted. File: ${fileName || 'unnamed'}.]`, method: "pdf_binary_fallback" };
  }
  return { text: cleaned, method: "pdf_text_legacy" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = crypto.randomUUID().substring(0, 8);

  try {
    const { attachment_id } = await req.json();
    if (!attachment_id || typeof attachment_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "attachment_id is required", correlationId } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[${correlationId}] extract-attachment-text START for ${attachment_id}`);

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
          // URL PDF — re-fetch as binary and use AI vision
          if (LOVABLE_API_KEY) {
            try {
              const pdfResp = await fetch(att.source_url, {
                headers: { "User-Agent": "CogniBlend-Curator/1.0" },
                redirect: "follow",
                signal: AbortSignal.timeout(20000),
              });
              const pdfBuffer = await pdfResp.arrayBuffer();
              const result = await extractPdfViaVision(pdfBuffer, LOVABLE_API_KEY, att.file_name || att.source_url);
              extractedText = result.text;
              method = result.method;
            } catch {
              extractedText = [
                meta.ogTitle ? `Title: ${meta.ogTitle}` : "",
                `URL: ${att.source_url}`,
                `Note: PDF URL — download failed`,
              ].filter(Boolean).join("\n");
              method = "url_pdf_failed";
            }
          } else {
            // No API key — TextDecoder fallback for URL PDFs
            try {
              const pdfResp = await fetch(att.source_url, {
                headers: { "User-Agent": "CogniBlend-Curator/1.0" },
                redirect: "follow",
                signal: AbortSignal.timeout(20000),
              });
              const pdfBuffer = await pdfResp.arrayBuffer();
              const result = extractPdfTextDecoder(pdfBuffer, att.file_name || "url_pdf");
              extractedText = result.text;
              method = result.method;
            } catch {
              extractedText = [
                meta.ogTitle ? `Title: ${meta.ogTitle}` : "",
                `URL: ${att.source_url}`,
                `Note: PDF URL — download failed`,
              ].filter(Boolean).join("\n");
              method = "url_pdf_failed";
            }
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
        // V2: Use AI vision for PDFs
        if (LOVABLE_API_KEY) {
          const result = await extractPdfViaVision(buffer, LOVABLE_API_KEY, att.file_name || "document.pdf");
          extractedText = result.text;
          method = result.method;
        } else {
          const result = extractPdfTextDecoder(buffer, att.file_name || "document.pdf");
          extractedText = result.text;
          method = result.method;
        }
      } else if (att.mime_type?.includes("spreadsheet") || att.mime_type?.includes("excel") || att.mime_type?.includes("csv")) {
        if (att.mime_type?.includes("csv") || att.file_name?.endsWith('.csv')) {
          extractedText = new TextDecoder().decode(new Uint8Array(buffer)).substring(0, 50000);
          method = "csv_text";
        } else {
          // V2: Parse XLSX ZIP structure
          const xlsxText = await extractXlsxText(buffer);
          if (xlsxText && xlsxText.length > 20) {
            extractedText = xlsxText;
            method = "xlsx_xml_parsed";
          } else {
            extractedText = `[Excel file could not be extracted. File: ${att.file_name || 'unnamed'}.]`;
            method = "xlsx_binary_fallback";
          }
        }
      } else if (att.mime_type?.includes("wordprocessing") || att.mime_type?.includes("document") || att.mime_type === "text/plain") {
        if (att.mime_type === "text/plain") {
          extractedText = new TextDecoder().decode(new Uint8Array(buffer)).substring(0, 50000);
          method = "plain_text";
        } else {
          // V2: Parse DOCX ZIP structure
          const docxText = await extractDocxText(buffer);
          if (docxText && docxText.length > 20) {
            extractedText = docxText;
            method = "docx_xml_parsed";
          } else {
            extractedText = `[Word document could not be extracted. File: ${att.file_name || 'unnamed'}.]`;
            method = "docx_binary_fallback";
          }
        }
      } else if (att.mime_type?.startsWith("image/")) {
        if (!LOVABLE_API_KEY) {
          extractedText = "[Image description unavailable — no API key configured]";
          method = "image_skipped";
        } else {
          try {
            const base64 = arrayBufferToBase64(buffer);
            const resp = await callAIWithFallback(LOVABLE_API_KEY, {
              max_tokens: 2000,
              messages: [{
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${att.mime_type};base64,${base64}` } },
                  { type: "text", text: "Describe this image in detail. Extract any text, data tables, diagrams, or process flows visible." },
                ],
              }],
            });
            if (resp.status === 402) {
              extractedText = "[AI credits exhausted — image cannot be processed]";
              method = "image_credits_exhausted";
            } else if (resp.status === 429) {
              extractedText = "[Rate limited — image processing delayed]";
              method = "image_rate_limited";
            } else {
              const result = await resp.json();
              extractedText = result.choices?.[0]?.message?.content || "[Image description failed]";
              method = "image_description";
            }
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

    // Determine extraction quality
    const isPlaceholder = PLACEHOLDER_METHODS.has(method) || extractedText.startsWith('[');
    const isCreditError = method.includes("credits_exhausted") || method.includes("rate_limited");
    const extractionStatus = isCreditError ? "failed" : (isPlaceholder ? "partial" : "completed");

    // P4 FIX: Compute extraction_quality tier for digest quality gates
    let extractionQuality = "low";
    if (!isPlaceholder && !isCreditError) {
      const textLen = extractedText.length;
      if (textLen >= 2000) extractionQuality = "high";
      else if (textLen >= 500) extractionQuality = "medium";
      else if (textLen >= 100) extractionQuality = "low";
      else extractionQuality = "seed";
    } else if (isCreditError) {
      extractionQuality = "failed";
    } else {
      extractionQuality = "seed";
    }

    // Save extracted text
    const updatePayload: Record<string, unknown> = {
      extracted_text: extractedText.substring(0, 100000),
      extraction_method: method,
      extraction_status: extractionStatus,
      extraction_quality: extractionQuality,
      updated_at: new Date().toISOString(),
    };

    // Set specific extraction error for credit/rate issues
    if (isCreditError) {
      updatePayload.extraction_error = method.includes("credits_exhausted")
        ? "AI_CREDITS_EXHAUSTED"
        : "AI_RATE_LIMITED";
    }

    // ── TIER 2: Always run AI Summarization (skip if credits exhausted) ──
    if (LOVABLE_API_KEY && !isCreditError) {
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

        const aiConfig = await getAIModelConfig();
        const tier2Resp = await callAIWithFallback(LOVABLE_API_KEY, {
          max_tokens: 1500,
          temperature: 0.1,
          messages: [{ role: "user", content: tier2Prompt }],
        }, aiConfig.fallbackModel);

        if (tier2Resp.status === 402) {
          updatePayload.extraction_error = "AI_CREDITS_EXHAUSTED";
          console.warn("Tier 2 summarization skipped — AI credits exhausted");
        } else if (tier2Resp.status === 429) {
          updatePayload.extraction_error = "AI_RATE_LIMITED";
          console.warn("Tier 2 summarization skipped — rate limited");
        } else if (tier2Resp.ok) {
          const tier2Result = await tier2Resp.json();
          const tier2Content = tier2Result.choices?.[0]?.message?.content || "";
          const { summary, keyData } = parseSummaryAndKeyData(tier2Content);
          if (summary) updatePayload.extracted_summary = summary;
          if (keyData) updatePayload.extracted_key_data = keyData;
        }
      } catch (tier2Err: unknown) {
        console.error("Tier 2 summarization failed (non-blocking):", tier2Err);
      }
    }

    // Fallback summary from extracted text when AI parsing fails
    if (!updatePayload.extracted_summary && extractedText.length >= 100 && !isPlaceholder) {
      const cleanText = extractedText.replace(/\s+/g, ' ').trim();
      updatePayload.extracted_summary = cleanText.substring(0, 300) + (cleanText.length > 300 ? '...' : '');
    }

    await adminClient.from("challenge_attachments").update(updatePayload).eq("id", attachment_id);

    // Return specific error codes so frontend can show targeted messages
    const responseData: Record<string, unknown> = {
      method, length: extractedText.length,
      hasSummary: !!updatePayload.extracted_summary,
      extraction_status: extractionStatus,
    };
    if (isCreditError) {
      responseData.error_code = method.includes("credits_exhausted") ? "AI_CREDITS_EXHAUSTED" : "AI_RATE_LIMITED";
    }

    console.log(`[${correlationId}] extract-attachment-text DONE: method=${method}, quality=${extractionQuality}, length=${extractedText.length}`);

    return new Response(
      JSON.stringify({ success: true, data: { ...responseData, correlationId } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${correlationId}] extract-attachment-text error:`, err);

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
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: errMsg, correlationId } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
